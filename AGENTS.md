# AGENTS HANDBOOK — `nemus-obscurum`

**Mission**  
Build a real-time, mobile-friendly “Dark Forest” simulation you can watch unfold: tens of thousands of stars, thousands of civilizations, realistic discovery/visibility difficulty, and smooth 60 FPS navigation—on **Expo + React Native** with **expo-gl + three.js**.

This file is for automation agents (Codex, etc.) and contributors. It documents **how this repo works**, **what must never break**, and **how to implement changes safely**.

---

## 1) Tech Stack & Versions

- **App**: Expo (SDK 53), React Native, React 18, Hermes engine  
- **Rendering**: `expo-gl` + `three` (WebGL via RN), custom shader point clouds  
- **Gestures**: `react-native-gesture-handler` (v2), `react-native-reanimated`  
- **UI overlays**: `react-native-svg` (MiniMap, HUD)
- **State**: Redux Toolkit (light use for sim stats)  

> **Important metro/babel setup**
> - `react-native-reanimated/plugin` must be the **last** plugin in `babel.config.js`.
> - We do **not** depend on DOM; avoid `document`/`window`. There is a tiny canvas shim only inside GL context creation.  
> - **Hermes gotcha**: never use optional chaining on the left-hand side of an assignment (e.g., `attr?.needsUpdate = true` will crash Hermes).

---

## 2) High-Level Architecture

```
src/
  App.tsx                       # Screen: header + POI chips + GLScene + toolbar
  gl/
    Scene.tsx                   # Three.js scene, GLView, shaders, gestures, picking
    engineAdapter.ts            # Adapts the sim engine arrays to a uniform interface
    types.ts                    # GL/engine view types
    poi.ts                      # POI strategies: strongest/frontier/densest/nearest
  ui/
    MiniMap.tsx                 # 2D XZ minimap, tap-to-jump (SVG)
    POIBar.tsx                  # Chip buttons for POI focus actions
    Vignette.tsx                # Soft vignette overlay
    CoordsHUD.tsx               # Live x,y,z / yaw / pitch / dist HUD
  sim/
    engine.ts                   # Simulation (stepping, arrays: starPos, civPos, etc.)
  state/
    store.ts, hooks.ts, ...     # Redux (stats only)
```

**Render loop contract (Scene.tsx):**
- Pulls data from the engine (via `engineAdapter`) and writes into preallocated `Float32Array` buffers.
- Calls `markNeedsUpdate(geom, attr)` and updates `drawRange` only when changed.
- **No per-frame object allocation** inside the hot loop (avoid new arrays/objects).
- Camera is an **orbit** around a moving `lookAt` with smooth focus tweening.
- Picking uses `THREE.Raycaster` against **civ point cloud** only.

---

## 3) Engine Adapter Contract

`engineAdapter.ts` exposes a stable, typed view regardless of the engine’s internal field names:

```ts
type EngineView = {
  starCount: number;
  civCount: number;
  step: (dt: number) => void;            // drives the sim forward
  getStar(i: number): [x, y, z];
  isCivAlive(i: number): boolean;
  getCivPos(i: number): [x, y, z];
  getCivStrat(i: number): number;        // 0 silent, 1 broadcast, 2 cautious, 3 preempt
  getCivTech(i: number): number;         // technology/strength scalar
  isCivRevealed(i: number): boolean;     // visibility halo
};
```

The adapter auto-detects either split arrays `(sx,sy,sz)/(cx,cy,cz)` or interleaved `(starPos/civPos)`. If the engine supplies `stepN(n)`, the adapter batches by converts `dt` to ~60 Hz steps.

---

## 4) Scene Public API (what UI can call)

`GLSceneHandle`:
```ts
focusCiv(index: number): void
focusRandom(): void
focusStrongest(): void
focusFrontier(): void
focusDensest(): void
focusNearest(): void
home(): void
jumpToWorldXY(x: number, z: number): void
```

Focus guarantees a **visible distance** and **pulses** the target civ for orientation.

---

## 5) Performance Rules (DO / DON’T)

**DO**
- Preallocate large buffers (`Float32Array`) for positions/colors/sizes.
- Update attributes using typed arrays and then set `needsUpdate` via a helper (no optional chaining on LHS).
- Use `geometry.setDrawRange(0, count)` instead of re-creating geometry.
- `renderer.setSize(...)` **only** on layout, not each frame.
- Throttle overlay data (minimap/civ sampling) to ~10 Hz.

**DON’T**
- Don’t allocate arrays/objects inside the frame loop.
- Don’t use DOM/`document`/`window`. RN + Hermes doesn’t provide them.
- Don’t mutate `three` attributes with `?.` on the left side (`attr?.needsUpdate = true`).
- Don’t add heavy per-point materials; use point shaders or `PointsMaterial`.

