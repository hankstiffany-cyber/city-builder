import { TOOL_COST } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType, isBuildable, isTerrain } from "./tiles.ts";

/** Every tool the player can hold. `pan` is navigation-only (no placement). */
export type Tool =
  | "pan"
  | "bulldoze"
  | "road"
  | "powerline"
  | "zone_r"
  | "zone_c"
  | "zone_i"
  | "power_plant"
  | "park"
  | "fire_station"
  | "police_station";

/** The tile type a build tool paints. `pan`/`bulldoze` return null. */
export function toolTileType(tool: Tool): TileType | null {
  switch (tool) {
    case "road":
      return TileType.Road;
    case "powerline":
      return TileType.PowerLine;
    case "zone_r":
      return TileType.ZoneR;
    case "zone_c":
      return TileType.ZoneC;
    case "zone_i":
      return TileType.ZoneI;
    case "power_plant":
      return TileType.PowerPlant;
    case "park":
      return TileType.Park;
    case "fire_station":
      return TileType.FireStation;
    case "police_station":
      return TileType.PoliceStation;
    case "pan":
    case "bulldoze":
      return null;
  }
}

export type BuildOutcome =
  | { ok: true; cost: number }
  | { ok: false; reason: "out_of_bounds" | "water" | "nothing_to_do" | "no_money" };

/**
 * Attempts to apply `tool` at (x, y) given available `money`. Pure: it mutates
 * the grid on success and reports the cost, but never touches money itself —
 * the caller (Game) owns the wallet. Returns why it failed otherwise.
 */
export function applyTool(
  grid: Grid,
  tool: Tool,
  x: number,
  y: number,
  money: number
): BuildOutcome {
  if (!grid.inBounds(x, y)) return { ok: false, reason: "out_of_bounds" };
  if (tool === "pan") return { ok: false, reason: "nothing_to_do" };

  const current = grid.getType(x, y)!;
  const cost = TOOL_COST[tool] ?? 0;

  if (tool === "bulldoze") {
    // Water can't be terraformed; already-bare grass is nothing to do.
    if (current === TileType.Water) return { ok: false, reason: "water" };
    if (current === TileType.Fire) return { ok: false, reason: "nothing_to_do" };
    if (current === TileType.Grass) return { ok: false, reason: "nothing_to_do" };
    if (money < cost) return { ok: false, reason: "no_money" };
    grid.setType(x, y, TileType.Grass);
    return { ok: true, cost };
  }

  // Build tools:
  const target = toolTileType(tool)!;
  if (!isBuildable(current)) return { ok: false, reason: "water" };
  if (current === target) return { ok: false, reason: "nothing_to_do" };
  // Only build over natural terrain; force a bulldoze before overwriting
  // existing infrastructure. Keeps accidental paint-overs from costing money.
  if (!isTerrain(current)) return { ok: false, reason: "nothing_to_do" };
  if (money < cost) return { ok: false, reason: "no_money" };

  grid.setType(x, y, target);
  return { ok: true, cost };
}
