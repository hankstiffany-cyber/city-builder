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
