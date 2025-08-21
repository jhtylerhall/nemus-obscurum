import * as THREE from'three';import{useEffect,useRef}from'react';
export function useFlyControls(cam:THREE.PerspectiveCamera|undefined,dom:HTMLElement|undefined){
  const keys=useRef<Record<string,boolean>>({});
  useEffect(()=>{if(!dom||!cam)return;const h=(e:KeyboardEvent)=>{keys.current[e.code]=e.type==='keydown';};
    window.addEventListener('keydown',h);window.addEventListener('keyup',h);
    return()=>{window.removeEventListener('keydown',h);window.removeEventListener('keyup',h);};},[dom,cam]);
  return(dt:number)=>{if(!cam)return;const sp=(keys.current['ShiftLeft']||keys.current['ShiftRight'])?200:60;
    const f=Number(!!keys.current['KeyW'])-Number(!!keys.current['KeyS']);
    const r=Number(!!keys.current['KeyD'])-Number(!!keys.current['KeyA']);
    const u=Number(!!keys.current['KeyE'])-Number(!!keys.current['KeyQ']);
    const d=new THREE.Vector3(r,u,-f); if(d.lengthSq()>0){ d.normalize().applyQuaternion(cam.quaternion).multiplyScalar(sp*dt);
      cam.position.add(d); } };
}
