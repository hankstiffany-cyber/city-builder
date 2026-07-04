import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";

/**
 * Land value per tile in [0, 1], row-major like the pollution field. Purely
 * derived — nothing reads it back into the sim yet; it drives the heat-map
 * overlay (and later phases can tap it for desirability).
 *
 *   base + powered + road access + waterfront + trees − pollution
 */
export function computeLandValue(grid: Grid, pollution: Float32Array): Float32Array {
  const field = new Float32Array(grid.width * grid.height);

  grid.forEach((tile, x, y) => {
    let v = CONFIG.LAND_VALUE_BASE;
    if (tile.powered) v += CONFIG.LAND_VALUE_POWERED;
    if (nearType(grid, x, y, 1, TileType.Road) || tile.type === TileType.Road)
      v += CONFIG.LAND_VALUE_ROAD;
    if (nearType(grid, x, y, 2, TileType.Water)) v += CONFIG.LAND_VALUE_WATERFRONT;
    if (nearType(grid, x, y, 1, TileType.Trees)) v += CONFIG.LAND_VALUE_TREES;
    if (nearType(grid, x, y, CONFIG.PARK_RADIUS, TileType.Park)) v += CONFIG.LAND_VALUE_PARK;
    v -= pollution[y * grid.width + x] * CONFIG.LAND_VALUE_POLLUTION;
    field[y * grid.width + x] = Math.max(0, Math.min(1, v));
  });

  return field;
}

function nearType(grid: Grid, x: number, y: number, radius: number, type: TileType): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (grid.getType(x + dx, y + dy) === type) return true;
    }
  }
  return false;
}
