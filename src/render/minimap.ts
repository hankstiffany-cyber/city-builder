import { CONFIG } from "../config.ts";
import { Game } from "../core/game.ts";
import { TileType } from "../sim/tiles.ts";
import { Camera } from "./camera.ts";

/** One pixel per tile on the minimap's offscreen buffer. */
const MINI_COLOR: Record<TileType, string> = {
  [TileType.Grass]: "#5a8f4a",
  [TileType.Water]: "#3d6b9e",
  [TileType.Trees]: "#2f6b38",
  [TileType.Road]: "#8b8f96",
  [TileType.PowerLine]: "#8a7f52",
  [TileType.ZoneR]: "#59c268",
  [TileType.ZoneC]: "#5aa2e8",
  [TileType.ZoneI]: "#e0be55",
  [TileType.PowerPlant]: "#d0604a",
  [TileType.Park]: "#7fd06a",
  [TileType.FireStation]: "#e07a5f",
  [TileType.PoliceStation]: "#6a8fd8",
  [TileType.Fire]: "#ff8c1a",
  [TileType.Rubble]: "#55504a",
};

/**
 * Always-on overview map (bottom-right). The tile buffer redraws only when
 * the world changes (game.version); the viewport rectangle every frame.
 * Click or drag to jump the camera.
 */
export class Minimap {
  private ctx: CanvasRenderingContext2D;
  private buffer: HTMLCanvasElement;
  private bufferCtx: CanvasRenderingContext2D;
  private lastVersion = -1;

  constructor(
    private canvas: HTMLCanvasElement,
    private game: Game,
    private camera: Camera
  ) {
    this.ctx = canvas.getContext("2d")!;
    this.buffer = document.createElement("canvas");
    this.buffer.width = CONFIG.MAP_WIDTH;
    this.buffer.height = CONFIG.MAP_HEIGHT;
    this.bufferCtx = this.buffer.getContext("2d")!;

    const jump = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const tx = ((e.clientX - r.left) / r.width) * CONFIG.MAP_WIDTH;
      const ty = ((e.clientY - r.top) / r.height) * CONFIG.MAP_HEIGHT;
      camera.centerOn(tx, ty);
    };
    canvas.addEventListener("pointerdown", (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      jump(e);
    });
    canvas.addEventListener("pointermove", (e) => {
      if (e.buttons) jump(e);
    });
  }

  draw(): void {
    if (this.game.version !== this.lastVersion) {
      this.lastVersion = this.game.version;
      const bctx = this.bufferCtx;
      this.game.grid.forEach((tile, x, y) => {
        bctx.fillStyle = MINI_COLOR[tile.type];
        bctx.fillRect(x, y, 1, 1);
      });
    }

    const { width, height } = this.canvas;
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.buffer, 0, 0, width, height);

    // Viewport rectangle.
    const range = this.camera.visibleTileRange();
    const sx = width / CONFIG.MAP_WIDTH;
    const sy = height / CONFIG.MAP_HEIGHT;
    this.ctx.strokeStyle = "rgba(255,255,255,0.85)";
    this.ctx.lineWidth = 1.5;
    this.ctx.strokeRect(
      range.x0 * sx,
      range.y0 * sy,
      (range.x1 - range.x0) * sx,
      (range.y1 - range.y0) * sy
    );
  }
}
