import { Game, type Speed } from "../core/game.ts";
import { Camera } from "../render/camera.ts";

const SPEEDS: Array<{ speed: Speed; icon: string; label: string }> = [
  { speed: "paused", icon: "⏸", label: "Pause" },
  { speed: "slow", icon: "▶", label: "Normal speed" },
  { speed: "fast", icon: "⏩", label: "Fast speed" },
];

/** The city was founded on Jan 1, 1900; `totalDays` counts forward from there. */
function formatDate(totalDays: number): string {
  const date = new Date(1900, 0, 1 + totalDays);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

/**
 * Top-of-screen readout: money, population + date + RCI demand, hovered-tile
 * debug info, and the sim speed controls.
 */
export class Hud {
  private moneyEl: HTMLElement;
  private statsEl: HTMLElement;
  private debugEl: HTMLElement;
  private speedButtons = new Map<Speed, HTMLButtonElement>();

  constructor(container: HTMLElement, game: Game) {
    container.innerHTML =
      `<div class="hud-money" id="hud-money"></div>` +
      `<div class="hud-stats" id="hud-stats"></div>` +
      `<div class="hud-debug" id="hud-debug"></div>` +
      `<div class="hud-speed" id="hud-speed"></div>`;
    this.moneyEl = container.querySelector("#hud-money")!;
    this.statsEl = container.querySelector("#hud-stats")!;
    this.debugEl = container.querySelector("#hud-debug")!;

    const speedEl = container.querySelector("#hud-speed")!;
    for (const def of SPEEDS) {
      const btn = document.createElement("button");
      btn.className = "speed-btn";
      btn.type = "button";
      btn.textContent = def.icon;
      btn.title = def.label;
      btn.setAttribute("aria-label", def.label);
      btn.addEventListener("click", () => game.setSpeed(def.speed));
      speedEl.appendChild(btn);
      this.speedButtons.set(def.speed, btn);
    }
  }

  update(game: Game, camera: Camera, hover: { x: number; y: number } | null): void {
    const broke = game.money <= 0;
    this.moneyEl.textContent = `$${game.money.toLocaleString()}`;
    this.moneyEl.classList.toggle("broke", broke);

    const { r, c, i } = game.demand;
    this.statsEl.textContent =
      `👥 ${game.population.toLocaleString()} · ${formatDate(game.totalDays)}` +
      ` · R${Math.round(r * 100)} C${Math.round(c * 100)} I${Math.round(i * 100)}`;

    for (const [speed, btn] of this.speedButtons) {
      btn.classList.toggle("active", game.speed === speed);
    }

    let tileInfo = "— off map —";
    if (hover && game.grid.inBounds(hover.x, hover.y)) {
      const tile = game.grid.get(hover.x, hover.y)!;
      tileInfo = `(${hover.x}, ${hover.y}) · ${tile.type}`;
      if (tile.level > 0) tileInfo += ` L${tile.level}`;
      if (tile.powered) tileInfo += " · ⚡";
      if (tile.roadAccess) tileInfo += " · 🛣";
    }
    this.debugEl.textContent = `${game.tool}  |  ${tileInfo}  |  ${Math.round(
      camera.zoom * 100
    )}%`;
  }
}
