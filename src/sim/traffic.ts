import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { carriesTraffic, isZone } from "./tiles.ts";

/**
 * Traffic load per road/bridge tile, row-major in [0, 1]. Every developed
 * zone loads its trips onto all road tiles within TRAFFIC_RADIUS (linear
 * falloff), normalised by TRAFFIC_SCALE. Dense districts saturate their
 * streets; a lone cottage barely registers.
 *
 * Non-road tiles are always 0 — use `roadsideTraffic` for a lot's exposure.
 */
export function computeTraffic(grid: Grid): Float32Array {
  const field = new Float32Array(grid.width * grid.height);
  const radius = CONFIG.TRAFFIC_RADIUS;

  grid.forEach((tile, x, y) => {
    if (!isZone(tile.type) || tile.level === 0) return;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        const t = grid.getType(nx, ny);
        if (t === undefined || !carriesTraffic(t)) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        field[ny * grid.width + nx] += (tile.level * (1 - dist / (radius + 1))) / CONFIG.TRAFFIC_SCALE;
      }
    }
  });

  for (let i = 0; i < field.length; i++) {
    if (field[i] > 1) field[i] = 1;
  }
  return field;
}

/** Worst traffic on any orthogonally adjacent road — a lot's noise exposure. */
export function roadsideTraffic(
  grid: Grid,
  traffic: Float32Array,
  x: number,
  y: number
): number {
  let worst = 0;
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
    if (!grid.inBounds(x + dx, y + dy)) continue;
    const v = traffic[(y + dy) * grid.width + (x + dx)];
    if (v > worst) worst = v;
  }
  return worst;
}
