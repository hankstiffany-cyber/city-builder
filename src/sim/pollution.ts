import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";

/**
 * Pollution field, row-major Float32Array (index = y * width + x), each cell
 * clamped to [0, 1]. Industrial zones emit by level; power plants emit a fixed
 * plume. Emission spreads with linear falloff over Chebyshev distance, and
 * overlapping plumes add up.
 */
export function computePollution(grid: Grid): Float32Array {
  const field = new Float32Array(grid.width * grid.height);
  const radius = CONFIG.POLLUTION_RADIUS;

  grid.forEach((tile, x, y) => {
    let strength = 0;
    if (tile.type === TileType.ZoneI) strength = CONFIG.POLLUTION_PER_I_LEVEL[tile.level];
    else if (tile.type === TileType.PowerPlant) strength = CONFIG.POLLUTION_PLANT;
    if (strength <= 0) return;

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (!grid.inBounds(nx, ny)) continue;
        const dist = Math.max(Math.abs(dx), Math.abs(dy));
        field[ny * grid.width + nx] += strength * (1 - dist / (radius + 1));
      }
    }
  });

  for (let i = 0; i < field.length; i++) {
    if (field[i] > 1) field[i] = 1;
  }
  return field;
}
