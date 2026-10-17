import * as THREE from "three";
import { AVENUES, CROSS_STREETS, CITY_STOPS, CITY_SITES } from "./city-layout";
import type { Collider } from "./world";
import { loadRiggedHuman, type LoadedHuman, type HumanKind } from "./human-assets";

/** Lightweight, fully connected outdoor city; one batched draw per material. */
export function buildCity(scene: THREE.Scene, streetColliders: Collider[]) {
  const owned: Array<{dispose: () => void}> = [];
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  owned.push(boxGeo);
  type Batch = { add: (x:number,y:number,z:number,sx:number,sy:number,sz:number) => void; finish:()=>void; mesh: THREE.InstancedMesh };
  function batch(material: THREE.Material, limit: number): Batch {
    const mesh = new THREE.InstancedMesh(boxGeo, material, limit);
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = false;
    const obj = new THREE.Object3D();
    let count=0;
    return {
      mesh,
      add(x,y,z,sx,sy,sz) {
        if(count >= limit) throw Error("City geometry batch overflow: "+limit);
        obj.position.set(x,y,z);
        obj.scale.set(Math.max(0.001,sx),Math.max(0.001,sy),Math.max(0.001,sz));
        obj.updateMatrix();
        mesh.setMatrixAt(count++,obj.matrix);
      },
      finish(){mesh.count=count;mesh.visible=count>0;mesh.instanceMatrix.needsUpdate=true;scene.add(mesh);}
    };
  }
  const palette=[0xc5ae97,0x8b6258,0xb1bdc6,0xd7d0bd,0x6d7d90,0xb9987e,0x8da3aa,0x665f65];
  const walls=palette.map(c=>new THREE.MeshLambertMaterial({color:c}));
  const dark=new THREE.MeshLambertMaterial({color:0x252b36});
  const glass=new THREE.MeshStandardMaterial({color:0x688ba0,roughness:0.22,metalness:0.3,emissive:0xffd29b,emissiveIntensity:0});
  const concrete=new THREE.MeshLambertMaterial({color:0xbcb6ad});
  const lanePaint=new THREE.MeshBasicMaterial({color:0xe5dab3});
  const metal=new THREE.MeshLambertMaterial({color:0x535d69});
  const leaf=new THREE.MeshLambertMaterial({color:0x52775b});
  const wood=new THREE.MeshLambertMaterial({color:0x745947});
  const park=new THREE.MeshLambertMaterial({color:0x66885d});
  const roofMat=new THREE.MeshLambertMaterial({color:0x373f4b});
  const roadMat=new THREE.MeshLambertMaterial({color:0x4b5059});
  const trafficColors=[0xc16d53,0xe1d9c4,0x4e8791,0x354156,0xc09b58].map(color=>new THREE.MeshLambertMaterial({color}));
  const mats=[...walls,dark,glass,concrete,lanePaint,metal,leaf,wood,park,roofMat,roadMat,...trafficColors];
  owned.push(...mats);
  const mass=walls.map(mat=>batch(mat,130));
  const windows=batch(glass,8500);
  const trims=batch(dark,300);
  const details=batch(concrete,310);
  const stripes=batch(lanePaint,900);
  const metalBits=batch(metal,400);
  const leaves=batch(leaf,110);
  const trunks=batch(wood,110);
  const roofs=batch(roofMat,180);
  const parkGround=batch(park,25);
  const panels=batch(glass,190);
  const all=[...mass,windows,trims,details,stripes,metalBits,leaves,trunks,roofs,parkGround,panels];

  const addPlane=(x:number,z:number,sx:number,sz:number,material:THREE.Material,y=0.012)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(sx,sz),material);
    mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);owned.push(mesh.geometry);
    return mesh;
  };
  addPlane(113,-80,166,160,park,0.001); // grass between streets, overlays original outskirts
  // New eastern extension of the original harbor boulevard.
  addPlane(114,0,160,8,roadMat,0.021);
  for (const x of AVENUES) addPlane(x,-76,8,153,roadMat,0.022);
  for (const z of CROSS_STREETS.slice(1)) addPlane(116,z,154,8,roadMat,0.023);
  // Raised sidewalks surround blocks while not blocking crossing intersections.
  const cols=[[61,89],[101,129],[141,169]];
  const rows=[[-36,-8],[-78,-50],[-120,-92]];
  for(let row=0;row<3;row++) for(let col=0;col<3;col++){
    const [x0,x1]=cols[col], [z0,z1]=rows[row];
    details.add((x0+x1)/2,0.09,(z0+z1)/2,x1-x0,0.18,z1-z0);
  }
  // Lane striping at fixed intervals. Pedestrian crossings are on the walkable road plane.
  for(let x=44;x<190;x+=7) stripes.add(x,0.041,0,3,0.014,0.13);
  for(const z of CROSS_STREETS.slice(1)){
    for(let x=46;x<191;x+=8) stripes.add(x,0.042,z,3.1,0.012,0.14);
  }
  for(const x of AVENUES){
    for(let z=-148;z<-8;z+=8) stripes.add(x,0.043,z,0.14,0.014,3.2);
    for(const z of CROSS_STREETS){
      for(let k=-3;k<=3;k++) {
        stripes.add(x+k*0.8,0.048,z+5.0,0.43,0.012,1.3);
        stripes.add(x+k*0.8,0.048,z-5.0,0.43,0.012,1.3);
      }
    }
  }

  function bld(x:number,z:number,sx:number,sz:number,h:number,col:number,kind:number){
    mass[col%mass.length].add(x,h/2,z,sx,h,sz);
    roofs.add(x,h+0.15,z,sx+0.25,0.3,sz+0.25);
    streetColliders.push({minX:x-sx/2,maxX:x+sx/2,minZ:z-sz/2,maxZ:z+sz/2});
    // Distinct storefronts, vertical high-rise window rhythm and facade cornices.
    const floors=Math.max(1,Math.floor(h/3.1));
    const countX=Math.max(2,Math.floor((sx-1.1)/2.05));
    const countZ=Math.max(2,Math.floor((sz-1.1)/2.05));
    for(let f=0;f<floors;f++){
      const wy=1.7+f*3.1;
      if(wy+0.6>h) continue;
      for(let i=0;i<countX;i++){
        const wx=x-sx/2+(i+0.5)*sx/countX;
        windows.add(wx,wy,z+sz/2+0.027,0.91,1.18,0.075);
        windows.add(wx,wy,z-sz/2-0.027,0.91,1.18,0.075);
      }
      for(let i=0;i<countZ;i++){
        const wz=z-sz/2+(i+0.5)*sz/countZ;
        windows.add(x-sx/2-0.027,wy,wz,0.075,1.18,0.91);
        windows.add(x+sx/2+0.027,wy,wz,0.075,1.18,0.91);
      }
      if(kind===2 && f%3===0) trims.add(x,wy+1.08,z+sz/2+0.07,sx+0.25,0.1,0.15);
    }
    // Glass lobby with a visible entrance, roof mechanicals and varied silhouettes.
    panels.add(x,1.05,z+sz/2+0.08,Math.min(4.2,sx/2),2.02,0.12);
    if(kind===2) {
      metalBits.add(x-1,h+0.62,z-1,1.7,0.8,1.5);
      metalBits.add(x+1.5,h+1.2,z+1,0.08,1.8,0.08);
    }
    if(kind===1) {
      trims.add(x,h-0.9,z+sz/2+0.06,sx+0.15,0.28,0.12);
      trims.add(x,h-0.9,z-sz/2-0.06,sx+0.15,0.28,0.12);
    }
  }

  // Nine independently styled city blocks, with deliberate park/plaza voids.
  for(let row=0;row<3;row++) for(let col=0;col<3;col++) {
    const [x0,x1]=cols[col], [z0,z1]=rows[row];
    const xc=(x0+x1)/2, zc=(z0+z1)/2;
    const id=row*3+col;
    if(id===0) { // City hall and old town square
      parkGround.add(xc,0.2,z0+7,22,0.16,9);
      bld(xc,z1-7,17,9,11,3,1);
      details.add(xc,0.35,z1-1.7,10,0.55,3.2);
      metalBits.add(xc,15.6,z1-7,1,9,1); // clock tower
      panels.add(xc,16.0,z1-6.45,1.05,1.05,0.1);
    } else if(id===2) { // Gateway station block
      bld(xc-7,zc-5,10,15,18,4,1);
      bld(xc+7,zc+5,10,15,13,6,1);
      metalBits.add(xc,5,zc,2.1,10,12); // station canopy spine
      details.add(xc,3.7,zc,15,0.3,12);
    } else if(id===7) { // Civic green and hospital block
      parkGround.add(xc,0.2,zc,24,0.18,22);
      bld(xc-7,zc-6,9,12,22,6,2);
      details.add(xc+5,0.45,zc+5,4,0.8,4);
    } else if(id===8) { // Gallery and theater
      bld(xc-6,zc+4,12,13,18,2,1);
      bld(xc+7,zc-4,11,12,14,5,1);
      details.add(xc,0.29,zc+1,4,0.4,9);
    } else {
      const high=(row===1 && col>=1);
      const quadrants=[
        [-7,-7], [7,-7], [-7,7], [7,7]
      ];
      quadrants.forEach(([dx,dz],k)=>{
        const tall=high ? 28+(k*7+row*5+col*9)%34 : 10+(id*3+k*7)%21;
        const h=col===2&&row===2?Math.min(tall,21):tall;
        bld(xc+dx,zc+dz,11.2,11.1,h,(id*3+k)%palette.length,h>=28?2:1);
      });
    }
  }

  // City trees and curb furniture. Trunks are solid obstacles, crowns do not occlude the pavement.
  const treePts: Array<[number,number]>=[];
  for(const x of [48,62,89,102,128,142,169,182]){
    for(const z of [-15,-32,-58,-73,-100,-115,-137]){
      if((x+z*3)%5===0 || (x===102&&z===-100)) continue;
      treePts.push([x+(z%2)*0.6,z]);
    }
  }
  for(const [x,z] of treePts) {
    trunks.add(x,1.2,z,0.3,2.4,0.3);
    leaves.add(x,2.8,z,2.5,2.5,2.5);
    leaves.add(x+0.4,3.5,z,2.0,1.75,2);
    streetColliders.push({minX:x-0.22,maxX:x+0.22,minZ:z-0.22,maxZ:z+0.22});
  }

  // Street lights have emissive fixtures but no per-lamp shadow/light cost.
  const bulbMat=new THREE.MeshBasicMaterial({color:0xffe9b3});
  owned.push(bulbMat);
  const lampBulbs=batch(bulbMat,90);
  for(const x of [52,92,132,172]) for(const z of [-14,-60,-104,-145]){
    metalBits.add(x,2.5,z,0.13,5,0.13);
    metalBits.add(x+0.65,5.0,z,1.4,0.14,0.14);
    lampBulbs.add(x+1.3,4.93,z,0.48,0.2,0.44);
  }
  all.push(lampBulbs);

  // Distinctive landmark labels. Large readable names use a small number of sign meshes.
  function sign(label:string,x:number,y:number,z:number,width=7) {
    const cv=document.createElement("canvas");cv.width=768;cv.height=144;
    const ctx=cv.getContext("2d");if(!ctx)return;
    ctx.fillStyle="#202b37";ctx.fillRect(0,0,768,144);
    ctx.strokeStyle="#dcaf68";ctx.lineWidth=10;ctx.strokeRect(5,5,758,134);
    ctx.fillStyle="#f8e7c8";ctx.font="bold 54px system-ui,sans-serif";
    ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText(label,384,76,722);
    const tex=new THREE.CanvasTexture(cv);tex.colorSpace=THREE.SRGBColorSpace;
    const mat=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide});
    const geom=new THREE.PlaneGeometry(width,1.32);
    const mesh=new THREE.Mesh(geom,mat);mesh.position.set(x,y,z);scene.add(mesh);
    owned.push(tex,mat,geom);
  }
  sign("OLD TOWN",70,4.0,-7.35,8);
  sign("PUBLIC LIBRARY",111,4.6,-7.9,8);
  sign("DOWNTOWN",126,15,-48.4,10);
  sign("CENTRAL STATION",157,5,-121,10);
  sign("CITY GALLERY",152,5,-90,7);

  // Visual transit platforms at validated curb coordinates. Actual transit is in the game/phone.
  for(const stop of CITY_STOPS){
    details.add(stop.x,0.28,stop.z,1.9,0.19,1.8);
    metalBits.add(stop.x+2.1,1.5,stop.z-0.5,0.1,3,0.1);
    panels.add(stop.x+2.1,2.45,stop.z-0.5,0.82,0.85,0.1);
  }
  for(const site of CITY_SITES){
    details.add(site.x,0.27,site.z,0.9,0.22,0.9);
    metalBits.add(site.x,1.1,site.z,0.12,1.65,0.12);
  }

  // 3-part traffic instances. Cars travel on the actual road centerlines; no vehicle collider.
  const carGeo=boxGeo;
  const trafficBody=trafficColors.map(mat=>new THREE.InstancedMesh(carGeo,mat,12));
  const cabinTraffic=new THREE.InstancedMesh(carGeo,glass,12);
  for(const mesh of [...trafficBody,cabinTraffic]) {
    mesh.frustumCulled=false;mesh.castShadow=false;scene.add(mesh);
  }
  const traffic=Array.from({length:10},(_,i)=>({
    lane:i%4, style:i%trafficColors.length,
    phase:(i*0.137)%1,
    speed:2.9+(i%3)*1.1,
  }));
  // Eight fully-rigged pedestrians share three distinct source models.
  // Keep this population deliberately small on mobile: never animate out-of-range walkers.
  type Pedestrian = { group: THREE.Group; rig: LoadedHuman };
  const cityPedestrians: Array<Pedestrian | null> = Array.from({length:8},()=>null);
  let released = false;
  const pedestrianKinds: HumanKind[] = ["pedestrian-a","pedestrian-b","pedestrian-c"];
  cityPedestrians.forEach((_,i)=>{
    const kind=pedestrianKinds[i%pedestrianKinds.length];
    void loadRiggedHuman(kind).then(rig=>{
      if(released){rig.mixer.stopAllAction();return;}
      rig.actions.idle.stop();
      rig.actions.walk.reset().play();
      rig.actions.walk.setEffectiveTimeScale(0.75+(i%3)*0.15);
      const group=new THREE.Group();
      group.add(rig.root);
      group.visible=false;
      scene.add(group);
      cityPedestrians[i]={group,rig};
    }).catch(error=>console.warn("Ambient human unavailable:",kind,error));
  });
  const dummy=new THREE.Object3D();
  function setInstance(mesh:THREE.InstancedMesh,i:number,x:number,y:number,z:number,sx:number,sy:number,sz:number,rot=0){
    dummy.position.set(x,y,z);dummy.rotation.set(0,rot,0);dummy.scale.set(sx,sy,sz);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);
  }
  for(const b of all)b.finish();

  return {
    update(dt:number, elapsed:number, night:number, focus:THREE.Vector3, outdoor:boolean) {
      glass.emissiveIntensity=night*0.85;
      // Hide animated city life while the player is indoors; reduce unnecessary instance churn.
      for(const m of [...trafficBody,cabinTraffic])m.visible=outdoor;
      if(!outdoor) { for (const walker of cityPedestrians) if(walker) walker.group.visible=false; return; }
      const counters=trafficColors.map(()=>0);
      let cab=0;
      for(let i=0;i<traffic.length;i++){
        const car=traffic[i];
        const phase=(car.phase+elapsed*car.speed/255)%1;
        const track=car.lane%2===0;
        const xx=track ? 45+phase*143 : AVENUES[(car.lane+1)%AVENUES.length]+(i%2?1.6:-1.6);
        const zz=track ? (car.lane===0?-42:-84)+(i%2?1.6:-1.6) : -143+phase*143;
        const near=Math.hypot(xx-focus.x,zz-focus.z)<100;
        if(!near)continue;
        const rot=track?Math.PI/2:0;
        const style=car.style;
        const idx=counters[style]++;
        setInstance(trafficBody[style],idx,xx,0.58,zz,1.6,0.46,3.3,rot);
        setInstance(cabinTraffic,cab++,xx,0.98,zz,1.28,0.42,1.6,rot);
      }
      trafficBody.forEach((m,i)=>{m.count=counters[i];m.instanceMatrix.needsUpdate=true;});
      cabinTraffic.count=cab;cabinTraffic.instanceMatrix.needsUpdate=true;
      for (let i=0;i<cityPedestrians.length;i++) {
        const walker=cityPedestrians[i];
        if(!walker)continue;
        const col=Math.floor(i/2)%4;
        const x=AVENUES[col]+(i%2===0 ? -7:7);
        const z=-133+((i*31+elapsed*(0.65+(i%3)*0.22))%129);
        const near=Math.hypot(x-focus.x,z-focus.z)<55;
        walker.group.visible=near;
        if(!near)continue;
        walker.group.position.set(x,0,z);
        walker.group.rotation.y=i%2 ? 0 : Math.PI;
        walker.rig.mixer.update(dt);
      }
      void dt;
    },
    dispose() {
      for(const b of all)b.mesh.dispose();
      released=true;
      for(const walker of cityPedestrians) if(walker){walker.rig.mixer.stopAllAction();scene.remove(walker.group);}
      for(const m of [...trafficBody,cabinTraffic])m.dispose();
      owned.forEach(v=>v.dispose());
    }
  };
}