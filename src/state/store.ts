import { configureStore } from '@reduxjs/toolkit';
import { paramsReducer } from '../features/params/paramsSlice';
import { simReducer } from '../features/sim/simSlice';

export const store = configureStore({
  reducer: { params: paramsReducer, sim: simReducer },
  middleware: (gDM) => gDM({ serializableCheck: false, immutableCheck: false }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
