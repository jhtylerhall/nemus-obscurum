# Nemus Obscurum

A real-time, Dark Forest-inspired simulation built with [Expo](https://expo.dev/) and React Native. The app renders a procedural starfield and evolving civilisations using `expo-gl` and `three.js`.

## Features

- WebGL rendering via `expo-gl` with a Three.js scene.
- Simulation engine driving procedurally generated stars and civs.
- Points-of-interest shortcuts to jump to home, strongest, frontier, densest, nearest or random systems.
- Heads-up display showing reveals, kills and current FPS.
- Pause/resume and reset controls.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm
- Expo CLI (`npm install -g expo-cli`) or use `npx expo`
- Expo Go or a custom dev client on your iOS/Android device. Web is **not** supported because of `expo-gl`.

### Installation

```bash
npm install
```

### Running

Launch the app with Expo:

- **iOS simulator:**
  ```bash
  npm run ios
  ```
- **Android emulator:**
  ```bash
  npm run android
  ```
- **Generic start:**
  ```bash
  npm start
  ```
  This opens Expo Dev Tools so you can choose a platform.

Use pinch gestures to zoom and drag to orbit the camera. The POI bar lets you quickly focus on interesting regions.

## Performance Tuning

If your device struggles to keep up, lower the defaults in `src/features/params/paramsSlice.ts`:

- `maxStars` (e.g. `80_000`)
- `maxCivs` (e.g. `10_000`)

Restart the app after adjusting these values.

## Project Structure

- `src/gl` – WebGL scene and rendering helpers.
- `src/sim` – Simulation engine and types.
- `src/features` – Redux slices for parameters and simulation stats.
- `src/ui` – UI components such as the POI bar.
- `src/state` – Redux store configuration and hooks.

## Scripts

- `npm run ios` / `npm run android` – launch the app on iOS/Android.
- `npm test` – run TypeScript type checks.

## License

Licensed under the [Apache 2.0](LICENSE) license.
