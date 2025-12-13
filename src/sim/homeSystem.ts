// src/sim/homeSystem.ts
// Generates the player's home star system with a star and habitable planet

export type Planet = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  orbitRadius: number;
  orbitSpeed: number;
  orbitAngle: number;
  color: string;
  isHabitable: boolean;
  population: number;
  techLevel: number;
};

export type Star = {
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  radius: number;
  color: string;
  temperature: number;
  luminosity: number;
};

export type HomeSystem = {
  star: Star;
  planets: Planet[];
  homeworld: Planet; // Reference to the habitable planet
};

function seededRandom(seed: number) {
  let s = seed | 0;
  return function () {
    s = (s * 1664525 + 1013904223) | 0;
    return ((s >>> 0) / 4294967296);
  };
}

const HOME_STAR_PROFILE = {
  temp: 5778,
  color: '#ffd27a',
  name: 'G-type Star',
};

const PLANET_COLORS = [
  '#8b7355', // Rocky brown
  '#6b8e95', // Ocean blue
  '#9b8b7a', // Desert tan
  '#5a7a6a', // Forest green
];

const PLANET_NAMES = [
  'Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'
];

export function generateHomeSystem(seed: number = Date.now()): HomeSystem {
  const rng = seededRandom(seed);

  // Generate star
  const starType = HOME_STAR_PROFILE;
  const star: Star = {
    id: 'home-star',
    name: 'Home Star',
    x: 0,
    y: 0,
    z: 0,
    radius: 5 + rng() * 3, // Star radius 5-8 units
    color: starType.color,
    temperature: starType.temp,
    luminosity: 1.0,
  };

  // Generate 3-6 planets
  const numPlanets = 3 + Math.floor(rng() * 4);
  const planets: Planet[] = [];

  // Determine which planet is habitable (typically 2nd or 3rd)
  const habitableIndex = 1 + Math.floor(rng() * 2);

  for (let i = 0; i < numPlanets; i++) {
    const orbitRadius = 20 + i * 15 + rng() * 10; // Spread planets out
    const orbitAngle = rng() * Math.PI * 2;
    const isHabitable = i === habitableIndex;

    const planet: Planet = {
      id: `planet-${i}`,
      name: PLANET_NAMES[i % PLANET_NAMES.length],
      x: Math.cos(orbitAngle) * orbitRadius,
      y: (rng() - 0.5) * 2, // Slight vertical offset
      z: Math.sin(orbitAngle) * orbitRadius,
      radius: isHabitable ? 2.5 : 1.5 + rng() * 2,
      orbitRadius,
      orbitSpeed: 0.001 + rng() * 0.002, // Radians per frame
      orbitAngle,
      color: isHabitable ? '#4a90e2' : PLANET_COLORS[Math.floor(rng() * PLANET_COLORS.length)],
      isHabitable,
      population: isHabitable ? 1000000 : 0,
      techLevel: isHabitable ? 1 : 0,
    };

    planets.push(planet);
  }

  const homeworld = planets[habitableIndex];

  return {
    star,
    planets,
    homeworld,
  };
}

// Update planet positions based on orbital mechanics
export function updateSystemOrbits(system: HomeSystem, deltaTime: number) {
  system.planets.forEach(planet => {
    planet.orbitAngle += planet.orbitSpeed * deltaTime;
    planet.x = Math.cos(planet.orbitAngle) * planet.orbitRadius;
    planet.z = Math.sin(planet.orbitAngle) * planet.orbitRadius;
  });
}
