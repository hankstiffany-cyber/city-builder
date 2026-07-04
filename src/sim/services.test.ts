import { describe, expect, it } from "vitest";
import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { computeCoverage } from "./coverage.ts";
import { computeCrime } from "./crime.ts";
import { fireTick } from "./fire.ts";

const at = (f: Float32Array, grid: Grid, x: number, y: number) => f[y * grid.width + x];

function poweredStation(grid: Grid, x: number, y: number, type: TileType): void {
  grid.setType(x, y, type);
  grid.get(x, y)!.powered = true;
}

describe("computeCoverage", () => {
  it("is strongest at the station and fades to zero past the radius", () => {
    const grid = new Grid(30, 30);
    poweredStation(grid, 15, 15, TileType.FireStation);
    const f = computeCoverage(grid, TileType.FireStation);
    expect(at(f, grid, 15, 15)).toBe(1);
    expect(at(f, grid, 15 + 4, 15)).toBeGreaterThan(0);
    expect(at(f, grid, 15 + 4, 15)).toBeLessThan(1);
    expect(at(f, grid, 15 + CONFIG.STATION_COVERAGE_RADIUS + 1, 15)).toBe(0);
  });

  it("an unpowered station protects nothing", () => {
    const grid = new Grid(30, 30);
    grid.setType(15, 15, TileType.FireStation); // powered stays false
    const f = computeCoverage(grid, TileType.FireStation);
    expect(Math.max(...f)).toBe(0);
  });

  it("overlapping stations take the max, not the sum", () => {
    const grid = new Grid(30, 30);
    poweredStation(grid, 14, 15, TileType.PoliceStation);
    poweredStation(grid, 16, 15, TileType.PoliceStation);
    const f = computeCoverage(grid, TileType.PoliceStation);
    expect(at(f, grid, 15, 15)).toBeLessThanOrEqual(1);
  });

  it("only counts its own station type", () => {
    const grid = new Grid(30, 30);
    poweredStation(grid, 15, 15, TileType.PoliceStation);
    const f = computeCoverage(grid, TileType.FireStation);
    expect(Math.max(...f)).toBe(0);
  });
});

describe("computeCrime", () => {
  it("developed zones emit crime; empty map is clean", () => {
    const grid = new Grid(20, 20);
    const none = new Float32Array(grid.width * grid.height);
    expect(Math.max(...computeCrime(grid, none))).toBe(0);

    grid.setType(10, 10, TileType.ZoneC);
    grid.get(10, 10)!.level = 3;
    const f = computeCrime(grid, none);
    expect(at(f, grid, 10, 10)).toBeGreaterThan(0);
    expect(at(f, grid, 10 + CONFIG.CRIME_RADIUS + 1, 10)).toBe(0);
  });

  it("police coverage suppresses crime point-for-point", () => {
    const grid = new Grid(20, 20);
    grid.setType(10, 10, TileType.ZoneC);
    grid.get(10, 10)!.level = 3;
    const none = new Float32Array(grid.width * grid.height);
    const dirty = computeCrime(grid, none);

    poweredStation(grid, 11, 10, TileType.PoliceStation);
    const police = computeCoverage(grid, TileType.PoliceStation);
    const clean = computeCrime(grid, police);
    expect(at(clean, grid, 10, 10)).toBeLessThan(at(dirty, grid, 10, 10));
    expect(at(clean, grid, 10, 10)).toBe(0); // full coverage right next door
  });
});

describe("fireTick", () => {
  const noCoverage = (grid: Grid) => new Float32Array(grid.width * grid.height);
  const fullCoverage = (grid: Grid) => new Float32Array(grid.width * grid.height).fill(1);

  it("ignites a random flammable tile when the dice land", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneR);
    // rolls: ignition-check (0 < risk), pick-index (0 -> first), coverage-check
    const result = fireTick(grid, noCoverage(grid), () => 0);
    expect(result.ignited).toBe(1);
    expect(grid.getType(5, 5)).toBe(TileType.Fire);
  });

  it("full fire coverage prevents the outbreak", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneR);
    const result = fireTick(grid, fullCoverage(grid), () => 0);
    expect(result.ignited).toBe(0);
    expect(grid.getType(5, 5)).toBe(TileType.ZoneR);
  });

  it("spreads to flammable neighbours but not across firebreaks", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.Fire);
    grid.setType(5, 4, TileType.Trees); // burns
    grid.setType(6, 5, TileType.Road); // firebreak
    grid.setType(5, 6, TileType.Water); // firebreak
    // rand always high enough to skip ignition/burnout, low enough to spread:
    // ignition check needs rand < risk (risk tiny -> no ignite with 0.15);
    // spread checks need rand < 0.22 -> 0.15 spreads; burnout needs < 0.1 -> no.
    const result = fireTick(grid, noCoverage(grid), () => 0.15);
    expect(grid.getType(5, 4)).toBe(TileType.Fire);
    expect(grid.getType(6, 5)).toBe(TileType.Road);
    expect(grid.getType(5, 6)).toBe(TileType.Water);
    expect(result.spread).toBe(1);
  });

  it("full coverage at the target stops the spread", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.Fire);
    grid.setType(5, 4, TileType.Trees);
    fireTick(grid, fullCoverage(grid), () => 0.15);
    expect(grid.getType(5, 4)).toBe(TileType.Trees);
  });

  it("fires burn out into rubble, faster under coverage", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.Fire);
    // 0.3 > base burnout 0.1, but < 0.1 + 0.4 coverage bonus
    fireTick(grid, noCoverage(grid), () => 0.3);
    expect(grid.getType(5, 5)).toBe(TileType.Fire); // still burning

    fireTick(grid, fullCoverage(grid), () => 0.3);
    expect(grid.getType(5, 5)).toBe(TileType.Rubble); // brigade contained it
  });

  it("burned tiles lose their development level", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneC);
    grid.get(5, 5)!.level = 3;
    fireTick(grid, new Float32Array(100), () => 0); // ignites it
    expect(grid.get(5, 5)!.level).toBe(0);
  });

  it("reports no change on a quiet map", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneR);
    const result = fireTick(grid, new Float32Array(100), () => 0.99);
    expect(result.changed).toBe(false);
  });
});
