# nemus-obscurum

dark forest esque simulation

## Run

Use iOS/Android (Expo Go or dev client). Web is not supported for expo-gl.

Commands: `npm run ios` or `npm run android`.

Pinch to zoom, drag to orbit. Stats HUD shows reveals/kills/fps.

## Tuning

If device struggles, lower defaults in `src/features/params/paramsSlice.ts`:
`maxStars` (e.g., 80_000) and `maxCivs` (e.g., 10_000).
