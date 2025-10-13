# Dark Forest Homeworld

A desktop/web prototype of a “Dark Forest” homeworld viewer built with Vite, TypeScript, and Three.js. The app renders a stylised planet, star, and orbiting artifacts while a lightweight civilisation simulation drives the visuals. An optional CPU ray tracer can render an offline frame for experimentation.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
pnpm install
```

### Development Server

```bash
pnpm dev
```

Vite opens the app in your browser at `http://localhost:5173` with hot module reloading.

### Production Build

```bash
pnpm build
pnpm preview
```

### Offline Ray-Tracer

```bash
pnpm rt:frame
```

This command writes a `rt-output.ppm` file containing a simple ray-traced render.

## Project Layout

```
dark-forest-homeworld/
├─ public/
│  └─ ui/
├─ src/
│  ├─ core/              # App orchestration, camera rig, timing helpers
│  ├─ render/            # Three.js meshes, materials, shaders
│  ├─ sim/               # Civ simulation, events, orbital helpers
│  ├─ spatial/           # Octree + BVH data structures
│  ├─ ui/                # HUD overlays and DOM panels
│  ├─ save/              # Snapshot schema + persistence helpers
│  └─ rt/                # Offline CPU ray tracer utilities
└─ vite.config.ts
```

## Milestones

1. **First light** – orbit camera, star + planet render, simulation loop.
2. **Atmosphere & orbits** – halo shell, orbit visualisers, moon proxies.
3. **Civ feedback** – HUD + energy driven material tweaks.
4. **Actions UI** – aid/strike controls wired to the civ model.
5. **Spatial structures** – octree & BVH scaffolding for visibility queries.
6. **Offline rendering** – CPU ray-tracer output via `pnpm rt:frame`.

## License

Licensed under the [Apache 2.0](LICENSE) license.
