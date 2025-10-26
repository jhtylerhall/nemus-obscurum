# Dark Forest Homeworld

A Vite + TypeScript playground for building out the "Dark Forest" homeworld simulation. The runtime renders a planet, star and o
rbits in Three.js while a lightweight civ simulation drives the visuals. An optional CPU ray tracer can output offline frames fo
r testing materials and lighting.

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- npm

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

This launches Vite with hot module reloading at `http://localhost:5173` and opens a browser window automatically.

### Production Build

```bash
npm run build
npm run preview
```

### Offline Ray Trace

```bash
npm run rt:frame
```

This renders a simple PNG into `public/frame.png` using the CPU ray tracer prototype.

## Project Structure

```
src/
  main.ts                # Bootstraps the App orchestrator
  core/                  # Renderer, camera rig, lighting, timekeeping
  render/                # Scene primitives, materials and shaders
  sim/                   # Civ state update loops and procedural opponents
  spatial/               # Octree + BVH spatial acceleration stubs
  ui/                    # Heads-up display and control panels
  save/                  # Snapshot persistence helpers
  rt/                    # Offline ray tracer implementation
public/
  ui/                    # Icons and cursor assets (placeholders)
```

## Tech Stack

- [Three.js](https://threejs.org/) for real-time rendering
- [Zustand](https://github.com/pmndrs/zustand) placeholder for future state management
- [Vite](https://vitejs.dev/) for bundling and dev server
- TypeScript throughout the codebase

## Milestones

1. **First light** – orbit camera, planet sphere, directional light.
2. **Atmosphere** – halo mesh, moon + orbit trails.
3. **Civ growth** – simulation feeds city light intensity.
4. **Aid/Strike UI** – action buttons that trigger sim events.
5. **Spatial structures** – octree + BVH for culling and ray tracing.
6. **Offline ray tracing** – CPU renderer outputting PNG frames.

## License

Licensed under the [Apache 2.0](LICENSE) license.
