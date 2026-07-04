import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType, isFlammable } from "./tiles.ts";

export interface FireResult {
  ignited: number;
  spread: number;
  burnedOut: number;
  /** True if the grid changed at all — the caller must recompute power etc. */
  changed: boolean;
}

/**
 * One fire pass. Three phases against the state captured at entry:
 *
 *  1. Random ignition — odds scale with how much flammable stuff is built
 *     (bigger city, more fires), and fire coverage at the chosen tile can
 *     prevent the outbreak entirely.
 *  2. Spread — every burning tile rolls against each flammable orthogonal
 *     neighbour, damped by the fire coverage AT THE TARGET tile.
 *  3. Burnout — burning tiles collapse into rubble; coverage speeds this up
 *     (the department contains what it couldn't prevent).
 *
 * `rand` is injectable for deterministic tests.
 */
export function fireTick(
  grid: Grid,
  fireCoverage: Float32Array,
  rand: () => number = Math.random
): FireResult {
  const fires: number[] = [];
  const flammables: number[] = [];
  grid.forEach((tile, x, y) => {
    const i = y * grid.width + x;
    if (tile.type === TileType.Fire) fires.push(i);
    else if (isFlammable(tile.type)) flammables.push(i);
  });

  const result: FireResult = { ignited: 0, spread: 0, burnedOut: 0, changed: false };

  // 1. Random ignition.
  const risk = Math.min(CONFIG.FIRE_RISK_CAP, flammables.length * CONFIG.FIRE_RISK_PER_TILE);
  if (flammables.length > 0 && rand() < risk) {
    const i = flammables[Math.floor(rand() * flammables.length)];
    if (rand() >= fireCoverage[i]) {
      grid.setType(i % grid.width, Math.floor(i / grid.width), TileType.Fire);
      result.ignited++;
    }
  }

  // 2 + 3. Spread from and burn out the fires that existed at entry.
  for (const i of fires) {
    const x = i % grid.width;
    const y = (i - x) / grid.width;
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]] as const) {
      const nx = x + dx;
      const ny = y + dy;
      const t = grid.getType(nx, ny);
      if (t === undefined || !isFlammable(t)) continue;
      const ni = ny * grid.width + nx;
      if (rand() < CONFIG.FIRE_SPREAD_CHANCE * (1 - fireCoverage[ni])) {
        grid.setType(nx, ny, TileType.Fire);
        result.spread++;
      }
    }
    const burnout =
      CONFIG.FIRE_BURNOUT_CHANCE + CONFIG.FIRE_BURNOUT_COVERAGE_BONUS * fireCoverage[i];
    if (rand() < burnout) {
      grid.setType(x, y, TileType.Rubble);
      result.burnedOut++;
    }
  }

  result.changed = result.ignited + result.spread + result.burnedOut > 0;
  return result;
}
