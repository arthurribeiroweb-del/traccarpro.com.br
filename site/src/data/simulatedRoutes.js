/**
 * Rotas fictícias para simulação — quilômetros por ruas (grid).
 * ~0.0001° ≈ 11 m. Pontos em sequência simulando trajeto por ruas.
 */

const delta = 0.0001; // ~11 m entre pontos
const pts = (n) => n;

function seg(start, dir, count) {
  const out = [];
  let [lat, lon] = [...start];
  const d = { n: [delta, 0], s: [-delta, 0], e: [0, delta], w: [0, -delta] }[dir];
  for (let i = 0; i < count; i++) {
    lat += d[0];
    lon += d[1];
    out.push([lat, lon]);
  }
  return { points: out, end: [lat, lon] };
}

function buildRoute(start, legs, loopBack = true) {
  const route = [];
  let cur = [...start];
  for (const { dir, count } of legs) {
    const { points, end } = seg(cur, dir, count);
    route.push(...points);
    cur = end;
  }
  if (loopBack && route.length > 0) {
    const [slat, slon] = start;
    const [elat, elon] = cur;
    const n = 80;
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      route.push([elat + (slat - elat) * t, elon + (slon - elon) * t]);
    }
  }
  return route;
}

// Hero: trajeto longo (~4–5 km), várias ruas
const heroStart = [-23.5485, -46.638];
export const heroRoute = buildRoute(heroStart, [
  { dir: 'n', count: pts(55) },
  { dir: 'e', count: pts(50) },
  { dir: 's', count: pts(55) },
  { dir: 'e', count: pts(45) },
  { dir: 'n', count: pts(50) },
  { dir: 'w', count: pts(55) },
  { dir: 'n', count: pts(40) },
  { dir: 'w', count: pts(50) },
  { dir: 's', count: pts(90) },
  { dir: 'w', count: pts(45) },
  { dir: 's', count: pts(40) },
  { dir: 'e', count: pts(95) },
  { dir: 's', count: pts(30) },
  { dir: 'e', count: pts(40) },
  { dir: 'n', count: pts(70) },
  { dir: 'w', count: pts(50) },
  { dir: 'n', count: pts(35) },
  { dir: 'w', count: pts(45) },
  { dir: 's', count: pts(75) },
  { dir: 'e', count: pts(100) },
]);

