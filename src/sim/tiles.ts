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
  PowerLine = "powerline",
  ZoneR = "zone_r",
  ZoneC = "zone_c",
  ZoneI = "zone_i",
  PowerPlant = "power_plant",
}

export interface Tile {
  type: TileType;
  /** Set by the power flood-fill in `sim/power.ts` after every world change. */
  powered: boolean;
  /** True for zones with a road within CONFIG.ROAD_ACCESS_RADIUS tiles. */
  roadAccess: boolean;
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

/** Water cannot be built on or bulldozed in v1 (no terraforming). */
export function isBuildable(type: TileType): boolean {
  return type !== TileType.Water;
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
    type === TileType.PowerPlant ||
    isZone(type)
  );
}
