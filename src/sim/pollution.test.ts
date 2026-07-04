import { describe, expect, it } from "vitest";
import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { computePollution } from "./pollution.ts";
import { computeLandValue } from "./landvalue.ts";

const at = (field: Float32Array, grid: Grid, x: number, y: number) => field[y * grid.width + x];

describe("computePollution", () => {
  it("is zero on a clean map", () => {
    const grid = new Grid(10, 10);
    grid.setType(3, 3, TileType.ZoneR);
    grid.setType(4, 4, TileType.Road);
    const p = computePollution(grid);
    expect(Math.max(...p)).toBe(0);
  });

  it("a power plant pollutes strongest at the source, fading with distance", () => {
    const grid = new Grid(20, 20);
    grid.setType(10, 10, TileType.PowerPlant);
    const p = computePollution(grid);
    const source = at(p, grid, 10, 10);
    const near = at(p, grid, 11, 10);
    const far = at(p, grid, 10 + CONFIG.POLLUTION_RADIUS, 10);
    expect(source).toBeGreaterThan(near);
    expect(near).toBeGreaterThan(far);
    expect(far).toBeGreaterThan(0);
    expect(at(p, grid, 10 + CONFIG.POLLUTION_RADIUS + 1, 10)).toBe(0);
  });

  it("industrial emission scales with level", () => {
    const gridLow = new Grid(10, 10);
    gridLow.setType(5, 5, TileType.ZoneI);
    const gridHigh = new Grid(10, 10);
    gridHigh.setType(5, 5, TileType.ZoneI);
    gridHigh.get(5, 5)!.level = 3;
    expect(at(computePollution(gridHigh), gridHigh, 5, 5)).toBeGreaterThan(
      at(computePollution(gridLow), gridLow, 5, 5)
    );
  });

  it("overlapping plumes add up but clamp at 1", () => {
    const grid = new Grid(10, 10);
    grid.setType(4, 4, TileType.PowerPlant);
    grid.setType(5, 4, TileType.PowerPlant);
    const p = computePollution(grid);
    expect(at(p, grid, 4, 4)).toBe(1);
  });
});

describe("computeLandValue", () => {
  it("waterfront beats inland, pollution drags value down", () => {
    const grid = new Grid(20, 20);
    grid.setType(0, 5, TileType.Water);
    grid.setType(15, 15, TileType.PowerPlant);
    const p = computePollution(grid);
    const v = computeLandValue(grid, p);
    const waterfront = at(v, grid, 1, 5);
    const inland = at(v, grid, 8, 5);
    const polluted = at(v, grid, 15, 15);
    expect(waterfront).toBeGreaterThan(inland);
    expect(polluted).toBeLessThan(inland);
  });

  it("roads and power raise value", () => {
    const grid = new Grid(20, 20);
    grid.setType(5, 5, TileType.Road);
    const p = computePollution(grid);
    const v = computeLandValue(grid, p);
    expect(at(v, grid, 5, 6)).toBeGreaterThan(at(v, grid, 12, 12));

    grid.get(12, 12)!.powered = true;
    const v2 = computeLandValue(grid, computePollution(grid));
    expect(at(v2, grid, 12, 12)).toBeGreaterThan(at(v, grid, 12, 12));
  });

  it("stays within [0, 1] everywhere", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.PowerPlant);
    grid.setType(4, 5, TileType.PowerPlant);
    grid.setType(0, 0, TileType.Water);
    const v = computeLandValue(grid, computePollution(grid));
    for (const x of v) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
    }
  });
});
