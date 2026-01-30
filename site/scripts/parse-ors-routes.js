import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const files = [
  'c:/Users/arthu/Downloads/ors-route_1769781602597.json',
  'c:/Users/arthu/Downloads/ors-route_1769781661926.json',
  'c:/Users/arthu/Downloads/ors-route_1769781693189.json',
  'c:/Users/arthu/Downloads/ors-route_1769781755652.json',
  'c:/Users/arthu/Downloads/ors-route_1769772172913.json',
  'c:/Users/arthu/Downloads/ors-route_1769772407735.json',
  'c:/Users/arthu/Downloads/ors-route_1769782039559.json',
];

function parseOrs(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);
  const coords =
    data?.features?.[0]?.geometry?.coordinates ||
    data?.routes?.[0]?.geometry?.coordinates ||
    (data?.geometry?.coordinates) ||
    [];
  return coords.map((c) => [c[1], c[0]]); // [lon,lat] -> [lat,lon]
}

function downsample(arr, max) {
  if (arr.length <= max) return arr;
  const step = arr.length / max;
  const out = [];
  for (let i = 0; i < max; i++) {
    out.push(arr[Math.floor(i * step)]);
  }
  return out;
}

const routes = [];
for (const f of files) {
  try {
    const route = parseOrs(f);
    if (route.length > 0) routes.push(downsample(route, 150));
  } catch (e) {
    console.error(f, e.message);
  }
}

const output = path.join(__dirname, '../src/data/simulatedRoutes.json');
fs.writeFileSync(output, JSON.stringify(routes), 'utf8');
console.log('Wrote', routes.length, 'routes to', output);
