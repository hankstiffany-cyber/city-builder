import { Game } from "../core/game.ts";
import { Camera } from "../render/camera.ts";

/**
 * Top-of-screen readout: money, active tool, hovered tile + its type, and the
 * current zoom. Also doubles as the Phase 1 debug overlay (§6 practice #7).
 */
export class Hud {
  private moneyEl: HTMLElement;
  private debugEl: HTMLElement;

  constructor(container: HTMLElement) {
    container.innerHTML =
      `<div class="hud-money" id="hud-money"></div>` +
      `<div class="hud-debug" id="hud-debug"></div>`;
    this.moneyEl = container.querySelector("#hud-money")!;
    this.debugEl = container.querySelector("#hud-debug")!;
  }

  update(game: Game, camera: Camera, hover: { x: number; y: number } | null): void {
    const broke = game.money <= 0;
    this.moneyEl.textContent = `$${game.money.toLocaleString()}`;
    this.moneyEl.classList.toggle("broke", broke);

    const tileInfo =
      hover && game.grid.inBounds(hover.x, hover.y)
        ? `(${hover.x}, ${hover.y}) · ${game.grid.getType(hover.x, hover.y)}`
        : "— off map —";
    this.debugEl.textContent = `${game.tool}  |  ${tileInfo}  |  ${Math.round(
      camera.zoom * 100
    )}%`;
  }
}
