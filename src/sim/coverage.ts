import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";

/**
 * Service coverage field for one station type, row-major in [0, 1]. Each
 * POWERED station projects 1.0 at itself falling linearly to 0 at
 * STATION_COVERAGE_RADIUS; overlapping stations take the max, not the sum —
 * two engines can't put out a fire twice.
 *
 * Unpowered stations contribute nothing: keep the lights on at the firehouse.
 */
export function computeCoverage(
  grid: Grid,
  stationType: TileType,
  radius: number = CONFIG.STATION_COVERAGE_RADIUS
): Float32Array {
  const field = new Float32Array(grid.width * grid.height);
  grid.forEach((tile, x, y) => {
    if (tile.type !== stationType || !tile.powered) return;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!grid.inBounds(nx, ny)) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        const v = 1 - dist / (radius + 1);
        const i = ny * grid.width + nx;
        if (v > field[i]) field[i] = v;
      }
    }
  });
  return field;
}
