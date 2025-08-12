import { createSlice, PayloadAction } from '@reduxjs/toolkit';
export interface SimStats { step:number; time:number; fps:number; alive:number; totalCivs:number; radius:number; revealsB:number; revealsS:number; revealsR:number; killsThisStep:number; totalKills:number; }
const initialState: SimStats = { step:0,time:0,fps:0,alive:0,totalCivs:0,radius:0,revealsB:0,revealsS:0,revealsR:0,killsThisStep:0,totalKills:0 };
const slice = createSlice({ name:'sim', initialState, reducers:{ setStats(state, action:PayloadAction<Partial<SimStats>>){ Object.assign(state, action.payload); } } });
export const { setStats } = slice.actions;
export const simReducer = slice.reducer;