---

## 6) Visual Orientation Aids

- **MiniMap** (XZ, FOV wedge, tap-to-jump), **HUD** (x,y,z / yaw / pitch / dist).
- **Grid** + **Axes** helpers, semi-transparent.
- **Parallax background**: outer stars + three soft nebula sprites.
- **Guide beacons**: show a ring of gold points when too few civs are alive (prevents “empty void”).

---

## 7) Common Tasks (Recipes)

### A) Add a new POI strategy
1. Implement it in `src/gl/poi.ts` (return civ index or `-1`).
2. Wire a chip in `App.tsx` via `POIBar` → call the right `GLScene` method.

### B) Spawn “more life” (testing visibility)
- Prefer changing **engine defaults** (e.g., in `engine.ts` params used by `new Engine(params, seed)`), not the renderer.
- If needed, increase `maxCivs`/`maxStars` props passed to `<GLScene/>` from `App.tsx`. Keep memory in mind: each point adds to 3 attributes (pos/color/size).

### C) Add a new attribute to point clouds
1. Create a typed array at creation time (outside the loop).  
2. `geometry.setAttribute(name, new THREE.BufferAttribute(array, itemSize))`.  
3. In the loop, fill values; call `markNeedsUpdate(geom, name)`.  
4. Avoid changing `itemSize`/`array` length at runtime.

### D) Make something visible immediately
- Use `home()` to center and set distance based on engine `radius`.
- If `radius` is `0`, Scene auto-frames to the star `boundingSphere`.
- Guide beacons render when `alive < 3`.

---

## 8) Gestures & Picking

- Pan = orbit yaw/pitch (cancels active focus).  
- Pinch = adjust FOV (clamped 20°–100°).  
- Tap = raycast **civ** points with a mobile-friendly `Points.threshold`.  
- Minimap tap-to-jump: converts map coords → world XZ and triggers `jumpToWorldXY`.

---

## 9) Coding Conventions

- **TypeScript strict**; prefer explicit types for public surfaces.
- Keep render-loop code local in `Scene.tsx`; utility math in helpers.  
- File headers include a brief “what this file owns” comment.  
- **Commit style**:  
  - `feat: …` for new user-visible features  
  - `fix: …` for bug fixes  
  - `perf: …` for performance wins  
  - `chore/docs/refactor: …` as appropriate

---

## 10) Build, Run, Verify

```bash
npm run typecheck
npx expo start -c
```

**Visual acceptance checklist**
1. Stars visible; background nebula present; grid/axes faint.  
2. Pan/pinch/tap work smoothly (no hitching).  
3. POI chips move camera; focused civ pulses and is clearly visible.  
4. Minimap tap-to-jump recenters correctly.  
5. HUD updates x,y,z, yaw/pitch/dist.  
6. FPS ≥ ~55 with default params on modern devices.

---

## 11) Troubleshooting

- **“Cannot convert undefined value to object” (Hermes)**  
  Likely set `attr?.needsUpdate = true`. Replace with a helper that checks and then assigns (no optional chaining on LHS).

- **“Property 'document' doesn't exist”**  
  Do not rely on DOM. Only use the tiny canvas shim inside GLView’s context creation (already implemented).

- **Black screen, no content**  
  Use Home (auto-frame). If `radius=0`, Scene uses star `boundingSphere`. Guide beacons appear when `alive < 3`.

- **Metro/Expo version mismatches**  
  Keep Expo SDK (53), React (18), Reanimated plugin last in Babel. Clear cache (`expo start -c`) if odd behavior.

---

## 12) Where to Make Changes

- Rendering: `src/gl/Scene.tsx` (hot loop)  
- Engine shape/params: `src/sim/engine.ts` (stepping, arrays, counts)  
- POI logic: `src/gl/poi.ts`  
- Overlays/UI: `src/ui/*`  
- Stats & controls: `src/App.tsx` and Redux slices  

---

## 13) Agent Playbook (How to Propose Changes)

When opening PRs or automated edits, include:

1) **Summary**: User-visible changes and why.  
2) **Perf note**: Any effect on FPS/memory.  
3) **Screenshots** (before/after).  
4) **Verification steps**: copy/paste commands + in-app steps.  
5) **Risk**: surfaces touched (Scene, Engine, Overlays, State).  

Prefer **atomic PRs** (one feature/fix per branch).

---

## 14) Glossary

- **POI**: Point of Interest (a civ index chosen by a strategy).  
- **Focus tween**: Smooth interpolation of `lookAt` + distance to make a target easy to see.  
- **Draw range**: Restricts how many points a buffer renders without reallocating.  
- **Guide beacons**: Temporary gold points to prevent an empty scene.

---

**Keep this handbook up to date** when changing architecture, versions, or perf rules.
