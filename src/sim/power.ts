import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType, carriesTraffic, conductsPower, isZone } from "./tiles.ts";

/**
 * Phase 3 connectivity sims. Both passes are full recomputes — a 100×100 grid
 * is 10k tiles, so recomputing on every successful build is far cheaper than
 * tracking incremental invalidation, and it can never go stale.
 */

/**
 * Flood-fills power from every power plant through orthogonally-adjacent
 * conducting tiles (roads, power lines, zones, plants) and writes the result
 * to `tile.powered`. Everything else (grass, water, trees) blocks the flow.
 */
export function recomputePower(grid: Grid): void {
  const stack: number[] = []; // packed x + y * width, avoids object churn
  grid.forEach((tile, x, y) => {
    tile.powered = tile.type === TileType.PowerPlant;
    if (tile.powered) stack.push(x + y * grid.width);
  });

  while (stack.length > 0) {
    const packed = stack.pop()!;
    const x = packed % grid.width;
    const y = (packed - x) / grid.width;
    visit(x - 1, y);
    visit(x + 1, y);
    visit(x, y - 1);
    visit(x, y + 1);
  }

  function visit(x: number, y: number): void {
    const tile = grid.get(x, y);
    if (tile && !tile.powered && conductsPower(tile.type)) {
      tile.powered = true;
      stack.push(x + y * grid.width);
    }
  }
}

/**
 * Marks each zone tile with whether a road lies within `radius` tiles
 * (Chebyshev distance — a square scan, matching classic SimCity's feel).
 * Non-zone tiles always read false.
 */
export function recomputeRoadAccess(
  grid: Grid,
  radius: number = CONFIG.ROAD_ACCESS_RADIUS
): void {
  grid.forEach((tile, x, y) => {
    tile.roadAccess = isZone(tile.type) && hasRoadNear(grid, x, y, radius);
  });
}

function hasRoadNear(grid: Grid, x: number, y: number, radius: number): boolean {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const t = grid.getType(x + dx, y + dy);
      if (t !== undefined && carriesTraffic(t)) return true;
    }
  }
  return false;
}

/** One call for everything that must refresh after the world changes. */
export function recomputeConnectivity(grid: Grid): void {
  recomputePower(grid);
  recomputeRoadAccess(grid);
}
