import React,{memo,useEffect,useRef}from'react';import* as THREE from'three';
import{createRenderer,resizeRendererToDisplaySize}from'./threeSetup';
import{buildStarfield,spawnVisibleStarAtFrustumCenter,spawnCivVisible}from'./stars';
import{useAnimationFrame}from'./useAnimationFrame';import{useFlyControls}from'./useFly';
import{useTouchLook}from'./useTouchLook';
import'../styles/scene.css';

function SceneComponent(){
  const rootRef=useRef<HTMLDivElement>(null);
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const rendererRef=useRef<THREE.WebGLRenderer|null>(null);
  const sceneRef=useRef(new THREE.Scene());
  const cameraRef=useRef<THREE.PerspectiveCamera|null>(null);

  useEffect(()=>{const canvas=canvasRef.current!;const r=createRenderer(canvas);rendererRef.current=r;
    const cam=new THREE.PerspectiveCamera(60,1,0.1,2e6);cam.position.set(0,0,120);cam.lookAt(0,0,0);cameraRef.current=cam;
    const sc=sceneRef.current;sc.add(new THREE.AmbientLight(0xffffff,0.18));
    sc.add(new THREE.HemisphereLight(0x88aaff,0x080820,0.35));
    const dir=new THREE.DirectionalLight(0xffffff,0.15);dir.position.set(1,1,2);sc.add(dir);
    const stars=buildStarfield({count:5e4,radius:5000,seed:42});sc.add(stars.group);
    // Resize handling
    const onResize=()=>resizeRendererToDisplaySize(r,cam);onResize();
    const ro=new ResizeObserver(onResize);ro.observe(rootRef.current!);
    return()=>{ro.disconnect();(r as any).__disposeExtras?.();sc.clear();r.dispose();};},[]);

  // Controls
  const fly=useRef<ReturnType<typeof useFlyControls> | undefined>(undefined);
  useEffect(()=>{if(cameraRef.current&&rootRef.current)
    fly.current=useFlyControls(cameraRef.current,rootRef.current);},[]);
  useTouchLook(cameraRef.current ?? undefined, rootRef.current ?? undefined);

  // Render loop
  useAnimationFrame(dt=>{const r=rendererRef.current,c=cameraRef.current,s=sceneRef.current;if(!r||!c)return;
    fly.current?.(dt); r.render(s,c);});

  return(<div ref={rootRef} className="scene-root">
    <canvas ref={canvasRef}/>
    <div className="scene-hud" style={{position:'absolute',left:8,top:8,display:'flex',gap:6,zIndex:10}}>
      <button onClick={()=>spawnVisibleStarAtFrustumCenter(sceneRef.current,cameraRef.current!)}>Spawn Star</button>
      <button onClick={()=>spawnCivVisible(sceneRef.current,cameraRef.current!)}>Spawn Civ</button>
    </div>
  </div>);
}
export const Scene=memo(SceneComponent);
export type GLSceneHandle = {
  home?: () => void;
  focusRandom?: () => void;
  focusCiv?: (i: number) => void;
  focusStrongest?: () => void;
  focusFrontier?: () => void;
  focusDensest?: () => void;
  focusNearest?: () => void;
  jumpToWorldXY?: (x: number, z: number) => void;
};
export const GLScene = memo(React.forwardRef<GLSceneHandle, any>(function GLSceneComponent(_props, _ref){
  return <SceneComponent />;
}));
