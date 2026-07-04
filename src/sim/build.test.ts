import { describe, it, expect } from "vitest";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { applyTool } from "./build.ts";
import { TOOL_COST } from "../config.ts";

function grassGrid(): Grid {
  return new Grid(5, 5); // all grass by default
}

describe("applyTool", () => {
  it("builds a road on grass and charges its cost", () => {
    const g = grassGrid();
    const out = applyTool(g, "road", 1, 1, 1000);
    expect(out).toEqual({ ok: true, cost: TOOL_COST.road });
    expect(g.getType(1, 1)).toBe(TileType.Road);
  });

  it("refuses to build on water", () => {
    const g = grassGrid();
    g.setType(2, 2, TileType.Water);
    const out = applyTool(g, "zone_r", 2, 2, 1000);
    expect(out).toEqual({ ok: false, reason: "water" });
    expect(g.getType(2, 2)).toBe(TileType.Water);
  });

  it("refuses to build when the player cannot afford it", () => {
    const g = grassGrid();
    const out = applyTool(g, "power_plant", 0, 0, 10);
    expect(out).toEqual({ ok: false, reason: "no_money" });
    expect(g.getType(0, 0)).toBe(TileType.Grass);
  });

  it("won't overwrite existing infrastructure without bulldozing first", () => {
    const g = grassGrid();
    g.setType(0, 0, TileType.Road);
    const out = applyTool(g, "zone_c", 0, 0, 1000);
    expect(out.ok).toBe(false);
    expect(g.getType(0, 0)).toBe(TileType.Road);
  });

  it("bulldozes trees and infrastructure back to grass", () => {
    const g = grassGrid();
    g.setType(1, 1, TileType.Trees);
    g.setType(2, 2, TileType.Road);
    expect(applyTool(g, "bulldoze", 1, 1, 100).ok).toBe(true);
    expect(g.getType(1, 1)).toBe(TileType.Grass);
    expect(applyTool(g, "bulldoze", 2, 2, 100).ok).toBe(true);
    expect(g.getType(2, 2)).toBe(TileType.Grass);
  });

  it("bulldozing bare grass or water is a no-op", () => {
    const g = grassGrid();
    expect(applyTool(g, "bulldoze", 0, 0, 100)).toEqual({
      ok: false,
      reason: "nothing_to_do",
    });
    g.setType(3, 3, TileType.Water);
    expect(applyTool(g, "bulldoze", 3, 3, 100)).toEqual({ ok: false, reason: "water" });
  });

  it("the pan tool never builds", () => {
    const g = grassGrid();
    expect(applyTool(g, "pan", 0, 0, 1000).ok).toBe(false);
  });

  it("reports out of bounds", () => {
    const g = grassGrid();
    expect(applyTool(g, "road", 99, 99, 1000)).toEqual({
      ok: false,
      reason: "out_of_bounds",
    });
  });
});
