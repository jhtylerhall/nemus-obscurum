# AGENTS HANDBOOK — `nemus-obscurum`

**Mission**
Build an Expo + React Native experience that renders a Dark Forest homeworld in real time. The runtime uses `expo-gl` + Three.js, simulates a single civilization, and exposes lightweight HUD overlays describing the homeworld.

---

## 1) Runtime & Tooling

- **Platform**: Expo SDK 54 (React Native 0.81) targeting iOS/Android handhelds.
- **Rendering**: `expo-gl` surface bridged into `three.js@0.166` via a custom `HomeworldScene` component.
- **Language**: TypeScript everywhere (`strict: true`). The repo is CommonJS at the package level because Expo metro owns bundling.
- **Build/Test**:
  ```bash
  npm install
  npm run ios   # or npm run android / npm start
  npm run typecheck
  ```
- `npm test` is aliased to TypeScript type checking; keep the command green.

---

## 2) Source Layout

```
src/
  App.tsx                   # Root component – mounts GL scene + HUD overlay
  components/
    HomeworldScene.tsx      # Expo GLView -> Three.js bridge (renderer lifecycle)
  homeworld/
    HomeworldApp.ts         # Orchestrates renderer, civ simulation, frame loop
    CameraRig.ts            # Orbit camera math (radius, phi/theta)
    Planet.ts               # Custom shader planet mesh
    Atmosphere.ts           # Additive halo around the planet
    Star.ts                 # Pulsing emissive star
    OrbitLines.ts           # Dashed orbital guides
    Lighting.ts             # Lights shared by renderer + star direction
    Simulation.ts           # Civ state + fixed-step update logic
    shaders.ts              # GLSL strings embedded for RN bundler
```

Do not reintroduce the previous Redux-based starfield systems unless the product requirements change. Keep the homeworld runtime compact and allocation-free in the animation loop.

---

## 3) Rendering Contracts

- `HomeworldApp.frame()` is called from `WebGLRenderer.setAnimationLoop`. **No allocations** inside the loop aside from scalars.
- Always call `gl.endFrameEXP()` via the `endFrame` callback after rendering so Expo flushes the GL buffer.
- Update renderer size only through `HomeworldApp.resize()`; the Expo `GLView` hands you layout width/height in logical pixels—multiply by `PixelRatio.get()` before passing to the renderer.
- When editing shaders:
  - Keep them in `homeworld/shaders.ts` as string literals (Metro lacks `?raw`).
  - Maintain `precision highp float;` headers and two-space indent.

---

## 4) Simulation Hooks

- Civ model lives in `homeworld/Simulation.ts` and is intentionally tiny: growth, energy usage, secrecy, morale, reveal state.
- The fixed-step accumulator in `HomeworldApp` ticks at `1/60s`. Clamp accumulated time to `0.2s` to avoid spiral of death.
- Updating the civ should also update visuals:
  - `Planet.updateSurfaceEnergy()` tweaks day/night colors.
  - `Atmosphere.updateGlow()` brightens based on secrecy loss.
  - `Star.updatePulse()` oscillates emissive strength for ambiance.

---

## 5) UI Layer

- The HUD lives inside `src/App.tsx`. Keep overlays lightweight: static `View` + `Text` with `pointerEvents="none"` on the container so GL interactions keep flowing.
- Prefer `Intl.NumberFormat` for user-facing numbers instead of manual rounding.

---

## 6) Performance Checklist

Before committing changes that touch rendering or simulation:
1. `npm run typecheck`
2. Launch the app on at least one platform (Expo Go or simulator) and verify:
   - Planet, atmosphere, star, and orbit lines render without artifacts.
   - Civ stats update smoothly; no dropped frames or hitching.
   - PanResponder-based pinch + drag gestures still orbit/zoom the camera.

---

Keep this handbook aligned with the current homeworld implementation so future agents maintain the same contracts.
