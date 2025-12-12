# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Nemus Obscurum is a real-time Dark Forest simulation built with Expo and React Native. It renders tens of thousands of procedurally generated stars and evolving civilizations using WebGL (via expo-gl and three.js). The simulation explores discovery mechanics, visibility constraints, and survival strategies in a 3D space environment.

**Key Technologies:**
- Expo SDK 54 + React Native 0.81.5
- Three.js for WebGL rendering via expo-gl
- Redux Toolkit for state management
- React Native Gesture Handler for camera controls
- TypeScript with strict mode

**Important:** This app requires Expo Go or a custom dev client. Web is NOT supported due to expo-gl dependency.

## Common Commands

### Development
```bash
npm start              # Start Expo dev server (shows platform options)
npm run ios            # Launch on iOS simulator
npm run android        # Launch on Android emulator
npm run typecheck      # Run TypeScript type checking (also: npm test)
```

### Performance Tuning
If the app runs slowly on your device, reduce these values in `src/features/params/paramsSlice.ts`:
- `maxStars` (default: 150,000)
- `maxCivs` (default: 20,000)

Restart the app after changes.

## Architecture Overview

### Core Simulation Loop
The app separates simulation logic from rendering:

**Engine (`src/sim/engine.ts`):**
- Owns all simulation state as typed arrays (Float32Array, Uint8Array)
- Runs the simulation step() method independently of rendering
- Manages stars, civilizations, detection, and survival mechanics
- Exposes runtime switches: `paused`, `violence`, `expansion`

**Renderer (`src/gl/`):**
- Pulls data from engine via `engineAdapter.ts` using a stable EngineView interface
- Updates Three.js geometry buffers with pre-allocated typed arrays
- Runs at ~60 FPS with zero per-frame allocations
- Camera orbits around a moveable `lookAt` point with smooth focus tweening

### Data Flow Architecture

```
┌─────────────┐
│   App.tsx   │ ← Root component, Redux Provider, UI controls
└──────┬──────┘
       │ creates
       ▼
┌─────────────┐
│   Engine    │ ← Simulation state (typed arrays)
│  (sim/)     │   - starPos, civPos, civAlive, civStrat
└──────┬──────┘   - step() advances simulation
       │
       │ adapted by
       ▼
┌─────────────┐
│EngineAdapter│ ← Stable interface for renderer
│  (gl/)      │   - getStar(), getCivPos(), isCivAlive()
└──────┬──────┘
       │
       │ consumed by
       ▼
┌─────────────┐
│  Scene.tsx  │ ← WebGL rendering, gesture handling
│  (gl/)      │   - Updates Three.js buffers
└─────────────┘   - Raycasting for point selection
```

### Key Components

**`src/App.tsx`**
- Root component managing engine lifecycle
- UI controls (pause, violence toggle, expansion toggle, reset)
- Connects Redux state to UI displays (FPS, stats)
- Single Engine instance persisted in ref

**`src/gl/Scene.tsx`**
- Creates and manages Three.js scene, camera, renderer
- Handles gesture controls (pan/pinch/tap)
- Exposes GLSceneHandle API for focus commands:
  - `focusCiv()`, `focusRandom()`, `home()`
  - `focusStrongest()`, `focusFrontier()`, `focusDensest()`, `focusNearest()`
  - `jumpToWorldXY()`

**`src/gl/renderer3d.ts`**
- Core render loop implementation
- Custom shaders for point clouds with distance-based sizing
- Updates geometry buffers from engine data
- Performance-critical: no allocations in hot path

**`src/gl/engineAdapter.ts`**
- Adapts any engine structure to a uniform EngineView interface
- Auto-detects interleaved vs split position arrays
- Allows renderer to work independently of engine field naming

**`src/sim/engine.ts`**
- Simulation tick logic
- Sphere expansion, star/civ spawning
- Detection mechanics with navigation error
- Kill mechanics (gated by `violence` flag)
- Uses xorshift PRNG for deterministic randomness

**`src/features/params/paramsSlice.ts`**
- Redux slice storing all simulation parameters
- Includes size limits (maxStars, maxCivs)
- Contains probabilities, growth rates, strategy mix
- Initial values define the default simulation behavior

### Performance Constraints

**Critical Rules:**
1. **No allocations in render loop** - All buffers pre-allocated as typed arrays
2. **Hermes constraint** - Never use optional chaining on LHS of assignment (`attr?.needsUpdate = true` will crash)
3. **Use helpers** - Call `markNeedsUpdate(geom, attrName)` instead of direct property access
4. **Throttle updates** - UI overlays (minimap, HUD) update at ~10 Hz, not every frame
5. **Set draw range** - Use `geometry.setDrawRange(0, count)` instead of recreating geometry

**Memory Layout:**
- Stars: `Float32Array` (3 floats per star × maxStars)
- Civs: `Float32Array` positions + `Uint8Array` strategy + `Uint8Array` alive status

## UI Components

**`src/ui/MiniMap.tsx`** - 2D top-down view (XZ plane), tap to jump to location
**`src/ui/POIBar.tsx`** - Chip buttons for quick navigation (Home, Random, etc.)
**`src/ui/CoordsHUD.tsx`** - Live camera position, orientation, and radius display
**`src/ui/AnalogStick.tsx`** - Touch controls for camera movement (left/right sticks)
**`src/ui/Vignette.tsx`** - Soft edge darkening overlay

## Points of Interest (POI)

POI strategies in `src/gl/poi.ts` implement different ways to find interesting civilizations:
- `pickStrongest()` - Highest tech level
- `pickFrontier()` - Furthest from origin
- `pickDensest()` - Most neighbors within range
- `pickNearest()` - Closest to current camera position

## Redux State

**`params`** slice (`src/features/params/paramsSlice.ts`):
- All simulation parameters (densities, probabilities, limits)
- Read once during Engine construction
- Modifiable before creating new engine instance

**`sim`** slice (`src/features/sim/simSlice.ts`):
- Runtime stats (step count, alive civs, kills, reveals, FPS)
- Updated from engine snapshot every ~15 simulation steps
- Drives UI displays in App header

## TypeScript Configuration

- Extends `expo/tsconfig.base`
- Strict mode enabled
- No emit (type checking only)
- Base URL set to project root for clean imports

## Development Workflow

1. **Type check first**: Always run `npm run typecheck` before committing
2. **Clear cache if needed**: `npx expo start -c` for metro/bundle issues
3. **Test on device**: Performance characteristics differ significantly from simulators
4. **Watch FPS**: Target 55+ FPS on modern devices with default params

## Common Modification Patterns

### Adding a New POI Strategy
1. Implement function in `src/gl/poi.ts` returning civ index or -1
2. Add method to GLSceneHandle in `src/gl/Scene.tsx`
3. Add button to POIBar items in `src/App.tsx`

### Modifying Simulation Behavior
1. Update logic in `src/sim/engine.ts` step() method
2. Ensure EngineView interface in `src/gl/types.ts` still matches
3. Test that engineAdapter still extracts data correctly
4. Verify no performance regression (check FPS)

### Adding Visual Elements
1. Create geometry/material in `src/gl/renderer3d.ts` init section
2. Update in render loop if dynamic, or add once if static
3. Store references in threeRefs for later access if needed
4. Follow pre-allocation pattern (no new objects per frame)

## Important Notes

- **Expo SDK alignment**: All Expo packages must match SDK version (currently 54)
- **Babel config**: `react-native-reanimated/plugin` MUST be last plugin in array
- **No DOM access**: React Native has no `document` or `window` globals
- **Git workflow**: Main branch is `main`, current development on `develop`
