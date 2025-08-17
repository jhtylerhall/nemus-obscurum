import { createSlice, PayloadAction } from "@reduxjs/toolkit";
export type Strategy = "silent" | "broadcast" | "cautious" | "preemptive";
export interface ParamsState {
  radiusStart: number;
  radiusGrowthPerSec: number;
  starDensityPerVol: number;
  civSpawnProb: number;
  surveyTickHz: number;
  surveyDutyCycle: number;
  candsPerTick: number;
  snrThreshAngle: number;
  snrThreshParallax: number;
  geomFactor: number;
  zodiMin: number;
  zodiMax: number;
  starNoiseMin: number;
  starNoiseMax: number;
  Tcap: number;
  rangeBase: number;
  rangeScale: number;
  budgetBase: number;
  budgetScale: number;
  pDetectBaseMin: number;
  pDetectBaseMax: number;
  rDetectBase: number;
  detectTechInflation: number;
  pDetectSignal: number;
  pKillBase: number;
  pRetaliate: number;
  relTechSwing: number;
  lightSpeed: number;
  targetVrms: number;
  navScaleAng: number;
  navScaleRad: number;
  revealFadeProb: number;
  mix: Record<Strategy, number>;
  maxStars: number;
  maxCivs: number;
  starSeed: number;
  starRadius: number;
}
const initialState: ParamsState = {
  radiusStart: 1.0,
  radiusGrowthPerSec: 0.08,
  starDensityPerVol: 30,
  civSpawnProb: 0.05,
  surveyTickHz: 4,
  surveyDutyCycle: 0.18,
  candsPerTick: 20,
  snrThreshAngle: 6.0,
  snrThreshParallax: 7.0,
  geomFactor: 0.25,
  zodiMin: 0.5,
  zodiMax: 3.0,
  starNoiseMin: 0.2,
  starNoiseMax: 1.2,
  Tcap: 1.5,
  rangeBase: 0.1,
  rangeScale: 0.55,
  budgetBase: 2.0,
  budgetScale: 8.0,
  pDetectBaseMin: 0.15,
  pDetectBaseMax: 0.7,
  rDetectBase: 0.12,
  detectTechInflation: 0.06,
  pDetectSignal: 0.85,
  pKillBase: 0.7,
  pRetaliate: 0.55,
  relTechSwing: 0.15,
  lightSpeed: 0.25,
  targetVrms: 0.02,
  navScaleAng: 0.015,
  navScaleRad: 0.15,
  revealFadeProb: 0.05,
  mix: { silent: 0.4, broadcast: 0.2, cautious: 0.25, preemptive: 0.15 },
  maxStars: 150_000,
  maxCivs: 20_000,
  starSeed: 1337,
  starRadius: 200_000,
};
const slice = createSlice({
  name: "params",
  initialState,
  reducers: {
    setParams(state, action: PayloadAction<Partial<ParamsState>>) {
      Object.assign(state, action.payload);
    },
  },
});
export const { setParams } = slice.actions;
export const paramsReducer = slice.reducer;
