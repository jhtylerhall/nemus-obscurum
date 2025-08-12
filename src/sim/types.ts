export type Strategy = 0|1|2|3;
export interface EngineParams {
  radiusStart:number; radiusGrowthPerSec:number; starDensityPerVol:number; civSpawnProb:number;
  surveyTickHz:number; surveyDutyCycle:number; candsPerTick:number; snrThreshAngle:number; snrThreshParallax:number; geomFactor:number;
  zodiMin:number; zodiMax:number; starNoiseMin:number; starNoiseMax:number;
  Tcap:number; rangeBase:number; rangeScale:number; budgetBase:number; budgetScale:number; pDetectBaseMin:number; pDetectBaseMax:number;
  rDetectBase:number; detectTechInflation:number; pDetectSignal:number;
  pKillBase:number; pRetaliate:number; relTechSwing:number;
  lightSpeed:number; targetVrms:number; navScaleAng:number; navScaleRad:number;
  revealFadeProb:number;
  mix:{ silent:number; broadcast:number; cautious:number; preemptive:number; };
  maxStars:number; maxCivs:number;
}
export interface Snapshot {
  step:number; time:number; radius:number;
  alive:number; totalCivs:number;
  revealsB:number; revealsS:number; revealsR:number;
  killsThisStep:number; totalKills:number;
}
