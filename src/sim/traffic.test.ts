import { describe, expect, it } from "vitest";
import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { applyTool } from "./build.ts";
import { recomputeRoadAccess } from "./power.ts";
import { computeTraffic, roadsideTraffic } from "./traffic.ts";
import { growthTick } from "./growth.ts";

const at = (f: Float32Array, grid: Grid, x: number, y: number) => f[y * grid.width + x];

describe("bridges", () => {
  it("the road tool builds a bridge over water at a premium", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.Water);
    const outcome = applyTool(grid, "road", 5, 5, 10_000);
    expect(outcome).toEqual({ ok: true, cost: CONFIG.BRIDGE_COST });
    expect(grid.getType(5, 5)).toBe(TileType.Bridge);
  });

  it("refuses a bridge the mayor can't afford", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.Water);
    const outcome = applyTool(grid, "road", 5, 5, CONFIG.BRIDGE_COST - 1);
    expect(outcome.ok).toBe(false);
    expect(grid.getType(5, 5)).toBe(TileType.Water);
  });

  it("bulldozing a bridge restores open water", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.Bridge);
    expect(applyTool(grid, "bulldoze", 5, 5, 100).ok).toBe(true);
    expect(grid.getType(5, 5)).toBe(TileType.Water);
  });

  it("other tools still can't build on water", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.Water);
    expect(applyTool(grid, "zone_r", 5, 5, 10_000).ok).toBe(false);
    expect(applyTool(grid, "powerline", 5, 5, 10_000).ok).toBe(false);
  });

  it("bridges satisfy a zone's road-access requirement", () => {
    const grid = new Grid(10, 10);
    grid.setType(5, 5, TileType.ZoneR);
    grid.setType(7, 5, TileType.Bridge); // within radius 3
    recomputeRoadAccess(grid, 3);
    expect(grid.get(5, 5)!.roadAccess).toBe(true);
  });
});

describe("computeTraffic", () => {
  function developedBlock(grid: Grid, x0: number, y0: number, level: number): void {
    for (let dy = 0; dy < 3; dy++) {
      for (let dx = 0; dx < 3; dx++) {
        grid.setType(x0 + dx, y0 + dy, TileType.ZoneR);
        grid.get(x0 + dx, y0 + dy)!.level = level;
      }
    }
  }

  it("loads developed zones onto nearby roads; empty streets stay clear", () => {
    const grid = new Grid(20, 20);
    grid.setType(10, 10, TileType.Road);
    expect(Math.max(...computeTraffic(grid))).toBe(0);

    developedBlock(grid, 8, 11, 3); // dense block right below the road
    const f = computeTraffic(grid);
    expect(at(f, grid, 10, 10)).toBeGreaterThan(0.4);
  });

  it("puts nothing on non-road tiles and clamps at 1", () => {
    const grid = new Grid(20, 20);
    grid.setType(10, 10, TileType.Road);
    developedBlock(grid, 8, 11, 3);
    developedBlock(grid, 8, 7, 3);
    const f = computeTraffic(grid);
    expect(at(f, grid, 10, 10)).toBeLessThanOrEqual(1);
    expect(at(f, grid, 9, 11)).toBe(0); // zone tile itself carries no value
  });

  it("roadsideTraffic reports the worst adjacent road", () => {
    const grid = new Grid(20, 20);
    grid.setType(10, 10, TileType.Road);
    developedBlock(grid, 8, 11, 3);
    const f = computeTraffic(grid);
    expect(roadsideTraffic(grid, f, 10, 11)).toBeGreaterThan(0.4); // next to the road
    expect(roadsideTraffic(grid, f, 3, 3)).toBe(0); // far away
  });

  it("heavy roadside traffic slows residential growth", () => {
    const mk = (withTraffic: boolean) => {
      const grid = new Grid(20, 20);
      grid.setType(10, 10, TileType.ZoneR);
      const t = grid.get(10, 10)!;
      t.powered = true;
      t.roadAccess = true;
      const traffic = new Float32Array(grid.width * grid.height);
      if (withTraffic) {
        grid.setType(10, 9, TileType.Road);
        traffic[9 * grid.width + 10] = 1; // jammed street outside the window
      }
      return { grid, traffic };
    };
    // rand between base odds and traffic-dampened odds
    const roll = () => CONFIG.GROW_CHANCE * (1 - CONFIG.TRAFFIC_R_SENSITIVITY / 2);

    const calm = mk(false);
    growthTick(calm.grid, { r: 1, c: 0, i: 0 }, roll, undefined, undefined, calm.traffic);
    expect(calm.grid.get(10, 10)!.level).toBe(1); // grows on a quiet street

    const jammed = mk(true);
    growthTick(jammed.grid, { r: 1, c: 0, i: 0 }, roll, undefined, undefined, jammed.traffic);
    expect(jammed.grid.get(10, 10)!.level).toBe(0); // stalls next to gridlock
  });
});
