import * as THREE from "three";

export type ShopKind = "bakery" | "gym" | "cinema" | "laundry" | "bookshop" | "courier";
export type Shopfront = { kind: ShopKind; x: number; z: number; width: number };
/**
 * Light-weight street-window vignettes. These are visibly CLOSED display windows,
 * not misleading enterable interior portals; walk-up interactions remain outdoors.
 * Six small canvas textures are far cheaper than six separately lit 3D interiors.
 */
function displayTexture(kind: ShopKind) {
  const canvas=document.createElement("canvas");canvas.width=512;canvas.height=256;
  const g=canvas.getContext("2d");
  if(!g)throw Error("Shopfront canvas unavailable");
  const bg=g.createLinearGradient(0,0,0,256);
  bg.addColorStop(0,"#121c24");bg.addColorStop(.6,"#283643");bg.addColorStop(1,"#131c25");
  g.fillStyle=bg;g.fillRect(0,0,512,256);
  // Interior depth: upper cabinets, back walls and small ceiling downlights.
  g.fillStyle="#202a33";g.fillRect(22,30,468,179);
  g.fillStyle="#172129";g.fillRect(40,45,430,144);
  for(let i=0;i<4;i++){
    const x=70+i*125;
    const light=g.createRadialGradient(x,38,2,x,65,95);
    light.addColorStop(0,"rgba(255,222,155,.4)");light.addColorStop(1,"rgba(255,222,155,0)");
    g.fillStyle=light;g.fillRect(x-95,25,190,140);
    g.fillStyle="#b8a382";g.fillRect(x-2,22,4,5);
  }
  const shelf=(y:number)=>{g.fillStyle="#6b6560";g.fillRect(30,y,450,7);g.fillStyle="#292b2d";g.fillRect(30,y+7,450,5);};
  if(kind==="bakery"){
    shelf(135);shelf(195);
    for(let row=0;row<2;row++)for(let i=0;i<9;i++){
      const x=52+i*49,y=row?181:121;
      g.fillStyle=i%3===0?"#ae743d":"#c39861";g.beginPath();g.ellipse(x,y,18,9,0,Math.PI,0);g.fill();
      g.strokeStyle="rgba(248,209,135,.5)";g.lineWidth=2;g.beginPath();g.moveTo(x-11,y-2);g.lineTo(x+12,y-5);g.stroke();
    }
    g.fillStyle="#ccbba0";g.fillRect(30,205,450,15);
  } else if(kind==="gym"){
    g.strokeStyle="#9ca4a8";g.lineWidth=7;
    for(const x of [90,250,405]){
      g.beginPath();g.moveTo(x,188);g.lineTo(x,72);g.stroke();
      g.beginPath();g.moveTo(x-36,90);g.lineTo(x+34,90);g.stroke();
      g.fillStyle="#444c53";g.fillRect(x-39,155,78,16);
    }
    g.strokeStyle="#626e78";g.lineWidth=12;g.beginPath();g.moveTo(110,180);g.lineTo(425,180);g.stroke();
  } else if(kind==="cinema"){
    for(let i=0;i<3;i++){
      const x=44+i*158;
      const poster=g.createLinearGradient(x,48,x+132,190);
      poster.addColorStop(0,["#152736","#39313d","#2c3c44"][i]);poster.addColorStop(1,"#5c4f45");
      g.fillStyle=poster;g.fillRect(x,45,126,154);
      g.strokeStyle="#967757";g.lineWidth=5;g.strokeRect(x,45,126,154);
      g.fillStyle="rgba(230,219,199,.5)";g.beginPath();g.arc(x+63,113,30,0,Math.PI*2);g.fill();
      g.fillStyle="#d8ceb9";g.fillRect(x+16,168,94,6);g.fillRect(x+30,181,65,3);
    }
    g.fillStyle="#503f3a";g.fillRect(0,215,512,41);
  } else if(kind==="laundry"){
    for(let i=0;i<5;i++){
      const x=26+i*99;
      g.fillStyle="#959fa3";g.fillRect(x,73,88,134);
      g.fillStyle="#404d56";g.fillRect(x+4,77,80,27);
      g.fillStyle="#a8bbc1";g.beginPath();g.arc(x+44,155,35,0,Math.PI*2);g.fill();
      g.fillStyle="#303c46";g.beginPath();g.arc(x+44,155,28,0,Math.PI*2);g.fill();
      g.fillStyle="#718899";g.beginPath();g.arc(x+44,155,18,0,Math.PI*2);g.fill();
    }
  } else if(kind==="bookshop"){
    for(let row=0;row<3;row++){
      shelf(94+row*56);
      for(let i=0;i<29;i++){
        const x=33+i*16+(row%2)*4;
        const heights=20+((i*13+row*17)%23);
        g.fillStyle=["#765244","#9c8c72","#3c6170","#667650","#b5a38b","#5d556a"][((i*7+row*5)%6)];
        g.fillRect(x,94+row*56-heights,12,heights);
        g.fillStyle="rgba(245,228,204,.35)";g.fillRect(x+3,96+row*56-heights,1,heights-5);
      }
    }
  } else {
    shelf(107);shelf(197);
    for(let row=0;row<2;row++)for(let i=0;i<7;i++){
      const x=42+i*66,y=row?143:62,dy=row?48:43;
      g.fillStyle=["#9d8467","#b69b76","#716c60"][i%3];g.fillRect(x,y,57,dy);
      g.strokeStyle="#6e5949";g.lineWidth=2;g.strokeRect(x,y,57,dy);
      g.fillStyle="#dbd0ba";g.fillRect(x+8,y+10,21,10);
    }
  }
  // Shop glazing: narrow metal mullions, illuminated frame and real-world angled reflections.
  g.fillStyle="rgba(8,17,25,.18)";g.fillRect(0,0,512,256);
  g.fillStyle="rgba(230,244,251,.10)";
  g.beginPath();g.moveTo(75,0);g.lineTo(115,0);g.lineTo(21,256);g.lineTo(0,256);g.fill();
  g.beginPath();g.moveTo(390,0);g.lineTo(418,0);g.lineTo(309,256);g.lineTo(282,256);g.fill();
  g.strokeStyle="#1b252c";g.lineWidth=11;g.strokeRect(5,5,502,246);
  g.fillRect(252,2,8,252);
  g.strokeStyle="rgba(198,218,229,.22)";g.lineWidth=3;g.strokeRect(15,15,480,228);
  const tex=new THREE.CanvasTexture(canvas);
  tex.colorSpace=THREE.SRGBColorSpace;
  return tex;
}

export function buildShopfronts(scene: THREE.Scene, fronts: Shopfront[]) {
  const owned: Array<{dispose:()=>void}> = [];
  const group=new THREE.Group();scene.add(group);
  for(const front of fronts){
    const tex=displayTexture(front.kind);
    const material=new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide,toneMapped:false});
    const geometry=new THREE.PlaneGeometry(front.width-.36,2.08);
    const display=new THREE.Mesh(geometry,material);
    display.name="Shop display · "+front.kind;
    display.position.set(front.x,1.38,front.z+.25);
    group.add(display);
    owned.push(tex,material,geometry);
  }
  return { dispose(){scene.remove(group);owned.forEach(x=>x.dispose());} };
}
