/**
 * Central tuning file. Keep ALL magic numbers here so balancing the game
 * (costs, sizes, speeds) never means hunting through logic. See PLAN.md §7.
 */
export const CONFIG = {
  // --- Map ---
  MAP_WIDTH: 100,
  MAP_HEIGHT: 100,

  // --- Rendering ---
  BASE_TILE_SIZE: 32, // pixel size of a tile at zoom = 1
  MIN_ZOOM: 0.35,
  MAX_ZOOM: 3,
  ZOOM_STEP: 1.1, // wheel notch multiplier

  // --- Economy ---
  STARTING_MONEY: 20_000,

  // --- Power & connectivity (Phase 3) ---
  ROAD_ACCESS_RADIUS: 3, // zones need a road within this many tiles (Chebyshev)
  NO_POWER_BLINK_MS: 600, // full on/off cycle of the no-power indicator

  // --- Simulation tick (Phase 4) ---
  TICK_MS: { slow: 700, fast: 175 }, // real ms per sim tick at each speed
  MAX_TICKS_PER_FRAME: 4, // cap catch-up after a background-tab stall
  DAYS_PER_TICK: 7, // in-game days that pass each tick

  // --- Zone growth (Phase 4) ---
  MAX_LEVEL: 3, // empty lot → small → medium → dense
  GROW_CHANCE: 0.18, // per-tick chance, scaled by demand, for an eligible zone
  DECAY_CHANCE: 0.06, // per-tick chance an unpowered/unreachable zone shrinks

  // --- RCI demand model (Phase 4) ---
  POP_PER_LEVEL: [0, 8, 20, 40], // residents per R zone at each level
  JOBS_PER_C_LEVEL: [0, 6, 14, 28], // jobs per C zone at each level
  JOBS_PER_I_LEVEL: [0, 8, 18, 36], // jobs per I zone at each level
  WORKFORCE_RATIO: 0.6, // fraction of population seeking jobs
  SHOPS_PER_POP: 0.22, // commercial jobs the city supports per resident
  FACTORY_PER_POP: 0.28, // industrial jobs the city supports per resident
  BASE_R_DEMAND: 25, // settlers arrive even before there are jobs
  BASE_I_DEMAND: 12, // external/export demand keeps early industry viable
  DEMAND_SCALE: 60, // raw demand units that map to 100% on the RCI meter

  // --- Terrain generation ---
  WATER_LEVEL: 0.32, // noise below this becomes water
  TREE_LOW: 0.62, // noise band [TREE_LOW, TREE_HIGH] becomes trees
  TREE_HIGH: 0.72,
  DEFAULT_SEED: 1337,
} as const;

/** Build/demolish cost per tile for each tool, in dollars. */
export const TOOL_COST: Record<string, number> = {
  bulldoze: 1,
  road: 10,
  powerline: 5,
  zone_r: 100,
  zone_c: 100,
  zone_i: 100,
  power_plant: 3_000,
};
