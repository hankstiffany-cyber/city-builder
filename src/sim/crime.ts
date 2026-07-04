import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";

/**
 * Crime field, row-major in [0, 1]. Developed zones emit trouble in a small
 * plume (commercial most, industry least); police coverage is subtracted
 * point-for-point, so a well-placed station flattens whole neighbourhoods.
 */
export function computeCrime(grid: Grid, policeCoverage: Float32Array): Float32Array {
  const field = new Float32Array(grid.width * grid.height);
  const radius = CONFIG.CRIME_RADIUS;

  grid.forEach((tile, x, y) => {
    let strength = 0;
    if (tile.type === TileType.ZoneR) strength = CONFIG.CRIME_R_PER_LEVEL * tile.level;
    else if (tile.type === TileType.ZoneC) strength = CONFIG.CRIME_C_PER_LEVEL * tile.level;
    else if (tile.type === TileType.ZoneI) strength = CONFIG.CRIME_I_PER_LEVEL * tile.level;
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
    const v = field[i] - policeCoverage[i];
    field[i] = v < 0 ? 0 : v > 1 ? 1 : v;
  }
  return field;
}
