import { CONFIG } from "../config.ts";
import { Grid } from "../sim/grid.ts";
import { generateTerrain } from "../sim/terrain.ts";
import { applyTool, type BuildOutcome, type Tool } from "../sim/build.ts";

/**
 * Holds all mutable game state and is the single entry point the UI/input
 * layers call to change the world. Rendering never mutates through here.
 */
export class Game {
  readonly grid: Grid;
  money: number;
  tool: Tool = "pan";
  /** Bumped whenever the world changes, so the renderer can skip idle redraws later. */
  version = 0;

  constructor(seed: number = CONFIG.DEFAULT_SEED) {
    this.grid = new Grid(CONFIG.MAP_WIDTH, CONFIG.MAP_HEIGHT);
    this.money = CONFIG.STARTING_MONEY;
    generateTerrain(this.grid, seed);
  }

  setTool(tool: Tool): void {
    this.tool = tool;
  }

  /**
   * Runs the current tool at a tile and settles the cost against the wallet.
   * Returns the outcome so the UI can give feedback (e.g. flash on no_money).
   */
  build(x: number, y: number): BuildOutcome {
    const outcome = applyTool(this.grid, this.tool, x, y, this.money);
    if (outcome.ok) {
      this.money -= outcome.cost;
      this.version++;
    }
    return outcome;
  }
}
