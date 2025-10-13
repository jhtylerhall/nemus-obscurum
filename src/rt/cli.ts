import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RayTracer } from './RayTracer.ts';

async function main(): Promise<void> {
  const tracer = new RayTracer();
  const width = 128;
  const height = 128;
  const buffer = tracer.render(width, height);
  const header = `P3\n${width} ${height}\n255\n`;
  let body = '';
  for (let i = 0; i < buffer.length; i += 4) {
    body += `${buffer[i + 0]} ${buffer[i + 1]} ${buffer[i + 2]}\n`;
  }
  const output = header + body;
  const file = resolve(process.cwd(), 'rt-output.ppm');
  writeFileSync(file, output, 'utf8');
  console.log(`Wrote ${file}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
