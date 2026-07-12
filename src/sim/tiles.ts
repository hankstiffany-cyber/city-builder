/**
 * Tile taxonomy. A tile's `type` is the single source of truth for what
 * occupies a cell. Terrain types (grass/water/trees) are the base layer;
 * building types replace them. Extra per-tile values (powered, land value,
 * pollution...) get added to the Tile record as later phases need them.
 */
export enum TileType {
  // --- Terrain ---
  Grass = "grass",
  Water = "water",
  Trees = "trees",
  // --- Built ---
  Road = "road",
  Bridge = "bridge",
  PowerLine = "powerline",
  ZoneR = "zone_r",
  ZoneC = "zone_c",
  ZoneI = "zone_i",
  PowerPlant = "power_plant",
  Park = "park",
  FireStation = "fire_station",
  PoliceStation = "police_station",
  // --- Transient states ---
  Fire = "fire",
  Rubble = "rubble",
}

export interface Tile {
  type: TileType;
  /** Set by the power flood-fill in `sim/power.ts` after every world change. */
  powered: boolean;
  /** True for zones with a road within CONFIG.ROAD_ACCESS_RADIUS tiles. */
  roadAccess: boolean;
  /**
   * Zone development stage, 0 (empty lot) to CONFIG.MAX_LEVEL (dense).
   * Driven by `sim/growth.ts`; always 0 for non-zone tiles.
   */
  level: number;
}

/** Terrain tiles are the natural ground; anything else was built by the player. */
const TERRAIN = new Set<TileType>([
  TileType.Grass,
  TileType.Water,
  TileType.Trees,
]);

export function isTerrain(type: TileType): boolean {
  return TERRAIN.has(type);
}

/** Water can't be built on (no terraforming); fires must burn out first. */
export function isBuildable(type: TileType): boolean {
  return type !== TileType.Water && type !== TileType.Fire;
}

const ZONES = new Set<TileType>([TileType.ZoneR, TileType.ZoneC, TileType.ZoneI]);

export function isZone(type: TileType): boolean {
  return ZONES.has(type);
}

/** Tiles that carry power onward (Phase 3 flood-fill will use this). */
export function conductsPower(type: TileType): boolean {
  return (
    type === TileType.PowerLine ||
    type === TileType.Road ||
    type === TileType.Bridge ||
    type === TileType.PowerPlant ||
    type === TileType.FireStation ||
    type === TileType.PoliceStation ||
    isZone(type)
  );
}

const FLAMMABLE = new Set<TileType>([
  TileType.Trees,
  TileType.Park,
  TileType.ZoneR,
  TileType.ZoneC,
  TileType.ZoneI,
  TileType.PowerLine,
  TileType.PowerPlant,
  TileType.FireStation,
  TileType.PoliceStation,
]);

/** What a fire can ignite. Grass, roads, water, and rubble are firebreaks. */
export function isFlammable(type: TileType): boolean {
  return FLAMMABLE.has(type);
}

/** Road-like tiles: carry cars and satisfy zones' road-access requirement. */
export function carriesTraffic(type: TileType): boolean {
  return type === TileType.Road || type === TileType.Bridge;
}
