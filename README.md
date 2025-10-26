# Nemus Obscurum – Homeworld

An Expo + React Native experience that renders a Dark Forest homeworld in real time using `expo-gl` and `three.js`. The scene showcases a planet with custom shaders, atmosphere halo, orbital guides, and a living civilization whose stats drive the visuals.

## Features

- Dedicated homeworld renderer with planet, star, atmosphere, and orbit lines.
- Civ simulation ticking at 60 Hz with energy, secrecy, and morale feedback.
- HUD overlay summarizing population, tech level, secrecy, energy usage, and morale.
- Expo-friendly Three.js integration that works on iOS and Android via `expo-gl`.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm
- Expo CLI (`npm install -g expo-cli`) or `npx expo`
- Expo Go or a custom dev client on iOS/Android (Web is not supported because of `expo-gl`).

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

### Controls

- Drag to orbit around the homeworld.
- Pinch to adjust the camera radius.
- The HUD updates automatically as the civilization evolves.

## Project Structure

- `src/App.tsx` – Root component that hosts the GL scene and overlays.
- `src/components/HomeworldScene.tsx` – Bridges Expo GL contexts into Three.js.
- `src/homeworld/*` – Rendering primitives (planet, atmosphere, star, orbits) and civ simulation.

## Scripts

- `npm run ios` / `npm run android` – launch the app on iOS/Android.
- `npm test` – run TypeScript type checks.

## License

Licensed under the [Apache 2.0](LICENSE) license.
