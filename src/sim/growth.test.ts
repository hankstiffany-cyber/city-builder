import { describe, expect, it } from "vitest";
import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { growthTick } from "./growth.ts";
import type { Demand } from "./demand.ts";

const FULL: Demand = { r: 1, c: 1, i: 1 };
const NONE: Demand = { r: 0, c: 0, i: 0 };
const always = () => 0; // rand() always below any positive threshold
const never = () => 1; // rand() always above every threshold

function connectedZone(grid: Grid, x: number, y: number, type: TileType): void {
  grid.setType(x, y, type);
  const tile = grid.get(x, y)!;
  tile.powered = true;
  tile.roadAccess = true;
}

describe("growthTick", () => {
  it("grows a powered, road-connected zone under demand", () => {
    const grid = new Grid(5, 5);
    connectedZone(grid, 1, 1, TileType.ZoneR);
    const result = growthTick(grid, FULL, always);
    expect(grid.get(1, 1)!.level).toBe(1);
    expect(result.grew).toBe(1);
  });

  it("does not grow past MAX_LEVEL", () => {
    const grid = new Grid(5, 5);
    connectedZone(grid, 1, 1, TileType.ZoneC);
    grid.get(1, 1)!.level = CONFIG.MAX_LEVEL;
    growthTick(grid, FULL, always);
    expect(grid.get(1, 1)!.level).toBe(CONFIG.MAX_LEVEL);
  });

  it("freezes growth when demand is zero", () => {
    const grid = new Grid(5, 5);
    connectedZone(grid, 1, 1, TileType.ZoneI);
    growthTick(grid, NONE, always);
    expect(grid.get(1, 1)!.level).toBe(0);
  });

  it("uses the demand for the zone's own type", () => {
    const grid = new Grid(5, 5);
    connectedZone(grid, 1, 1, TileType.ZoneR);
    connectedZone(grid, 2, 1, TileType.ZoneC);
    growthTick(grid, { r: 1, c: 0, i: 0 }, always);
    expect(grid.get(1, 1)!.level).toBe(1);
    expect(grid.get(2, 1)!.level).toBe(0);
  });

  it("never grows an unpowered zone, even under full demand", () => {
    const grid = new Grid(5, 5);
    grid.setType(1, 1, TileType.ZoneR);
    grid.get(1, 1)!.roadAccess = true; // powered stays false
    growthTick(grid, FULL, always);
    expect(grid.get(1, 1)!.level).toBe(0);
  });

  it("never grows a zone without road access", () => {
    const grid = new Grid(5, 5);
    grid.setType(1, 1, TileType.ZoneR);
    grid.get(1, 1)!.powered = true; // roadAccess stays false
    growthTick(grid, FULL, always);
    expect(grid.get(1, 1)!.level).toBe(0);
  });

  it("decays a developed zone that lost power", () => {
    const grid = new Grid(5, 5);
    grid.setType(1, 1, TileType.ZoneR);
    grid.get(1, 1)!.level = 2; // developed, but unpowered + no road
    const result = growthTick(grid, FULL, always);
    expect(grid.get(1, 1)!.level).toBe(1);
    expect(result.decayed).toBe(1);
  });

  it("an empty disconnected lot has nothing to decay", () => {
    const grid = new Grid(5, 5);
    grid.setType(1, 1, TileType.ZoneR);
    const result = growthTick(grid, FULL, always);
    expect(grid.get(1, 1)!.level).toBe(0);
    expect(result.decayed).toBe(0);
  });

  it("leaves everything untouched when the dice never land", () => {
    const grid = new Grid(5, 5);
    connectedZone(grid, 1, 1, TileType.ZoneR);
    growthTick(grid, FULL, never);
    expect(grid.get(1, 1)!.level).toBe(0);
  });

  it("heavy pollution stalls residential but not industrial growth", () => {
    const grid = new Grid(5, 5);
    connectedZone(grid, 1, 1, TileType.ZoneR);
    connectedZone(grid, 3, 3, TileType.ZoneI);
    const pollution = new Float32Array(grid.width * grid.height).fill(1); // worst case
    growthTick(grid, FULL, always, pollution);
    expect(grid.get(1, 1)!.level).toBe(0); // demand multiplied down to 0
    expect(grid.get(3, 3)!.level).toBe(1); // industry doesn't care
  });

  it("clean air leaves residential growth untouched", () => {
    const grid = new Grid(5, 5);
    connectedZone(grid, 1, 1, TileType.ZoneR);
    const pollution = new Float32Array(grid.width * grid.height); // all zeros
    growthTick(grid, FULL, always, pollution);
    expect(grid.get(1, 1)!.level).toBe(1);
  });

  it("ignores non-zone tiles entirely", () => {
    const grid = new Grid(5, 5);
    grid.setType(0, 0, TileType.Road);
    grid.setType(1, 0, TileType.PowerPlant);
    const result = growthTick(grid, FULL, always);
    expect(result.grew + result.decayed).toBe(0);
    expect(grid.get(0, 0)!.level).toBe(0);
    expect(grid.get(1, 0)!.level).toBe(0);
  });
});
