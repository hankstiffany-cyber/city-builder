import { describe, expect, it } from "vitest";
import { CONFIG } from "../config.ts";
import { Grid } from "../sim/grid.ts";
import { TileType } from "../sim/tiles.ts";
import { decodeInto, encodeSave, isSaveData } from "./save.ts";

function sampleGrid(): Grid {
  const grid = new Grid(8, 6);
  grid.setType(0, 0, TileType.Water);
  grid.setType(1, 0, TileType.Trees);
  grid.setType(2, 0, TileType.Road);
  grid.setType(3, 0, TileType.PowerLine);
  grid.setType(4, 0, TileType.PowerPlant);
  grid.setType(0, 1, TileType.ZoneR);
  grid.get(0, 1)!.level = 3;
  grid.setType(1, 1, TileType.ZoneC);
  grid.get(1, 1)!.level = 1;
  grid.setType(2, 1, TileType.ZoneI);
  grid.get(2, 1)!.level = 2;
  return grid;
}

const source = (grid: Grid) => ({
  cityName: "Testville",
  money: 1234,
  totalDays: 365,
  taxRate: 0.09,
  grid,
});

describe("save codec", () => {
  it("round-trips every tile type, level, and header field", () => {
    const grid = sampleGrid();
    const data = encodeSave(source(grid));

    const restored = new Grid(8, 6);
    expect(decodeInto(restored, data)).toBe(true);
    grid.forEach((tile, x, y) => {
      expect(restored.get(x, y)!.type).toBe(tile.type);
      expect(restored.get(x, y)!.level).toBe(tile.level);
    });
    expect(data.name).toBe("Testville");
    expect(data.money).toBe(1234);
    expect(data.totalDays).toBe(365);
    expect(data.taxRate).toBe(0.09);
  });

  it("survives JSON serialisation (the actual storage format)", () => {
    const data = JSON.parse(JSON.stringify(encodeSave(source(sampleGrid()))));
    expect(isSaveData(data)).toBe(true);
    const restored = new Grid(8, 6);
    expect(decodeInto(restored, data)).toBe(true);
    expect(restored.get(0, 1)!.type).toBe(TileType.ZoneR);
    expect(restored.get(0, 1)!.level).toBe(3);
  });

  it("rejects mismatched dimensions without touching the grid", () => {
    const data = encodeSave(source(sampleGrid()));
    const wrong = new Grid(10, 10);
    wrong.setType(5, 5, TileType.Road);
    expect(decodeInto(wrong, data)).toBe(false);
    expect(wrong.getType(5, 5)).toBe(TileType.Road); // untouched
  });

  it("rejects out-of-range tile indices", () => {
    const data = encodeSave(source(sampleGrid()));
    data.types[3] = 999;
    expect(decodeInto(new Grid(8, 6), data)).toBe(false);
  });

  it("clamps absurd levels instead of importing them", () => {
    const data = encodeSave(source(sampleGrid()));
    const i = data.types.indexOf(5); // first ZoneR cell
    data.levels[i] = 99;
    const restored = new Grid(8, 6);
    expect(decodeInto(restored, data)).toBe(true);
    expect(restored.get(i % 8, Math.floor(i / 8))!.level).toBe(CONFIG.MAX_LEVEL);
  });

  it("isSaveData screens out malformed payloads", () => {
    expect(isSaveData(null)).toBe(false);
    expect(isSaveData({})).toBe(false);
    expect(isSaveData({ v: 2 })).toBe(false);
    const good = encodeSave(source(sampleGrid()));
    expect(isSaveData(good)).toBe(true);
    expect(isSaveData({ ...good, types: good.types.slice(1) })).toBe(false); // length lie
  });
});
