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

  // --- Economy (Phase 5) ---
  TAX_RATE_DEFAULT: 0.07, // 7%
  TAX_RATE_MAX: 0.2,
  TAX_REVENUE_PER_POP: 10, // $/resident/month at a 100% tax rate
  TAX_DEMAND_SENSITIVITY: 6, // how hard rates above/below default swing demand

  // --- Pollution & land value (Phase 5) ---
  POLLUTION_RADIUS: 4, // tiles a source's plume reaches (linear falloff)
  POLLUTION_PLANT: 1.0, // emission strength of a power plant
  POLLUTION_PER_I_LEVEL: [0.15, 0.3, 0.45, 0.65], // industrial emission by level
  R_POLLUTION_SENSITIVITY: 1.2, // growth-odds penalty per unit of pollution
  LAND_VALUE_BASE: 0.3,
  LAND_VALUE_POWERED: 0.1,
  LAND_VALUE_ROAD: 0.15,
  LAND_VALUE_WATERFRONT: 0.2, // water within 2 tiles
  LAND_VALUE_TREES: 0.1, // trees within 1 tile
  LAND_VALUE_POLLUTION: 0.6, // subtracted per unit of pollution

  // --- Parks (Phase 8) ---
  PARK_RADIUS: 2, // tiles a park's benefits reach
  PARK_GROWTH_BONUS: 0.3, // extra residential growth odds near a park
  LAND_VALUE_PARK: 0.15,

  // --- Advisor messages (Phase 8) ---
  ADVISOR_COOLDOWN_TICKS: 26, // ~6 months before the same advice repeats
  POLLUTED_R_THRESHOLD: 0.35, // pollution level that counts as "homes suffering"
  MILESTONES: [100, 250, 500, 1_000, 2_500, 5_000, 10_000, 25_000],
  TOAST_MS: 6_500, // how long a message stays on screen
  MAX_TOASTS: 3,

  // --- Services & disasters (Phase 8) ---
  STATION_COVERAGE_RADIUS: 8, // fire/police reach (Chebyshev, linear falloff)
  STATION_UPKEEP: 15, // $/month per station, deducted on tax day
  FIRE_RISK_PER_TILE: 0.000005, // ignition odds per flammable built tile per tick
  FIRE_RISK_CAP: 0.02,
  FIRE_SPREAD_CHANCE: 0.22, // per burning neighbour per tick, scaled by coverage
  FIRE_BURNOUT_CHANCE: 0.1, // base chance a fire dies to rubble each tick
  FIRE_BURNOUT_COVERAGE_BONUS: 0.4, // extra burnout odds at full fire coverage
  CRIME_R_PER_LEVEL: 0.05, // crime emitted per residential level
  CRIME_C_PER_LEVEL: 0.09, // shops attract the most trouble
  CRIME_I_PER_LEVEL: 0.04,
  CRIME_RADIUS: 3,
  LAND_VALUE_CRIME: 0.45, // subtracted per unit of crime
  C_CRIME_SENSITIVITY: 1.0, // commercial growth penalty per unit of crime

  // --- Atmosphere & ambient life (Phase 8 polish) ---
  DAY_NIGHT_TICKS: 240, // sim ticks per full day/night cycle (~2.8 min at ▶)
  NIGHT_MAX_DARKNESS: 0.34, // screen dim at deepest night
  CAR_SPEED: 1.5, // tiles per second
  MAX_CARS: 24,
  TRAFFIC_PER_POP: 0.05, // one car per 20 residents

  // --- Persistence & new game (Phase 7) ---
  SAVE_KEY: "city-builder-save-v1", // localStorage slot
  AUTOSAVE_MS: 15_000,
  DIFFICULTY_MONEY: { easy: 20_000, normal: 12_000, hard: 6_000 },
  DEFAULT_CITY_NAME: "New City",

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
  park: 30,
  fire_station: 500,
  police_station: 500,
};
