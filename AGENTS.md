# AGENTS HANDBOOK — `dark-forest-homeworld`

**Mission**
Build a desktop-class Dark Forest "homeworld" viewer with a Vite + TypeScript runtime, real-time Three.js scenegraph, and a lig
htweight civ simulation that can also be ray-traced offline.

This handbook documents what the repo does today, what must stay stable, and how to extend it without breaking the render loop.

---

## 1) Tech Stack & Versions

- **Runtime**: Vite 5, TypeScript 5.6, vanilla DOM.
- **Rendering**: Three.js r169 (`WebGLRenderer`, custom shaders for planet/atmosphere).
- **State**: Local class composition today; [Zustand](https://github.com/pmndrs/zustand) reserved for future overlays.
- **Offline rendering**: CPU ray tracer invoked via `npm run rt:frame` (powered by `tsx`).

> **Build targets**
> - Strict TypeScript everywhere. Keep modules ESM-friendly (`type: module`).
> - Shaders live in `src/render/shaders/*.glsl` and are imported with `?raw`.
> - No React Native or Expo artifacts remain—assume a standard browser DOM.

---

## 2) Repository Layout

```
src/
  main.ts                  # Bootstraps App orchestrator
  core/                    # Renderer, camera rig, timekeeper, lighting helpers
  render/                  # Scene primitives (planet, atmosphere, star, orbit lines)
  sim/                     # Civ state, updates, events, procedural opponents
  spatial/                 # Octree & BVH stubs for culling / ray tracing
  ui/                      # DOM overlays (HUD, action panels)
  save/                    # Snapshot schema + persistence helpers
  rt/                      # Offline ray tracer (RayTracer, Integrators, CLI)
public/
  ui/                      # Icons / cursor placeholders (empty today)
```

Keep new systems inside those folders; add deeper `AGENTS.md` files if you introduce larger subsystems.

---

## 3) Core Runtime Contracts

`core/App.ts` is the orchestrator. It owns:
- `Three.WebGLRenderer` configured with ACES tone mapping + SRGB output.
- `CameraRig` – orbit camera around the planet.
- `Time` – fixed timestep accumulator (1/60s) with frame clamping.
- `Planet`, `Atmosphere`, `Star`, `OrbitLines` – scene primitives.
- Civ simulation state (see `sim/CivUpdate.ts`).
- Overlay UI (`HUD`, `Panels`).

When modifying the render loop, keep these guarantees:
1. **Zero allocations inside `frame()`** except for unavoidable scalars. Reuse vectors if you add math helpers.
2. Call `renderer.render(scene, camera)` once per frame.
3. Only resize the renderer inside `onResize()`.
4. Update UI overlays from existing civ state; do not create DOM elements every frame.

---

## 4) Simulation Hooks

`sim/CivUpdate.ts` exposes:
- `createInitialCivState()` → returns the baseline civ stats.
- `stepCiv(civ, dt)` → mutate-in-place growth, energy usage, secrecy, etc.

Other modules:
- `sim/Events.ts` – resolve aid/strike effects.
- `sim/RemoteCivs.ts` – deterministic procedural civs (Mulberry32 PRNG).
- `sim/Orbits.ts` – helper for orbital motion state.

Keep these mutations cheap; render loop may call them 60× per second.

---

## 5) Rendering Assets

- Planet shader uniforms: `uCamPos`, `uStarDir`, `uDayColor`, `uNightEmit`, `uSpecPower`, `uSpecStrength`, `uAlbedo`, `uCityMask`.
- Atmosphere shader: simple additive halo; adjust intensity via `updateGlow()`.
- `render/Planet.ts` uses small baked `DataTexture`s—swap them for real textures once assets exist.
- Orbit lines rely on dashed `Line` geometry (`computeLineDistances()` required after vertex changes).

When you extend materials:
- Create uniforms once in the constructor.
- Update `ShaderMaterial.needsUpdate` sparingly; prefer updating uniform values directly.

---

## 6) UI Layer

`ui/HUD.ts` and `ui/Panels.tsx` render DOM overlays appended after the canvas. Rules:
- The top-level UI container has `pointer-events: none`; enable interaction by setting `pointer-events: auto` on interactive nodes.
- Avoid reflow churn—cache DOM nodes and only update `textContent`/`innerHTML` for changed data.
- Keep styles inline or colocated (no CSS framework yet).

---

## 7) Offline Ray Tracer

- Entry point: `src/rt/cli.ts` (executed via `npm run rt:frame`). Uses `tsx` so extension specifiers may end in `.js`.
- `RayTracer` + `Integrators` implement Blinn-Phong shading for spheres.
- `Accel.ts` currently returns all spheres (placeholder). Expand with BVH traversal when needed.
- Output PNG is written to `public/frame.png`; delete or gitignore if you do not want binaries committed.

When expanding the ray tracer, favour pure functions and typed vectors (`THREE.Vector3`).

---

## 8) Tooling & Commands

```bash
npm install        # install deps
npm run dev        # Vite dev server (opens browser)
npm run build      # Production bundle (Rollup)
npm run preview    # Preview the built bundle
npm run rt:frame   # CPU ray tracer demo (writes public/frame.png)
```

CI expectations:
- `npm run build` must succeed without type errors.
- `npm run rt:frame` must finish without throwing.

---

## 9) Coding Conventions

- TypeScript strict mode; export explicit types from modules that form a public API.
- Use modern ES syntax (class fields, const/let). No CommonJS requires.
- Prefer composition over singletons—pass dependencies via constructors when adding systems.
- Shader files should keep consistent formatting (two spaces indent, `precision highp float;` header).
- Commit messages: `feat:` (features), `fix:`, `perf:`, `chore:`, `docs:`.

---

## 10) Performance & Quality Checklist

Before shipping changes that touch rendering or simulation:
1. **Build** (`npm run build`) – ensures TS + bundler success.
2. **Ray trace** (`npm run rt:frame`) if you changed `src/rt/*`.
3. Verify the orbit camera still frames the planet and renderer resizes with the window.
4. Ensure `App.frame()` remains allocation-free.
5. Keep overlay updates lightweight (string updates only).

---

## 11) Glossary

- **Civ** – a civilization unit tracked by the simulation.
- **IBL** – image-based lighting, loaded via `core/loaders/HDRLoader.ts` (future work).
- **Draw range** – geometry budget set via `BufferGeometry.setDrawRange` (not yet used but plan for instanced buffers).
- **Mulberry32** – deterministic PRNG used for procedural civs.

---

Keep this handbook synchronized with architecture changes so future agents know the current rules.
