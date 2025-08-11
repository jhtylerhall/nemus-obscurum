import React, { useEffect, useRef } from 'react';
import { GLView } from 'expo-gl';
import * as THREE from 'three';
import { PanGestureHandler, PinchGestureHandler } from 'react-native-gesture-handler';
import { Engine } from '../sim/engine';

interface Props {
  engine: Engine;
  maxStars: number;
  maxCivs: number;
  onFps: (fps:number)=>void;
}

export function GLScene({ engine, maxStars, maxCivs, onFps }:Props){
  const glRef = useRef<any>(null);
  const rendererRef = useRef<THREE.WebGLRenderer>();
  const cameraRef = useRef<THREE.PerspectiveCamera>();
  const sceneRef = useRef(new THREE.Scene());
  const starGeom = useRef(new THREE.BufferGeometry());
  const civGeom = useRef(new THREE.BufferGeometry());
  const frames = useRef(0); const last = useRef(Date.now());
  const rot = useRef({x:0,y:0});
  const dist = useRef(80);

  const updateCamera = ()=>{
    const cam = cameraRef.current; if(!cam) return;
    cam.position.x = dist.current*Math.sin(rot.current.y)*Math.cos(rot.current.x);
    cam.position.y = dist.current*Math.sin(rot.current.x);
    cam.position.z = dist.current*Math.cos(rot.current.y)*Math.cos(rot.current.x);
    cam.lookAt(0,0,0);
  };

  const onContextCreate = (gl:any)=>{
    glRef.current = gl;
    const { drawingBufferWidth:width, drawingBufferHeight:height } = gl;
    const renderer = new THREE.WebGLRenderer({ gl, antialias:true });
    renderer.setSize(width, height);
    rendererRef.current = renderer;
    const camera = new THREE.PerspectiveCamera(60, width/height, 0.1, 1e6);
    cameraRef.current = camera;
    updateCamera();

    const starAttr = new THREE.BufferAttribute(new Float32Array(maxStars*3),3);
    starGeom.current.setAttribute('position', starAttr);
    const starMat = new THREE.PointsMaterial({ color:0xffffff, size:0.4, sizeAttenuation:true });
    const starPts = new THREE.Points(starGeom.current, starMat);
    sceneRef.current.add(starPts);

    const civAttr = new THREE.BufferAttribute(new Float32Array(maxCivs*3),3);
    civGeom.current.setAttribute('position', civAttr);
    const civMat = new THREE.PointsMaterial({ color:0xff4040, size:1.5, sizeAttenuation:true });
    const civPts = new THREE.Points(civGeom.current, civMat);
    sceneRef.current.add(civPts);

    const render = ()=>{
      engine.step();
      const sPos = starGeom.current.attributes.position.array as Float32Array;
      sPos.set(engine.starPos.subarray(0, engine.starCount*3));
      starGeom.current.setDrawRange(0, engine.starCount);
      starGeom.current.attributes.position.needsUpdate = true;
      const cPos = civGeom.current.attributes.position.array as Float32Array;
      cPos.set(engine.civPos.subarray(0, engine.civCount*3));
      civGeom.current.setDrawRange(0, engine.civCount);
      civGeom.current.attributes.position.needsUpdate = true;

      renderer.render(sceneRef.current, cameraRef.current!);
      gl.endFrameEXP();

      frames.current++;
      const now = Date.now();
      if(now - last.current > 1000){ onFps(frames.current); frames.current=0; last.current=now; }
      requestAnimationFrame(render);
    };
    render();
  };

  const onPan = (e:any)=>{ rot.current.y -= e.nativeEvent.translationX*0.005; rot.current.x -= e.nativeEvent.translationY*0.005; updateCamera(); };
  const onPinch = (e:any)=>{ dist.current /= e.nativeEvent.scale; updateCamera(); };

  return (
    <PanGestureHandler onGestureEvent={onPan} minDist={10}>
      <PinchGestureHandler onGestureEvent={onPinch}>
        <GLView style={{flex:1}} onContextCreate={onContextCreate} />
      </PinchGestureHandler>
    </PanGestureHandler>
  );
}
