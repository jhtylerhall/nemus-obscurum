import * as THREE from 'three';
type Opts={count:number;radius:number;seed:number};
export function buildStarfield({count,radius,seed}:Opts){
  const rng=xorshift(seed),pos=new Float32Array(count*3),col=new Float32Array(count*3);
  const v=new THREE.Vector3();const minR=radius*0.05;
  for(let i=0;i<count;i++){v.set(rng()*2-1,rng()*2-1,rng()*2-1);if(v.lengthSq()<1e-6)v.set(1,0,0);
    v.normalize().multiplyScalar(minR+rng()*(radius-minR));const j=i*3;pos[j]=v.x;pos[j+1]=v.y;pos[j+2]=v.z;
    const c=new THREE.Color().setHSL(200/360+(rng()-0.5)*0.08,0.2+rng()*0.2,0.7+rng()*0.3);
    col[j]=c.r;col[j+1]=c.g;col[j+2]=c.b;}
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));
  g.setAttribute('color',new THREE.Float32BufferAttribute(col,3));g.computeBoundingSphere();
  const base = 2.5 * Math.min(2, window.devicePixelRatio || 1); // DPR-aware
  const m=new THREE.PointsMaterial({vertexColors:true,size:base,sizeAttenuation:true,transparent:true,opacity:0.95,
    depthWrite:false,blending:THREE.AdditiveBlending,map:disk(),alphaTest:0.02});
  const pts=new THREE.Points(g,m);const group=new THREE.Group();group.name='StarfieldGroup';group.add(pts);
  return {group,bounds:g.boundingSphere!};
}
export function spawnVisibleStarAtFrustumCenter(scene:THREE.Scene,camera:THREE.PerspectiveCamera){
  const dist=50,pos=new THREE.Vector3(0,0,-dist).applyMatrix4(camera.matrixWorld);
  const s=new THREE.Sprite(new THREE.SpriteMaterial({map:disk(),color:0xffffff,depthWrite:false,blending:THREE.AdditiveBlending}));
  s.position.copy(pos);s.scale.set(2,2,2);scene.add(s);
}
export function spawnCivVisible(scene:THREE.Scene,camera:THREE.PerspectiveCamera){
  const dist=120,pos=new THREE.Vector3(0,0,-dist).applyMatrix4(camera.matrixWorld);
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(3,24,16),
    new THREE.MeshStandardMaterial({color:0xffaa33,emissive:0x331100,roughness:0.6,metalness:0.1}));
  mesh.position.copy(pos);mesh.name=`Civ_${Date.now()}`;scene.add(mesh);return mesh;
}
function disk(){const s=64,c=document.createElement('canvas');c.width=s;c.height=s;const ctx=c.getContext('2d')!;
  const g=ctx.createRadialGradient(s/2,s/2,0,s/2,s/2,s/2);g.addColorStop(0,'#fff');g.addColorStop(0.5,'rgba(255,255,255,.3)');
  g.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=g;ctx.fillRect(0,0,s,s);return new THREE.CanvasTexture(c);}
function xorshift(seed:number){let x=seed|0||123456789;return()=>{x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/0xffffffff};}
