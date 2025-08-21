import {useEffect,useRef} from'react';
export function useAnimationFrame(cb:(dt:number)=>void){
  const raf=useRef<number | undefined>(undefined),last=useRef(performance.now()),mounted=useRef(false);
  useEffect(()=>{ if(mounted.current) return; mounted.current=true;
    let run=true;const loop=()=>{ if(!run) return; const n=performance.now(),dt=Math.min(0.1,(n-last.current)/1000);
      last.current=n; cb(dt); raf.current=requestAnimationFrame(loop);};
    raf.current=requestAnimationFrame(loop);
    return()=>{run=false;if(raf.current)cancelAnimationFrame(raf.current);};},[cb]);
}
