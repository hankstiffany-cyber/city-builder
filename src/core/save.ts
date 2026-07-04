import { CONFIG } from "../config.ts";
import { Grid } from "../sim/grid.ts";
import { TileType } from "../sim/tiles.ts";

/**
 * Save-file codec. Versioned, plain-JSON, and forward-checkable: the grid is
 * stored as two flat arrays (tile-type index + growth level per cell), which
 * keeps a 100×100 city around ~50 KB — comfortably inside localStorage limits
 * and small enough to email around as a file.
 *
 * Derived state (powered, roadAccess, pollution, demand) is deliberately NOT
 * saved; the sim recomputes all of it from types + levels on load.
 */

/** Stable wire order for tile types. APPEND new types; never reorder. */
const TYPE_ORDER: TileType[] = [
  TileType.Grass,
  TileType.Water,
  TileType.Trees,
  TileType.Road,
  TileType.PowerLine,
  TileType.ZoneR,
  TileType.ZoneC,
  TileType.ZoneI,
  TileType.PowerPlant,
  TileType.Park,
  TileType.FireStation,
  TileType.PoliceStation,
  TileType.Fire,
  TileType.Rubble,
];
const TYPE_INDEX = new Map<TileType, number>(TYPE_ORDER.map((t, i) => [t, i]));

export interface SaveData {
  v: 1;
  name: string;
  money: number;
  totalDays: number;
  taxRate: number;
  /** Optional (added after v1 shipped); old saves simply re-celebrate. */
  popMilestone?: number;
  width: number;
  height: number;
  types: number[];
  levels: number[];
}

export interface SaveSource {
  cityName: string;
  money: number;
  totalDays: number;
  taxRate: number;
  popMilestone: number;
  grid: Grid;
}

export function encodeSave(src: SaveSource): SaveData {
  const types: number[] = new Array(src.grid.width * src.grid.height);
  const levels: number[] = new Array(types.length);
  src.grid.forEach((tile, x, y) => {
    const i = y * src.grid.width + x;
    types[i] = TYPE_INDEX.get(tile.type)!;
    levels[i] = tile.level;
  });
  return {
    v: 1,
    name: src.cityName,
    money: src.money,
    totalDays: src.totalDays,
    taxRate: src.taxRate,
    popMilestone: src.popMilestone,
    width: src.grid.width,
    height: src.grid.height,
    types,
    levels,
  };
}

/** Structural check for untrusted JSON (imported files, old localStorage). */
export function isSaveData(u: unknown): u is SaveData {
  if (typeof u !== "object" || u === null) return false;
  const d = u as Record<string, unknown>;
  return (
    d.v === 1 &&
    typeof d.name === "string" &&
    typeof d.money === "number" &&
    typeof d.totalDays === "number" &&
    typeof d.taxRate === "number" &&
    typeof d.width === "number" &&
    typeof d.height === "number" &&
    Array.isArray(d.types) &&
    Array.isArray(d.levels) &&
    d.types.length === d.width * d.height &&
    d.levels.length === d.types.length
  );
}

/**
 * Writes a save's tiles into `grid`. Returns false (leaving the grid alone)
 * if the dimensions don't match or any tile index is invalid — a corrupt
 * import must never half-apply.
 */
export function decodeInto(grid: Grid, data: SaveData): boolean {
  if (data.width !== grid.width || data.height !== grid.height) return false;
  for (const t of data.types) {
    if (!Number.isInteger(t) || t < 0 || t >= TYPE_ORDER.length) return false;
  }

  grid.forEach((tile, x, y) => {
    const i = y * grid.width + x;
    tile.type = TYPE_ORDER[data.types[i]];
    const lvl = data.levels[i];
    tile.level = Number.isInteger(lvl) && lvl > 0 ? Math.min(lvl, CONFIG.MAX_LEVEL) : 0;
  });
  return true;
}
