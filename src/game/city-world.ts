import * as THREE from "three";
import { installStreetTrees, type StreetTree } from "./realistic-vegetation";
import { buildShopfronts, type Shopfront } from "./shopfronts";
import { AVENUES, CROSS_STREETS, CITY_STOPS, CITY_SITES } from "./city-layout";
import type { Collider } from "./world";
import { loadRiggedHuman, type LoadedHuman, type HumanKind } from "./human-assets";
import { applyRealisticSurface, placeRealisticProp, createRealisticTraffic } from "./environment-assets";

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
  const walls=palette.map(c=>new THREE.MeshStandardMaterial({color:c,roughness:0.9}));
  const dark=new THREE.MeshLambertMaterial({color:0x252b36});
  const glass=new THREE.MeshStandardMaterial({color:0x688ba0,roughness:0.22,metalness:0.3,emissive:0xffd29b,emissiveIntensity:0});
  const concrete=new THREE.MeshStandardMaterial({color:0xbcb6ad});
  const lanePaint=new THREE.MeshBasicMaterial({color:0xe5dab3});
  const metal=new THREE.MeshLambertMaterial({color:0x535d69});
  const leaf=new THREE.MeshLambertMaterial({color:0x52775b});
  const wood=new THREE.MeshLambertMaterial({color:0x745947});
  const park=new THREE.MeshStandardMaterial({color:0x66885d});
  const roofMat=new THREE.MeshLambertMaterial({color:0x373f4b});
  const roadMat=new THREE.MeshStandardMaterial({color:0x4b5059});
  const trafficColors=[0xc16d53,0xe1d9c4,0x4e8791,0x354156,0xc09b58].map(color=>new THREE.MeshLambertMaterial({color}));
  const pbrDisposers = [
    applyRealisticSurface(roadMat,"aerial_asphalt_01",9,9),
    applyRealisticSurface(concrete,"concrete_floor_02",7,7),
    applyRealisticSurface(park,"grass_path_2",10,10),
    applyRealisticSurface(walls[0],"red_brick_03",4,3,{tint:0xd7c2ae}),
    applyRealisticSurface(walls[2],"concrete_floor_02",4,5,{tint:0xcbd7da}),
    applyRealisticSurface(walls[4],"concrete_floor_02",4,5,{tint:0xa9c1d7}),
    applyRealisticSurface(walls[5],"red_brick_03",4,4,{tint:0xe1c7ad}),
  ];
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
  const facadeBuildings: Array<{x:number;z:number;sx:number;sz:number;h:number;kind:number}> = [];

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
    facadeBuildings.push({x,z,sx,sz,h,kind});
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
  // Offset street trees toward the curb, not into building facade geometry.
  // Original trunk positions cleared pedestrians but the ~2m crowns clipped
  // directly through some ground/upper-floor windows.
  const curbTreeX: Record<number,number> = {
    48:48, 62:60.3, 89:90.5, 102:100.3,
    128:130.5, 142:140.3, 169:170.5, 182:182,
  };
  for(const x of [48,62,89,102,128,142,169,182]){
    for(const z of [-15,-32,-58,-73,-100,-115,-137]){
      if((x+z*3)%5===0 || (x===102&&z===-100)) continue;
      treePts.push([curbTreeX[x]+(z%2)*0.6,z]);
    }
  }
  const isMobile = window.matchMedia("(pointer: coarse)").matches || new URLSearchParams(window.location.search).has("mobile-qa");
  const plantedPoints = isMobile ? treePts.filter((_, i) => i % 4 === 0) : treePts;
  const planted: StreetTree[] = [];
  for(const [x,z] of plantedPoints) {
    trunks.add(x,1.2,z,0.3,2.4,0.3);
    leaves.add(x,2.8,z,2.5,2.5,2.5);
    leaves.add(x+0.4,3.5,z,2.0,1.75,2);
    streetColliders.push({minX:x-0.22,maxX:x+0.22,minZ:z-0.22,maxZ:z+0.22});
    planted.push({ x, z, height: 5.5 + (planted.length % 5) * 0.28, species: (planted.length % 3) as 0 | 1 | 2 });
  }
  const realisticCityTrees = installStreetTrees(scene, planted, () => {
    trunks.mesh.visible = false;
    leaves.mesh.visible = false;
  });

  // Street lights have emissive fixtures but no per-lamp shadow/light cost.
  // Real street lamps are provided by the CC0 asset in cityProps below.
  // With permanent daytime lighting there is no need for glowing cube bulbs.

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
  sign("OLD TOWN",70,6.1,-10.32,8);
  sign("PUBLIC LIBRARY",108,4.6,-9.30,8);
  sign("DOWNTOWN",122,15,-51.30,10);
  sign("CENTRAL STATION",162,5,-116.20,10);
  sign("CITY GALLERY",149,5,-95.30,7);
  sign("CITY ROUTE BOARD",71,3.1,-10.35,5.5);

  // Six unmistakable walk-to storefronts. Buildings retain their original
  // footprints and collision boundaries: signage/glazing does not add obstacles.
  const awningColors = [0x8e4339,0x304f66,0x655078].map(color=>new THREE.MeshStandardMaterial({color,roughness:0.85}));
  owned.push(...awningColors);
  const storefrontAwnings = awningColors.map(mat=>batch(mat,12));
  const storefrontFrames = batch(dark,90);
  all.push(...storefrontAwnings,storefrontFrames);
  const storefronts: Array<Shopfront & {label:string}> = [
    {kind:"bakery",label:"OLD TOWN BAKERY",x:82,z:-51.42,width:4.8},
    {kind:"gym",label:"CIVIC FITNESS",x:122,z:-51.42,width:4.8},
    {kind:"cinema",label:"METRO CINEMA",x:148,z:-51.42,width:4.9},
    {kind:"laundry",label:"FRESH SPIN LAUNDRY",x:82,z:-93.42,width:4.9},
    {kind:"bookshop",label:"CORNER BOOKS",x:108,z:-105.88,width:4.7},
    {kind:"courier",label:"PARCEL DISPATCH",x:162,z:-103.88,width:4.9},
  ];
  const shopDisplays = buildShopfronts(scene,storefronts);
  storefronts.forEach((front,i)=>{
    const fasciaZ=front.z+0.15;
    const tint=i%awningColors.length;
    // Shade above a glazed retail facade and readable sign at pedestrian height.
    storefrontAwnings[tint].add(front.x,2.72,front.z+0.76,front.width+0.45,0.17,1.25);
    storefrontFrames.add(front.x,2.45,fasciaZ,front.width+0.2,0.12,0.22);
    storefrontFrames.add(front.x-front.width/2,1.3,fasciaZ,0.11,2.35,0.2);
    storefrontFrames.add(front.x+front.width/2,1.3,fasciaZ,0.11,2.35,0.2);
    storefrontFrames.add(front.x,1.3,fasciaZ,0.10,2.35,0.2);
    panels.add(front.x,1.36,front.z+0.11,front.width-0.25,2.12,0.14);
    sign(front.label,front.x,3.55,front.z+0.16,front.width+0.3);
  });

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

  // Only fetch optional detailed models while the player is outdoors and near
  // their block. Keeps the initial phone launch and unrelated interiors lean.
  let cityOutside=false, cityPlayerX=0, cityPlayerZ=0;
  const sidewalkHeight = (x:number,z:number) =>
    cols.some(([a,b])=>x>=a&&x<=b) && rows.some(([a,b])=>z>=a&&z<=b) ? 0.185 : 0.02;
  // Old and new street furniture shares the same sidewalk grounding.
  const placeStreetAsset: typeof placeRealisticProp = (target,kind,x,z,cfg={}) =>
    placeRealisticProp(target,kind,x,z,{...cfg,y:cfg.y??sidewalkHeight(x,z)});
  const placeNearCity: typeof placeRealisticProp = (target,kind,x,z,cfg={}) =>
    placeRealisticProp(target,kind,x,z,{
      ...cfg,y:cfg.y??sidewalkHeight(x,z),
      shouldLoad:()=>cityOutside && Math.hypot(x-cityPlayerX,z-cityPlayerZ)<54
    });
  const cityProps = [
    placeStreetAsset(scene,"painted_wooden_bench",66,-33,{height:0.8,yaw:Math.PI/2}),
    placeStreetAsset(scene,"painted_wooden_bench",110,-35.25,{height:0.8}),
    placeStreetAsset(scene,"painted_wooden_bench",145,-79.2,{height:0.8,yaw:Math.PI/2}),
    placeStreetAsset(scene,"metal_trash_can",46.5,-14,{height:1.03}),
    placeStreetAsset(scene,"metal_trash_can",102.7,-35.2,{height:1.03}),
    placeStreetAsset(scene,"metal_trash_can",140.4,-72,{height:1.03}),
    placeStreetAsset(scene,"metal_trash_can",182,-123.5,{height:1.03}),
    placeStreetAsset(scene,"bus-shelter",140.3,-78,{height:2.48,yaw:Math.PI/2}),
    placeStreetAsset(scene,"bus-shelter",182,-114,{height:2.48,yaw:Math.PI / 2}),
    ...(isMobile ? [] : [placeStreetAsset(scene,"bus-shelter",101.5,-32,{height:2.48,yaw:0})]),
    placeStreetAsset(scene,"information-board",140.5,-81,{height:2.05}),
    placeStreetAsset(scene,"wayfinding-totem",181,-119,{height:2.22}),
    placeStreetAsset(scene,"recycling-station",106,-35.25,{height:0.96}),
    placeStreetAsset(scene,"recycling-station",135,-80,{height:0.96}),
    ...[52,92,132,172].flatMap((x, i) =>
      [-14,-60,-104,-145].filter((_, j) => (i*4+j)%(isMobile?8:4)===0).map(z =>
        placeStreetAsset(scene,"street_lamp_01",x===52?49:x===132?129.4:x,z,{height:5.15})
      )
    ),
  ];

  // CC0 modular facade sections sit over selected procedural upper floors.
  // Building collision boxes, windows, sidewalks and existing shop doors stay unchanged.
  const selectedFacades = facadeBuildings
    .filter((b,i)=>b.h>=19 && i%3===1).slice(0,isMobile?6:10);
  selectedFacades.forEach((b,index)=>{
    const industrial = index%3===2;
    const windowKind = industrial ? "factory-window" : "urban-window";
    const wallKind = industrial ? "factory-wall" : "urban-wall";
    const corniceKind = industrial ? "factory-cornice" : "urban-cornice";
    const front = b.z+b.sz/2+0.12;
    // Preserve all interactive storefront entrances and their real-life use prompts.
    // On non-interactive buildings, continue the detailed facade to street level
    // instead of leaving a visually mismatched flat ground-floor frontage.
    const interactiveFront = CITY_SITES.some(site=>Math.hypot(site.x-b.x,site.z-front)<8);
    const floorBands = isMobile
      ? (interactiveFront ? [1] : [0,1])
      : (interactiveFront ? [1,2] : [0,1,2]);
    for(const floor of floorBands) {
      const y=floor*3.1;
      if(y+3.1>b.h-0.3)continue;
      for(const [col,kind] of [[-1,windowKind],[0,wallKind],[1,windowKind]] as const) {
        // The real service door and roller shutter replace these two bays;
        // stacking multiple opaque facades here produced z-fighting.
        if(floor===0 && Math.abs(b.x-68)<0.3 && Math.abs(front+107.33)<0.3 && col!==1)continue;
        cityProps.push(placeNearCity(scene,kind,b.x+col*3.0,front,{y,height:3.05}));
      }
    }
    for(const col of [-1,0,1]){
      cityProps.push(placeNearCity(scene,corniceKind,b.x+col*3.0,front+0.06,{y:b.h-0.38,length:Math.min(3.1,b.sx/3)}));
    }
  });

  // Service elevations get realistic closed garage/roller doors;
  // keep active businesses accessible through their original triggers.
  cityProps.push(
    placeNearCity(scene,"factory-door",68,-107.35,{height:2.85}),
    placeNearCity(scene,"real-shutter",63.5,-107.35,{height:2.48}),
    placeNearCity(scene,"urban-door",149,-95.35,{height:2.62}),
    placeNearCity(scene,"bike-rack",118,-35.3,{height:0.86}),
    placeNearCity(scene,"bike-rack",164,-118.5,{height:0.86}),
    placeNearCity(scene,"bike-rack",63.8,-32.4,{height:0.86}),
    placeNearCity(scene,"real-trashbag",169,-118.8,{height:0.48}),
    placeNearCity(scene,"real-trashbag",59,-32.7,{height:0.52}),
    placeNearCity(scene,"real-coffee-cart",85.5,-8.7,{height:1.85,yaw:Math.PI}),
    placeNearCity(scene,"real-chalkboard",87.6,-9.0,{height:1.25,yaw:-0.24}),
    placeNearCity(scene,"real-aircon",122,-57,{height:1.15,y:29.4}),
    placeNearCity(scene,"real-aircon",148,-57,{height:1.12,y:31.4}),
    placeNearCity(scene,"real-chainlink",60,-115.8,{height:2.0}),
    placeNearCity(scene,"city-bus",178,-132.2,{length:8.7,yaw:0}),
  );
  streetColliders.push(
    {minX:117.05,maxX:118.95,minZ:-35.75,maxZ:-34.85}, // bike rack near gym
    {minX:163.05,maxX:164.95,minZ:-118.95,maxZ:-118.05}, // bike rack by station
    {minX:62.85,maxX:64.75,minZ:-32.85,maxZ:-31.95}, // bike rack near park
    {minX:84.25,maxX:86.75,minZ:-9.4,maxZ:-8.0}, // food cart
    {minX:87.12,maxX:88.08,minZ:-9.5,maxZ:-8.5}, // menu board
    {minX:139.3,maxX:141.3,minZ:-80.1,maxZ:-75.9}, // historic bus shelter
    {minX:109.45,maxX:110.55,minZ:-35.5,maxZ:-35.0}, // older bench
    {minX:105.3,maxX:106.7,minZ:-35.5,maxZ:-35.0}, // recycling station
    {minX:45.4,maxX:47.6,minZ:-14.35,maxZ:-13.65}, // older city trash cans
    {minX:101.6,maxX:103.8,minZ:-35.55,maxZ:-34.85}, // Civic trash cans
    {minX:139.3,maxX:141.5,minZ:-72.35,maxZ:-71.65}, // Downtown trash cans
    {minX:180.9,maxX:183.1,minZ:-123.85,maxZ:-123.15}, // Station trash cans
    {minX:181.05,maxX:182.95,minZ:-116.05,maxZ:-111.95}, // second bus shelter
    {minX:65.75,maxX:66.25,minZ:-33.6,maxZ:-32.4}, // Old Town bench
    {minX:144.75,maxX:145.25,minZ:-79.8,maxZ:-78.6}, // Downtown bench
    {minX:139.75,maxX:141.25,minZ:-81.25,maxZ:-80.75}, // information board
    {minX:180.5,maxX:181.5,minZ:-119.3,maxZ:-118.7}, // wayfinding pole
    {minX:134.3,maxX:135.7,minZ:-80.4,maxZ:-79.6}, // recycling station
    {minX:48.45,maxX:49.55,minZ:-14.35,maxZ:-13.65}, // west roadside lamp
    {minX:129.0,maxX:129.9,minZ:-14.35,maxZ:-13.65}, // east roadside lamp
    // Parked bus and gated service fencing should not be walk-through geometry.
    {minX:176.8,maxX:179.2,minZ:-136.6,maxZ:-127.8},
    {minX:59,maxX:61,minZ:-116.02,maxZ:-115.58},
  );

  // CC0 vehicle meshes replace the placeholder boxes after loading, without changing paths/collision.
  type RealTraffic = Awaited<ReturnType<typeof createRealisticTraffic>>;
  const mobileAssetBudget = window.matchMedia("(pointer: coarse)").matches || new URLSearchParams(window.location.search).has("mobile-qa");
  const detailedCarCount = mobileAssetBudget ? 4 : 8;
  let realTraffic: RealTraffic | null = null;
  let releasedTraffic=false;
  // Wait for the first scene frame before parsing and cloning vehicle assets.
  const trafficTimer = window.setTimeout(()=>{
    void createRealisticTraffic(scene,detailedCarCount).then(result=>{
      if(releasedTraffic){result.dispose();return;}
      realTraffic=result;
    }).catch(error=>console.warn("Real traffic fallback",error));
  },1600);

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
      cityOutside=outdoor;
      cityPlayerX=focus.x; cityPlayerZ=focus.z;
      glass.emissiveIntensity=night*0.85;
      realisticCityTrees.setVisible(outdoor);
      // Hide animated city life while the player is indoors; reduce unnecessary instance churn.
      const legacyCars = outdoor && !realTraffic;
      for(const m of [...trafficBody,cabinTraffic])m.visible=legacyCars;
      if(realTraffic)for(const car of realTraffic.cars)car.visible=false;
      if(!outdoor) { for (const walker of cityPedestrians) if(walker) walker.group.visible=false; return; }
      const counters=trafficColors.map(()=>0);
      let cab=0;
      for(let i=0;i<traffic.length;i++){
        if(realTraffic && i>=detailedCarCount) continue;
        const car=traffic[i];
        const phase=(car.phase+elapsed*car.speed/255)%1;
        const track=car.lane%2===0;
        const xx=track ? 45+phase*143 : AVENUES[(car.lane+1)%AVENUES.length]+(i%2?1.6:-1.6);
        const zz=track ? (car.lane===0?-42:-84)+(i%2?1.6:-1.6) : -143+phase*143;
        const near=Math.hypot(xx-focus.x,zz-focus.z)<100;
        if(!near)continue;
        const rot=track?Math.PI/2:0;
        if(realTraffic) {
          const view=realTraffic.cars[i];
          view.visible=true;
          view.position.set(xx,0,zz);
          view.rotation.y=rot;
          continue;
        }
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
      releasedTraffic=true;
      shopDisplays.dispose();
      realisticCityTrees.dispose();
      window.clearTimeout(trafficTimer);
      realTraffic?.dispose();
      pbrDisposers.forEach(dispose=>dispose());
      cityProps.forEach(dispose=>dispose());
      for(const b of all)b.mesh.dispose();
      released=true;
      for(const walker of cityPedestrians) if(walker){walker.rig.mixer.stopAllAction();scene.remove(walker.group);}
      for(const m of [...trafficBody,cabinTraffic])m.dispose();
      owned.forEach(v=>v.dispose());
    }
  };
}