import { describe, expect, it } from "vitest";
import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { computeDemand, computeStats, monthlyTaxIncome } from "./demand.ts";

function setZone(grid: Grid, x: number, y: number, type: TileType, level: number): void {
  grid.setType(x, y, type);
  grid.get(x, y)!.level = level;
}

describe("computeStats", () => {
  it("counts nothing on an empty map", () => {
    const stats = computeStats(new Grid(10, 10));
    expect(stats).toEqual({ population: 0, shopJobs: 0, factoryJobs: 0 });
  });

  it("sums population and jobs by zone level", () => {
    const grid = new Grid(10, 10);
    setZone(grid, 0, 0, TileType.ZoneR, 2);
    setZone(grid, 1, 0, TileType.ZoneR, 3);
    setZone(grid, 2, 0, TileType.ZoneC, 1);
    setZone(grid, 3, 0, TileType.ZoneI, 2);
    const stats = computeStats(grid);
    expect(stats.population).toBe(CONFIG.POP_PER_LEVEL[2] + CONFIG.POP_PER_LEVEL[3]);
    expect(stats.shopJobs).toBe(CONFIG.JOBS_PER_C_LEVEL[1]);
    expect(stats.factoryJobs).toBe(CONFIG.JOBS_PER_I_LEVEL[2]);
  });

  it("counts level-0 zones as zero population/jobs", () => {
    const grid = new Grid(10, 10);
    grid.setType(0, 0, TileType.ZoneR);
    grid.setType(1, 0, TileType.ZoneC);
    grid.setType(2, 0, TileType.ZoneI);
    expect(computeStats(grid)).toEqual({ population: 0, shopJobs: 0, factoryJobs: 0 });
  });
});

describe("computeDemand", () => {
  it("bootstraps an empty city: settlers and industry want in, shops do not", () => {
    const d = computeDemand({ population: 0, shopJobs: 0, factoryJobs: 0 });
    expect(d.r).toBeGreaterThan(0);
    expect(d.i).toBeGreaterThan(0);
    expect(d.c).toBe(0);
  });

  it("population without jobs kills R demand and creates C/I demand", () => {
    const d = computeDemand({ population: 500, shopJobs: 0, factoryJobs: 0 });
    expect(d.r).toBe(0); // workers vastly outnumber jobs
    expect(d.c).toBeGreaterThan(0);
    expect(d.i).toBeGreaterThan(0);
  });

  it("plentiful jobs restore R demand", () => {
    const d = computeDemand({ population: 100, shopJobs: 60, factoryJobs: 60 });
    expect(d.r).toBeGreaterThan(0);
  });

  it("saturated commercial capacity kills C demand", () => {
    const pop = 100;
    const d = computeDemand({
      population: pop,
      shopJobs: Math.ceil(pop * CONFIG.SHOPS_PER_POP) + 10,
      factoryJobs: 0,
    });
    expect(d.c).toBe(0);
  });

  it("high taxes suppress demand; the default rate changes nothing", () => {
    const stats = { population: 100, shopJobs: 60, factoryJobs: 60 };
    const base = computeDemand(stats);
    const atDefault = computeDemand(stats, CONFIG.TAX_RATE_DEFAULT);
    const taxed = computeDemand(stats, CONFIG.TAX_RATE_MAX);
    expect(atDefault).toEqual(base);
    expect(taxed.r).toBeLessThan(base.r);
    expect(taxed.r).toBeGreaterThanOrEqual(0);
  });

  it("always stays within [0, 1]", () => {
    for (const stats of [
      { population: 0, shopJobs: 0, factoryJobs: 0 },
      { population: 1_000_000, shopJobs: 0, factoryJobs: 0 },
      { population: 0, shopJobs: 1_000_000, factoryJobs: 1_000_000 },
    ]) {
      const d = computeDemand(stats);
      for (const v of [d.r, d.c, d.i]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(1);
      }
    }
  });
});

describe("monthlyTaxIncome", () => {
  it("scales with population and rate", () => {
    const stats = { population: 200, shopJobs: 0, factoryJobs: 0 };
    expect(monthlyTaxIncome(stats, 0.07)).toBe(
      Math.round(200 * 0.07 * CONFIG.TAX_REVENUE_PER_POP)
    );
    expect(monthlyTaxIncome(stats, 0)).toBe(0);
    expect(monthlyTaxIncome({ ...stats, population: 0 }, 0.2)).toBe(0);
  });
});
