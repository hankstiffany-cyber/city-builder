import { describe, it, expect } from "vitest";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";

describe("Grid", () => {
  it("starts as all grass", () => {
    const g = new Grid(4, 3);
    let count = 0;
    g.forEach((t) => {
      if (t.type === TileType.Grass) count++;
    });
    expect(count).toBe(12);
  });

  it("reports bounds correctly", () => {
    const g = new Grid(10, 10);
    expect(g.inBounds(0, 0)).toBe(true);
    expect(g.inBounds(9, 9)).toBe(true);
    expect(g.inBounds(-1, 0)).toBe(false);
    expect(g.inBounds(10, 0)).toBe(false);
    expect(g.inBounds(0, 10)).toBe(false);
  });

  it("sets and gets tile types", () => {
    const g = new Grid(5, 5);
    expect(g.setType(2, 3, TileType.Road)).toBe(true);
    expect(g.getType(2, 3)).toBe(TileType.Road);
  });

  it("refuses to write out of bounds", () => {
    const g = new Grid(5, 5);
    expect(g.setType(5, 5, TileType.Road)).toBe(false);
    expect(g.get(5, 5)).toBeUndefined();
    expect(g.getType(99, 99)).toBeUndefined();
  });

  it("does not alias tiles (each cell is independent)", () => {
    const g = new Grid(3, 3);
    g.setType(0, 0, TileType.Water);
    expect(g.getType(1, 0)).toBe(TileType.Grass);
    expect(g.getType(0, 1)).toBe(TileType.Grass);
  });

  it("resets the development level whenever a tile changes type", () => {
    const g = new Grid(3, 3);
    g.setType(1, 1, TileType.ZoneR);
    g.get(1, 1)!.level = 2;
    g.setType(1, 1, TileType.Grass); // bulldozed
    expect(g.get(1, 1)!.level).toBe(0);
  });
});
