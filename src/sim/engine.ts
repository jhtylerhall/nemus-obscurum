import type { EngineParams, Snapshot, Strategy } from './types';

function xorshift(seed:number){
  let x = seed | 0;
  return function(){
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
}

export class Engine {
  params: EngineParams;
  rng: () => number;
  stepN = 0;
  time = 0;
  radius = 0;
  starPos: Float32Array;
  starCount = 0;
  civPos: Float32Array;
  civStrat: Uint8Array;
  civAlive: Uint8Array;
  civCount = 0;
  revealsB = 0; revealsS = 0; revealsR = 0;
  killsThisStep = 0; totalKills = 0;

  constructor(params:EngineParams, seed:number){
    this.params = params;
    this.rng = xorshift(seed);
    this.starPos = new Float32Array(params.maxStars*3);
    this.civPos = new Float32Array(params.maxCivs*3);
    this.civStrat = new Uint8Array(params.maxCivs);
    this.civAlive = new Uint8Array(params.maxCivs);
    this.reset();
  }

  reset(){
    this.stepN = 0; this.time = 0; this.radius = this.params.radiusStart;
    this.starCount = 0; this.civCount = 0; this.revealsB = this.revealsS = this.revealsR = 0;
    this.killsThisStep = this.totalKills = 0;
  }

  private randRange(r:number){ return (this.rng()*2-1)*r; }

  private spawnStar(){
    if(this.starCount >= this.params.maxStars) return;
    const i = this.starCount*3;
    const r = this.radius * Math.cbrt(this.rng());
    const th = Math.acos(1-2*this.rng());
    const ph = 2*Math.PI*this.rng();
    this.starPos[i] = r*Math.sin(th)*Math.cos(ph);
    this.starPos[i+1] = r*Math.sin(th)*Math.sin(ph);
    this.starPos[i+2] = r*Math.cos(th);
    this.starCount++;
  }

  private spawnCiv(){
    if(this.civCount >= this.params.maxCivs) return;
    const i = this.civCount*3;
    const r = this.radius * Math.cbrt(this.rng());
    const th = Math.acos(1-2*this.rng());
    const ph = 2*Math.PI*this.rng();
    this.civPos[i] = r*Math.sin(th)*Math.cos(ph);
    this.civPos[i+1] = r*Math.sin(th)*Math.sin(ph);
    this.civPos[i+2] = r*Math.cos(th);
    const s = this.rng();
    this.civStrat[this.civCount] = s < this.params.mix.silent ? 0 : s < this.params.mix.silent + this.params.mix.broadcast ? 1 : s < this.params.mix.silent + this.params.mix.broadcast + this.params.mix.cautious ? 2 : 3;
    this.civAlive[this.civCount] = 1;
    this.civCount++;
  }

  private detect(a:number, b:number){
    // simplistic detection with nav error
    const ax = this.civPos[a*3], ay = this.civPos[a*3+1], az = this.civPos[a*3+2];
    const bx = this.civPos[b*3], by = this.civPos[b*3+1], bz = this.civPos[b*3+2];
    const dx = ax-bx + this.randRange(this.params.navScaleRad);
    const dy = ay-by + this.randRange(this.params.navScaleRad);
    const dz = az-bz + this.randRange(this.params.navScaleRad);
    const d2 = dx*dx+dy*dy+dz*dz;
    const range = Math.sqrt(d2);
    const p = this.params.pDetectBaseMin + (this.params.pDetectBaseMax-this.params.pDetectBaseMin)*Math.exp(-range*this.params.rDetectBase);
    return this.rng() < p;
  }

  private kill(a:number,b:number){
    if(!this.civAlive[b]) return;
    const p = this.params.pKillBase;
    if(this.rng()<p){ this.civAlive[b]=0; this.killsThisStep++; this.totalKills++; }
  }

  step(){
    this.killsThisStep = 0;
    // expand sphere
    this.radius += this.params.radiusGrowthPerSec/this.params.surveyTickHz;
    const vol = 4/3*Math.PI*this.radius**3;
    // spawn stars proportionally
    const desiredStars = Math.min(this.params.maxStars, Math.floor(vol*this.params.starDensityPerVol));
    while(this.starCount < desiredStars) this.spawnStar();
    // spawn civs randomly
    if(this.rng() < this.params.civSpawnProb) this.spawnCiv();
    // each civ detects others
    for(let i=0;i<this.civCount;i++) if(this.civAlive[i]){
      for(let j=0;j<this.civCount;j++) if(i!==j && this.civAlive[j]){
        if(this.detect(i,j)){
          this.revealsS++;
          this.kill(i,j);
        }
      }
    }
    this.stepN++;
    this.time += 1/this.params.surveyTickHz;
  }

  snapshot():Snapshot{
    let alive=0; for(let i=0;i<this.civCount;i++) if(this.civAlive[i]) alive++;
    return {
      step:this.stepN,
      time:this.time,
      radius:this.radius,
      alive,
      totalCivs:this.civCount,
      revealsB:this.revealsB,
      revealsS:this.revealsS,
      revealsR:this.revealsR,
      killsThisStep:this.killsThisStep,
      totalKills:this.totalKills,
    };
  }
}
