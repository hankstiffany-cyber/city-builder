import { describe, it, expect } from "vitest";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { generateTerrain } from "./terrain.ts";

function tally(g: Grid): Record<string, number> {
  const counts: Record<string, number> = {};
  g.forEach((t) => {
    counts[t.type] = (counts[t.type] ?? 0) + 1;
  });
  return counts;
}

describe("generateTerrain", () => {
  it("is deterministic for a given seed", () => {
    const a = new Grid(40, 40);
    const b = new Grid(40, 40);
    generateTerrain(a, 42);
    generateTerrain(b, 42);
    let mismatches = 0;
    a.forEach((t, x, y) => {
      if (t.type !== b.getType(x, y)) mismatches++;
    });
    expect(mismatches).toBe(0);
  });

  it("produces different maps for different seeds", () => {
    const a = new Grid(40, 40);
    const b = new Grid(40, 40);
    generateTerrain(a, 1);
    generateTerrain(b, 2);
    let mismatches = 0;
    a.forEach((t, x, y) => {
      if (t.type !== b.getType(x, y)) mismatches++;
    });
    expect(mismatches).toBeGreaterThan(0);
  });

  it("only ever paints terrain types", () => {
    const g = new Grid(50, 50);
    generateTerrain(g, 7);
    const allowed = new Set([TileType.Grass, TileType.Water, TileType.Trees]);
    g.forEach((t) => expect(allowed.has(t.type)).toBe(true));
  });

  it("includes some grass and some water on a typical seed", () => {
    const g = new Grid(80, 80);
    generateTerrain(g, CONFIG_SEED);
    const counts = tally(g);
    expect(counts[TileType.Grass] ?? 0).toBeGreaterThan(0);
    expect(counts[TileType.Water] ?? 0).toBeGreaterThan(0);
  });
});

const CONFIG_SEED = 1337;
