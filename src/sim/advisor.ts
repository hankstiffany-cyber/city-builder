import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType, isZone } from "./tiles.ts";
import type { Demand } from "./demand.ts";

/**
 * The city advisor — the voice that made SimCity teach itself. Each tick the
 * game builds a CityReport (one grid pass) and runs the rules below; the Game
 * decides which messages actually surface (once-per-city flags + cooldowns),
 * and the UI shows them as toasts.
 */

export interface CityReport {
  hasPlant: boolean;
  zoneCount: number;
  unpoweredZones: number;
  roadlessZones: number;
  /** Undeveloped (level 0) zones per type — room for demand to fill. */
  vacant: { r: number; c: number; i: number };
  /** Residential tiles suffering pollution above POLLUTED_R_THRESHOLD. */
  pollutedResidential: number;
  fireStations: number;
  policeStations: number;
  fires: number;
}

export interface AdvisorMessage {
  /** Stable dedupe key (also the cooldown bucket). */
  id: string;
  kind: "hint" | "warn" | "success";
  text: string;
  /** Show at most once per city (tutorial-style hints). */
  once?: boolean;
}

export function collectReport(grid: Grid, pollution: Float32Array): CityReport {
  const report: CityReport = {
    hasPlant: false,
    zoneCount: 0,
    unpoweredZones: 0,
    roadlessZones: 0,
    vacant: { r: 0, c: 0, i: 0 },
    pollutedResidential: 0,
    fireStations: 0,
    policeStations: 0,
    fires: 0,
  };
  grid.forEach((tile, x, y) => {
    if (tile.type === TileType.PowerPlant) report.hasPlant = true;
    else if (tile.type === TileType.FireStation) report.fireStations++;
    else if (tile.type === TileType.PoliceStation) report.policeStations++;
    else if (tile.type === TileType.Fire) report.fires++;
    if (!isZone(tile.type)) return;
    report.zoneCount++;
    if (!tile.powered) report.unpoweredZones++;
    if (!tile.roadAccess) report.roadlessZones++;
    if (tile.level === 0) {
      if (tile.type === TileType.ZoneR) report.vacant.r++;
      else if (tile.type === TileType.ZoneC) report.vacant.c++;
      else report.vacant.i++;
    }
    if (
      tile.type === TileType.ZoneR &&
      pollution[y * grid.width + x] > CONFIG.POLLUTED_R_THRESHOLD
    ) {
      report.pollutedResidential++;
    }
  });
  return report;
}

export interface AdvisorInput {
  report: CityReport;
  demand: Demand;
  money: number;
  population: number;
  /** Worst crime cell on the map, 0..1. */
  maxCrime?: number;
  /** Worst road-tile congestion, 0..1. */
  maxTraffic?: number;
}

/** Stateless rules: everything that applies right now. Caller paces delivery. */
export function advise({
  report,
  demand,
  money,
  population,
  maxCrime = 0,
  maxTraffic = 0,
}: AdvisorInput): AdvisorMessage[] {
  const out: AdvisorMessage[] = [];

  // Tutorial arc for a brand-new city.
  if (!report.hasPlant && population === 0 && report.zoneCount === 0) {
    out.push({
      id: "welcome",
      kind: "hint",
      once: true,
      text: "🏗️ Welcome, Mayor! Every city needs electricity — start by placing a Power Plant.",
    });
  }
  if (report.hasPlant && report.zoneCount === 0) {
    out.push({
      id: "first_zones",
      kind: "hint",
      once: true,
      text: "🏘️ The city has power! Now paint Residential, Commercial and Industrial zones next to a road.",
    });
  }

  // Standing problems.
  if (report.unpoweredZones > 0) {
    out.push({
      id: "no_power",
      kind: "warn",
      text: `⚡ ${report.unpoweredZones} zone${report.unpoweredZones === 1 ? " has" : "s have"} no power. Run Power Lines from the plant — roads and zones conduct too.`,
    });
  }
  if (report.roadlessZones > 0) {
    out.push({
      id: "no_road",
      kind: "warn",
      text: `🛣️ ${report.roadlessZones} zone${report.roadlessZones === 1 ? " is" : "s are"} too far from a road — zones need one within ${CONFIG.ROAD_ACCESS_RADIUS} tiles.`,
    });
  }
  if (money < 300) {
    out.push({
      id: "low_funds",
      kind: "warn",
      text: "💸 The treasury is nearly empty. Raise the tax rate (🏛) or wait for tax day.",
    });
  }
  if (report.pollutedResidential >= 3) {
    out.push({
      id: "pollution",
      kind: "warn",
      text: "🏭 Homes choking on pollution won't grow. Keep industry and power plants away — parks (🌳) help nearby land too.",
    });
  }

  // Services.
  if (population >= 300 && report.fireStations === 0) {
    out.push({
      id: "need_fire_dept",
      kind: "hint",
      text: "🚒 The city has no fire department. One station covers a wide area — and fires WILL happen.",
    });
  }
  if (maxCrime > 0.5 && report.policeStations * 2 <= Math.floor(population / 400)) {
    out.push({
      id: "crime_wave",
      kind: "warn",
      text: "🚨 Crime is taking hold — shops won't grow in rough blocks. Build Police Stations (check the 🗺 crime overlay).",
    });
  }

  if (maxTraffic > 0.75) {
    out.push({
      id: "gridlock",
      kind: "warn",
      text: "🚗 Gridlock! Homes next to jammed streets stop growing — add parallel roads to spread the load (see the 🚗 overlay).",
    });
  }

  // Growth pressure: demand is high but there's nowhere to build.
  if (demand.r > 0.5 && report.vacant.r === 0) {
    out.push({
      id: "want_r",
      kind: "hint",
      text: "🏠 People are lining up to move in — zone more Residential!",
    });
  }
  if (demand.c > 0.5 && report.vacant.c === 0) {
    out.push({
      id: "want_c",
      kind: "hint",
      text: "🏬 Shopkeepers see opportunity — zone more Commercial!",
    });
  }
  if (demand.i > 0.5 && report.vacant.i === 0) {
    out.push({
      id: "want_i",
      kind: "hint",
      text: "🏭 Investors want factories — zone more Industrial!",
    });
  }

  return out;
}
