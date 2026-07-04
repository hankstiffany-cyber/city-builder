import { describe, expect, it } from "vitest";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";
import { advise, collectReport, type AdvisorInput } from "./advisor.ts";

const emptyPollution = (grid: Grid) => new Float32Array(grid.width * grid.height);

function input(overrides: Partial<AdvisorInput> = {}): AdvisorInput {
  return {
    report: {
      hasPlant: false,
      zoneCount: 0,
      unpoweredZones: 0,
      roadlessZones: 0,
      vacant: { r: 0, c: 0, i: 0 },
      pollutedResidential: 0,
      fireStations: 0,
      policeStations: 0,
      fires: 0,
    },
    demand: { r: 0, c: 0, i: 0 },
    money: 10_000,
    population: 0,
    ...overrides,
  };
}

const ids = (msgs: { id: string }[]) => msgs.map((m) => m.id);

describe("collectReport", () => {
  it("summarises plants, zones, power, roads, vacancy, and pollution", () => {
    const grid = new Grid(10, 10);
    grid.setType(0, 0, TileType.PowerPlant);
    grid.setType(1, 0, TileType.ZoneR); // unpowered, roadless, vacant
    grid.setType(2, 0, TileType.ZoneC);
    const powered = grid.get(2, 0)!;
    powered.powered = true;
    powered.roadAccess = true;
    powered.level = 2; // developed — not vacant

    const pollution = emptyPollution(grid);
    pollution[0 * grid.width + 1] = 0.9; // heavy smog over the R zone

    const report = collectReport(grid, pollution);
    expect(report.hasPlant).toBe(true);
    expect(report.zoneCount).toBe(2);
    expect(report.unpoweredZones).toBe(1);
    expect(report.roadlessZones).toBe(1);
    expect(report.vacant).toEqual({ r: 1, c: 0, i: 0 });
    expect(report.pollutedResidential).toBe(1);
  });
});

describe("advise", () => {
  it("welcomes a brand-new mayor", () => {
    const msgs = advise(input());
    expect(ids(msgs)).toContain("welcome");
    expect(msgs.find((m) => m.id === "welcome")!.once).toBe(true);
  });

  it("prompts for zones once the plant is down", () => {
    const msgs = advise(input({ report: { ...input().report, hasPlant: true } }));
    expect(ids(msgs)).toContain("first_zones");
    expect(ids(msgs)).not.toContain("welcome");
  });

  it("warns about unpowered and roadless zones", () => {
    const report = { ...input().report, zoneCount: 4, unpoweredZones: 3, roadlessZones: 2 };
    const msgs = advise(input({ report, population: 50 }));
    expect(ids(msgs)).toEqual(expect.arrayContaining(["no_power", "no_road"]));
    expect(msgs.find((m) => m.id === "no_power")!.text).toContain("3");
  });

  it("flags an empty treasury and heavy pollution", () => {
    const report = { ...input().report, zoneCount: 1, pollutedResidential: 5 };
    const msgs = advise(input({ report, money: 100, population: 10 }));
    expect(ids(msgs)).toEqual(expect.arrayContaining(["low_funds", "pollution"]));
  });

  it("asks for more zoning only when demand is high AND nothing is vacant", () => {
    const base = { ...input().report, zoneCount: 5, hasPlant: true };
    const hungry = advise(
      input({ report: base, demand: { r: 0.8, c: 0.8, i: 0.8 }, population: 100 })
    );
    expect(ids(hungry)).toEqual(expect.arrayContaining(["want_r", "want_c", "want_i"]));

    const roomLeft = advise(
      input({
        report: { ...base, vacant: { r: 2, c: 2, i: 2 } },
        demand: { r: 0.8, c: 0.8, i: 0.8 },
        population: 100,
      })
    );
    expect(ids(roomLeft)).not.toContain("want_r");
  });

  it("stays quiet for a healthy, balanced city", () => {
    const report = {
      hasPlant: true,
      zoneCount: 20,
      unpoweredZones: 0,
      roadlessZones: 0,
      vacant: { r: 3, c: 3, i: 3 },
      pollutedResidential: 0,
      fireStations: 1,
      policeStations: 1,
      fires: 0,
    };
    const msgs = advise(input({ report, demand: { r: 0.4, c: 0.3, i: 0.4 }, population: 500 }));
    expect(msgs).toEqual([]);
  });
});
