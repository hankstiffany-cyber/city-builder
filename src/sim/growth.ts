import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType, isZone } from "./tiles.ts";
import type { Demand } from "./demand.ts";

export interface GrowthResult {
  grew: number;
  decayed: number;
}

/**
 * One growth pass over the map. A zone that is powered AND road-connected
 * rolls to gain a level, with the odds scaled by demand for its zone type —
 * high demand fills lots fast, zero demand freezes them. A zone that has
 * lost power or road access slowly decays back toward an empty lot instead.
 *
 * Residential desirability also suffers from pollution: the growth odds are
 * multiplied by (1 − pollution × R_POLLUTION_SENSITIVITY), so homes next to
 * heavy industry or the power plant fill in slowly or not at all.
 *
 * `rand` is injectable so tests are deterministic; the game passes the
 * default Math.random.
 */
export function growthTick(
  grid: Grid,
  demand: Demand,
  rand: () => number = Math.random,
  pollution?: Float32Array
): GrowthResult {
  let grew = 0;
  let decayed = 0;

  grid.forEach((tile, x, y) => {
    if (!isZone(tile.type)) return;

    let d =
      tile.type === TileType.ZoneR ? demand.r : tile.type === TileType.ZoneC ? demand.c : demand.i;

    if (tile.type === TileType.ZoneR && pollution) {
      const p = pollution[y * grid.width + x];
      d *= Math.max(0, 1 - p * CONFIG.R_POLLUTION_SENSITIVITY);
    }

    if (tile.powered && tile.roadAccess) {
      if (tile.level < CONFIG.MAX_LEVEL && d > 0 && rand() < CONFIG.GROW_CHANCE * d) {
        tile.level++;
        grew++;
      }
    } else if (tile.level > 0 && rand() < CONFIG.DECAY_CHANCE) {
      tile.level--;
      decayed++;
    }
  });

  return { grew, decayed };
}
