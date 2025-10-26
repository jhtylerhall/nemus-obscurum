#!/usr/bin/env ts-node
import { writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { RayTracer } from './RayTracer.js';
import { makePlanet, makeStar } from './Shapes.js';

const width = 256;
const height = 256;

const spheres = [
  makePlanet(6.37e6, '#4f8ee6'),
  makeStar(6.96e8, '#fff2a8'),
];

const tracer = new RayTracer(width, height, spheres);
const buffer = tracer.render();
const png = new PNG({ width, height });
png.data = buffer;

const file = new URL('../../public/frame.png', import.meta.url);
writeFileSync(file, PNG.sync.write(png));
console.log(`Wrote ${file.pathname}`);
