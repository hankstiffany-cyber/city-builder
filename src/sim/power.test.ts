import { describe, expect, it } from "vitest";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { recomputeConnectivity, recomputePower, recomputeRoadAccess } from "./power.ts";

const at = (grid: Grid, x: number, y: number) => grid.get(x, y)!;

describe("recomputePower", () => {
  it("powers the plant itself", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.PowerPlant);
    recomputePower(grid);
    expect(at(grid, 5, 5).powered).toBe(true);
  });

  it("flows through a power line chain to a zone", () => {
    const grid = new Grid(10, 10);
    grid.setType(0, 0, TileType.PowerPlant);
    grid.setType(1, 0, TileType.PowerLine);
    grid.setType(2, 0, TileType.PowerLine);
    grid.setType(3, 0, TileType.ZoneR);
    recomputePower(grid);
    expect(at(grid, 3, 0).powered).toBe(true);
  });

  it("flows through roads and zone-to-zone", () => {
    const grid = new Grid(10, 10);
    grid.setType(0, 0, TileType.PowerPlant);
    grid.setType(0, 1, TileType.Road);
    grid.setType(0, 2, TileType.ZoneC);
    grid.setType(0, 3, TileType.ZoneI); // powered via the neighbouring zone
    recomputePower(grid);
    expect(at(grid, 0, 2).powered).toBe(true);
    expect(at(grid, 0, 3).powered).toBe(true);
  });

  it("does not cross non-conducting terrain", () => {
    const grid = new Grid(10, 10);
    grid.setType(0, 0, TileType.PowerPlant);
    // (1,0) stays grass — the gap breaks the circuit.
    grid.setType(2, 0, TileType.ZoneR);
    recomputePower(grid);
    expect(at(grid, 2, 0).powered).toBe(false);
  });

  it("does not conduct diagonally", () => {
    const grid = new Grid(10, 10);
    grid.setType(0, 0, TileType.PowerPlant);
    grid.setType(1, 1, TileType.ZoneR);
    recomputePower(grid);
    expect(at(grid, 1, 1).powered).toBe(false);
  });

  it("clears stale power when the plant is removed", () => {
    const grid = new Grid(10, 10);
    grid.setType(0, 0, TileType.PowerPlant);
    grid.setType(1, 0, TileType.ZoneR);
    recomputePower(grid);
    expect(at(grid, 1, 0).powered).toBe(true);

    grid.setType(0, 0, TileType.Grass); // bulldozed
    recomputePower(grid);
    expect(at(grid, 1, 0).powered).toBe(false);
  });
});

describe("recomputeRoadAccess", () => {
  it("marks a zone with a road inside the radius", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneR);
    grid.setType(8, 5, TileType.Road); // Chebyshev distance 3
    recomputeRoadAccess(grid, 3);
    expect(at(grid, 5, 5).roadAccess).toBe(true);
  });

  it("does not mark a zone whose nearest road is outside the radius", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneR);
    grid.setType(9, 5, TileType.Road); // distance 4
    recomputeRoadAccess(grid, 3);
    expect(at(grid, 5, 5).roadAccess).toBe(false);
  });

  it("counts diagonal proximity (Chebyshev, not Manhattan)", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneC);
    grid.setType(8, 8, TileType.Road); // Chebyshev 3, Manhattan 6
    recomputeRoadAccess(grid, 3);
    expect(at(grid, 5, 5).roadAccess).toBe(true);
  });

  it("never marks non-zone tiles", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.Road);
    recomputeRoadAccess(grid, 3);
    expect(at(grid, 5, 5).roadAccess).toBe(false);
  });

  it("clears stale access when the road is bulldozed", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneI);
    grid.setType(6, 5, TileType.Road);
    recomputeRoadAccess(grid, 3);
    expect(at(grid, 5, 5).roadAccess).toBe(true);

    grid.setType(6, 5, TileType.Grass);
    recomputeRoadAccess(grid, 3);
    expect(at(grid, 5, 5).roadAccess).toBe(false);
  });
});

describe("recomputeConnectivity", () => {
  it("refreshes both power and road access in one call", () => {
    const grid = new Grid(10, 10);
    grid.setType(0, 0, TileType.PowerPlant);
    grid.setType(1, 0, TileType.ZoneR);
    grid.setType(1, 1, TileType.Road);
    recomputeConnectivity(grid);
    expect(at(grid, 1, 0).powered).toBe(true);
    expect(at(grid, 1, 0).roadAccess).toBe(true);
  });
});
