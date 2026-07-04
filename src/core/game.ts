import { CONFIG } from "../config.ts";
import { Grid } from "../sim/grid.ts";
import { generateTerrain } from "../sim/terrain.ts";
import { applyTool, type BuildOutcome, type Tool } from "../sim/build.ts";
import { recomputeConnectivity } from "../sim/power.ts";
import { computeDemand, computeStats, monthlyTaxIncome, type Demand } from "../sim/demand.ts";
import { growthTick } from "../sim/growth.ts";
import { computePollution } from "../sim/pollution.ts";
import { computeLandValue } from "../sim/landvalue.ts";
import { decodeInto, encodeSave, type SaveData } from "./save.ts";

export type Speed = "paused" | "slow" | "fast";
export type Difficulty = keyof typeof CONFIG.DIFFICULTY_MONEY;

/**
 * Holds all mutable game state and is the single entry point the UI/input
 * layers call to change the world. Rendering never mutates through here.
 */
export class Game {
  readonly grid: Grid;
  money: number;
  cityName: string = CONFIG.DEFAULT_CITY_NAME;
  tool: Tool = "pan";
  speed: Speed = "slow";
  /** In-game days since founding (Jan 1, 1900). Advances DAYS_PER_TICK per tick. */
  totalDays = 0;
  /** Refreshed each tick; cached here so the HUD never recounts the grid. */
  population = 0;
  demand: Demand = { r: 0, c: 0, i: 0 };
  taxRate: number = CONFIG.TAX_RATE_DEFAULT;
  /** Last month's tax collection, for the HUD income readout. */
  lastIncome = 0;
  /** Land-value heat-map overlay. The field is refreshed while the overlay is on. */
  overlayOn = false;
  landValue: Float32Array | null = null;
  private pollution: Float32Array;
  private lastMonth: number;
  /** Bumped whenever the world changes, so the renderer can skip idle redraws later. */
  version = 0;

  constructor(seed: number = CONFIG.DEFAULT_SEED) {
    this.grid = new Grid(CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this.money = CONFIG.STARTING_MONEY;
    generateTerrain(this.grid, seed);
    recomputeConnectivity(this.grid);
    this.pollution = computePollution(this.grid);
    this.demand = computeDemand(computeStats(this.grid), this.taxRate);
    this.lastMonth = this.monthIndex();
  }

  /** Calendar month counter (years × 12 + month) for tax-day detection. */
  private monthIndex(): number {
    const d = new Date(1900, 0, 1 + this.totalDays);
    return d.getFullYear() * 12 + d.getMonth();
  }

  setTool(tool: Tool): void {
    this.tool = tool;
  }

  setSpeed(speed: Speed): void {
    this.speed = speed;
  }

  setTaxRate(rate: number): void {
    this.taxRate = Math.max(0, Math.min(CONFIG.TAX_RATE_MAX, rate));
  }

  toggleOverlay(): void {
    this.overlayOn = !this.overlayOn;
    // Refresh immediately so the overlay is correct even while paused.
    if (this.overlayOn) {
      this.pollution = computePollution(this.grid);
      this.landValue = computeLandValue(this.grid, this.pollution);
    }
  }

  /**
   * Runs the current tool at a tile and settles the cost against the wallet.
   * Returns the outcome so the UI can give feedback (e.g. flash on no_money).
   */
  build(x: number, y: number): BuildOutcome {
    const outcome = applyTool(this.grid, this.tool, x, y, this.money);
    if (outcome.ok) {
      this.money -= outcome.cost;
      recomputeConnectivity(this.grid);
      if (this.overlayOn) {
        // Keep the heat-map live while painting, even when paused.
        this.pollution = computePollution(this.grid);
        this.landValue = computeLandValue(this.grid, this.pollution);
      }
      this.version++;
    }
    return outcome;
  }

  /**
   * One simulation step: refresh stats + demand from the world as it stands,
   * then let zones grow/decay against that demand. main.ts calls this on the
   * real-time cadence set by `speed`.
   */
  tick(): void {
    const stats = computeStats(this.grid);
    this.population = stats.population;
    this.demand = computeDemand(stats, this.taxRate);
    this.pollution = computePollution(this.grid);
    growthTick(this.grid, this.demand, Math.random, this.pollution);
    if (this.overlayOn) this.landValue = computeLandValue(this.grid, this.pollution);

    this.totalDays += CONFIG.DAYS_PER_TICK;
    const month = this.monthIndex();
    if (month !== this.lastMonth) {
      this.lastMonth = month;
      this.lastIncome = monthlyTaxIncome(stats, this.taxRate);
      this.money += this.lastIncome;
    }
    this.version++;
  }

  /** Snapshot for localStorage autosave or file export. */
  toSave(): SaveData {
    return encodeSave(this);
  }

  /**
   * Restores a snapshot in place (same Game object, so UI references stay
   * valid). Returns false without touching anything if the data is invalid.
   */
  loadSave(data: SaveData): boolean {
    if (!decodeInto(this.grid, data)) return false;
    this.cityName = data.name || CONFIG.DEFAULT_CITY_NAME;
    this.money = data.money;
    this.totalDays = data.totalDays;
    this.taxRate = Math.max(0, Math.min(CONFIG.TAX_RATE_MAX, data.taxRate));
    this.lastIncome = 0;
    this.lastMonth = this.monthIndex();
    this.refreshDerived();
    return true;
  }

  /** Wipes the world and starts over on a fresh map with difficulty-based funds. */
  newGame(difficulty: Difficulty, seed: number = Math.floor(Math.random() * 2 ** 31)): void {
    generateTerrain(this.grid, seed);
    this.money = CONFIG.DIFFICULTY_MONEY[difficulty];
    this.cityName = CONFIG.DEFAULT_CITY_NAME;
    this.totalDays = 0;
    this.taxRate = CONFIG.TAX_RATE_DEFAULT;
    this.lastIncome = 0;
    this.population = 0;
    this.lastMonth = this.monthIndex();
    this.speed = "slow";
    this.refreshDerived();
  }

  /** Recomputes everything the sim derives from tile types + levels. */
  private refreshDerived(): void {
    recomputeConnectivity(this.grid);
    this.pollution = computePollution(this.grid);
    const stats = computeStats(this.grid);
    this.population = stats.population;
    this.demand = computeDemand(stats, this.taxRate);
    if (this.overlayOn) this.landValue = computeLandValue(this.grid, this.pollution);
    this.version++;
  }
}
