import { CONFIG } from "../config.ts";
import { Grid } from "../sim/grid.ts";
import { TileType } from "../sim/tiles.ts";
import { generateTerrain } from "../sim/terrain.ts";
import { applyTool, type BuildOutcome, type Tool } from "../sim/build.ts";
import { recomputeConnectivity } from "../sim/power.ts";
import { computeDemand, computeStats, monthlyTaxIncome, type Demand } from "../sim/demand.ts";
import { growthTick } from "../sim/growth.ts";
import { computePollution } from "../sim/pollution.ts";
import { computeLandValue } from "../sim/landvalue.ts";
import { computeCoverage } from "../sim/coverage.ts";
import { computeCrime } from "../sim/crime.ts";
import { computeTraffic } from "../sim/traffic.ts";
import { fireTick } from "../sim/fire.ts";
import { advise, collectReport, type AdvisorMessage } from "../sim/advisor.ts";
import { decodeInto, encodeSave, type SaveData } from "./save.ts";

export type Speed = "paused" | "slow" | "fast";
export type Difficulty = keyof typeof CONFIG.DIFFICULTY_MONEY;
export type OverlayMode = "none" | "value" | "crime" | "traffic";

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
  /** Last month's net income (taxes − station upkeep), for the HUD readout. */
  lastIncome = 0;
  /** Heat-map overlay: land value or crime. Field refreshed while active. */
  overlayMode: OverlayMode = "none";
  overlayField: Float32Array | null = null;
  /** Advisor messages waiting for the UI to show as toasts. Drained by main.ts. */
  messages: AdvisorMessage[] = [];
  /** Highest population milestone already celebrated (persisted in saves). */
  popMilestone = 0;
  private pollution: Float32Array;
  private fireCoverage: Float32Array;
  private policeCoverage: Float32Array;
  private crime: Float32Array;
  private traffic: Float32Array;
  private lastMonth: number;
  private tickCount = 0;
  private shownOnce = new Set<string>();
  private messageCooldown = new Map<string, number>();
  /** Bumped whenever the world changes, so the renderer can skip idle redraws later. */
  version = 0;

  constructor(seed: number = CONFIG.DEFAULT_SEED) {
    this.grid = new Grid(CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this.money = CONFIG.STARTING_MONEY;
    generateTerrain(this.grid, seed);
    recomputeConnectivity(this.grid);
    this.pollution = computePollution(this.grid);
    this.fireCoverage = computeCoverage(this.grid, TileType.FireStation);
    this.policeCoverage = computeCoverage(this.grid, TileType.PoliceStation);
    this.crime = computeCrime(this.grid, this.policeCoverage);
    this.traffic = computeTraffic(this.grid);
    this.demand = computeDemand(computeStats(this.grid), this.taxRate);
    this.lastMonth = this.monthIndex();
  }

  /**
   * Day/night dimming in [0, NIGHT_MAX_DARKNESS]. Runs on the tick clock, so
   * it pauses with the sim and spins faster on fast-forward. Starts at noon.
   */
  get darkness(): number {
    const phase = (this.tickCount % CONFIG.DAY_NIGHT_TICKS) / CONFIG.DAY_NIGHT_TICKS;
    const daylight = 0.5 + 0.5 * Math.cos(phase * Math.PI * 2);
    return (1 - daylight) * CONFIG.NIGHT_MAX_DARKNESS;
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

  /** Cycles the heat-map: off → land value → crime → traffic → off. */
  cycleOverlay(): void {
    const order: OverlayMode[] = ["none", "value", "crime", "traffic"];
    this.overlayMode = order[(order.indexOf(this.overlayMode) + 1) % order.length];
    this.refreshFields();
    this.refreshOverlay();
  }

  private refreshOverlay(): void {
    if (this.overlayMode === "value") {
      this.overlayField = computeLandValue(this.grid, this.pollution, this.crime, this.traffic);
    } else if (this.overlayMode === "crime") {
      this.overlayField = this.crime;
    } else if (this.overlayMode === "traffic") {
      this.overlayField = this.traffic;
    } else {
      this.overlayField = null;
    }
  }

  /** Pollution, service coverage, and crime — everything splatted from tiles. */
  private refreshFields(): void {
    this.pollution = computePollution(this.grid);
    this.fireCoverage = computeCoverage(this.grid, TileType.FireStation);
    this.policeCoverage = computeCoverage(this.grid, TileType.PoliceStation);
    this.crime = computeCrime(this.grid, this.policeCoverage);
    this.traffic = computeTraffic(this.grid);
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
      if (this.overlayMode !== "none") {
        // Keep the heat-map live while painting, even when paused.
        this.refreshFields();
        this.refreshOverlay();
      }
      if (this.tool === "power_plant") {
        this.emit({
          id: "first_plant",
          kind: "success",
          text: "⚡ The city has power! Anything touching the plant's network is live.",
          once: true,
        });
      }
      this.version++;
    } else if (outcome.reason === "no_money") {
      this.emit({ id: "cant_afford", kind: "warn", text: "💸 Not enough money for that." }, 4);
    }
    return outcome;
  }

  /**
   * One simulation step: refresh stats + demand, run fires against fire
   * coverage, let zones grow/decay against demand (dampened by pollution and
   * crime), then settle the calendar. main.ts calls this on the real-time
   * cadence set by `speed`.
   */
  tick(): void {
    const stats = computeStats(this.grid);
    this.population = stats.population;
    this.demand = computeDemand(stats, this.taxRate);
    this.refreshFields();

    const fire = fireTick(this.grid, this.fireCoverage);
    if (fire.changed) {
      // Fire can sever the power network or destroy a station mid-tick.
      recomputeConnectivity(this.grid);
      if (fire.ignited > 0) {
        this.emit(
          { id: "fire", kind: "warn", text: "🔥 FIRE! It spreads to anything flammable — roads and water stop it, and fire stations (🚒) fight it." },
          8
        );
      }
    }

    growthTick(this.grid, this.demand, Math.random, this.pollution, this.crime, this.traffic);
    this.refreshOverlay();

    this.totalDays += CONFIG.DAYS_PER_TICK;
    const month = this.monthIndex();
    if (month !== this.lastMonth) {
      this.lastMonth = month;
      let stations = 0;
      this.grid.forEach((t) => {
        if (t.type === TileType.FireStation || t.type === TileType.PoliceStation) stations++;
      });
      this.lastIncome = monthlyTaxIncome(stats, this.taxRate) - stations * CONFIG.STATION_UPKEEP;
      this.money += this.lastIncome;
    }

    this.tickCount++;
    this.runAdvisor();
    this.version++;
  }

  /** Advisor rules + population milestones, paced by once-flags and cooldowns. */
  private runAdvisor(): void {
    const report = collectReport(this.grid, this.pollution);
    let maxCrime = 0;
    let maxTraffic = 0;
    for (let i = 0; i < this.crime.length; i++) {
      if (this.crime[i] > maxCrime) maxCrime = this.crime[i];
      if (this.traffic[i] > maxTraffic) maxTraffic = this.traffic[i];
    }
    for (const msg of advise({
      report,
      demand: this.demand,
      money: this.money,
      population: this.population,
      maxCrime,
      maxTraffic,
    })) {
      this.emit(msg);
    }

    const next = CONFIG.MILESTONES.find((m) => m > this.popMilestone);
    if (next !== undefined && this.population >= next) {
      this.popMilestone = next;
      this.emit({
        id: `milestone_${next}`,
        kind: "success",
        text: `🎉 ${this.cityName} has reached ${next.toLocaleString()} residents!`,
        once: true,
      });
    }
  }

  /** Queues a message unless its once-flag or cooldown says it's too soon. */
  private emit(msg: AdvisorMessage, cooldown: number = CONFIG.ADVISOR_COOLDOWN_TICKS): void {
    if (msg.once) {
      if (this.shownOnce.has(msg.id)) return;
      this.shownOnce.add(msg.id);
    } else {
      if (this.tickCount < (this.messageCooldown.get(msg.id) ?? 0)) return;
      this.messageCooldown.set(msg.id, this.tickCount + cooldown);
    }
    this.messages.push(msg);
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
    this.popMilestone = typeof data.popMilestone === "number" ? data.popMilestone : 0;
    this.lastIncome = 0;
    this.lastMonth = this.monthIndex();
    this.resetAdvisor();
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
    this.popMilestone = 0;
    this.lastMonth = this.monthIndex();
    this.speed = "slow";
    this.resetAdvisor();
    this.refreshDerived();
  }

  /** Clears advisor pacing state so a new/loaded city gets fresh guidance. */
  private resetAdvisor(): void {
    this.messages.length = 0;
    this.shownOnce.clear();
    this.messageCooldown.clear();
    this.tickCount = 0;
  }

  /** Recomputes everything the sim derives from tile types + levels. */
  private refreshDerived(): void {
    recomputeConnectivity(this.grid);
    this.refreshFields();
    const stats = computeStats(this.grid);
    this.population = stats.population;
    this.demand = computeDemand(stats, this.taxRate);
    this.refreshOverlay();
    this.version++;
  }
}
