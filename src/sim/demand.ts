import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";

/** Aggregate counts the demand model (and the HUD) read each tick. */
export interface CityStats {
  population: number;
  shopJobs: number;
  factoryJobs: number;
}

/** RCI demand, each normalised to [0, 1] for the growth roll and the HUD meter. */
export interface Demand {
  r: number;
  c: number;
  i: number;
}

export function computeStats(grid: Grid): CityStats {
  let population = 0;
  let shopJobs = 0;
  let factoryJobs = 0;
  grid.forEach((tile) => {
    if (tile.type === TileType.ZoneR) population += CONFIG.POP_PER_LEVEL[tile.level];
    else if (tile.type === TileType.ZoneC) shopJobs += CONFIG.JOBS_PER_C_LEVEL[tile.level];
    else if (tile.type === TileType.ZoneI) factoryJobs += CONFIG.JOBS_PER_I_LEVEL[tile.level];
  });
  return { population, shopJobs, factoryJobs };
}

/**
 * A deliberately small feedback loop (SimCity-1989 in spirit):
 *
 *   R — people move in for jobs (plus a base settler pull so an empty map
 *       can bootstrap), and stop coming when workers outnumber jobs.
 *   C — shops follow rooftops: demand scales with population and saturates
 *       as commercial capacity catches up.
 *   I — factories follow the workforce plus a fixed export demand, so early
 *       industry is viable before the city can support shops.
 */
export function computeDemand(stats: CityStats): Demand {
  const jobs = stats.shopJobs + stats.factoryJobs;
  const workforce = stats.population * CONFIG.WORKFORCE_RATIO;
  return {
    r: clamp01((jobs + CONFIG.BASE_R_DEMAND - workforce) / CONFIG.DEMAND_SCALE),
    c: clamp01((stats.population * CONFIG.SHOPS_PER_POP - stats.shopJobs) / CONFIG.DEMAND_SCALE),
    i: clamp01(
      (stats.population * CONFIG.FACTORY_PER_POP - stats.factoryJobs + CONFIG.BASE_I_DEMAND) /
        CONFIG.DEMAND_SCALE
    ),
  };
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}
