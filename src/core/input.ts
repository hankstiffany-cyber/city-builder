import { CONFIG } from "../config.ts";
import { Camera } from "../render/camera.ts";
import { Game } from "./game.ts";

interface Pt {
  x: number;
  y: number;
}

/**
 * Unifies mouse + touch via Pointer Events and turns them into camera moves
 * and build actions:
 *
 *   • Pan tool  → one-finger / left-drag pans.
 *   • Build tool → one-finger / left-drag paints tiles (with line fill so fast
 *                  drags leave no gaps). Right/middle-drag pans instead.
 *   • Two fingers → pinch-zoom + pan together, regardless of tool.
 *   • Wheel      → zoom toward the cursor.
 */
export class Input {
  /** Tile currently under the cursor, for the hover highlight + HUD. */
  hover: { x: number; y: number } | null = null;

  private pointers = new Map<number, Pt>();
  private mode: "idle" | "paint" | "pan" | "gesture" = "idle";
  private lastPan: Pt = { x: 0, y: 0 };
  private lastPaintTile: Pt | null = null;
  private gestureDist = 0;
  private gestureMid: Pt = { x: 0, y: 0 };

  constructor(
    private canvas: HTMLCanvasElement,
    private camera: Camera,
    private game: Game
  ) {
    canvas.addEventListener("pointerdown", this.onDown);
    canvas.addEventListener("pointermove", this.onMove);
    canvas.addEventListener("pointerup", this.onUp);
    canvas.addEventListener("pointercancel", this.onUp);
    canvas.addEventListener("pointerleave", this.onLeave);
    canvas.addEventListener("wheel", this.onWheel, { passive: false });
    canvas.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  private pos(e: PointerEvent): Pt {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  private onDown = (e: PointerEvent) => {
    e.preventDefault();
    this.canvas.setPointerCapture(e.pointerId);
    const p = this.pos(e);
    this.pointers.set(e.pointerId, p);
    this.hover = this.camera.screenToTile(p.x, p.y);

    if (this.pointers.size >= 2) {
      this.beginGesture();
      return;
    }

    // Right / middle mouse button always pans, even with a build tool.
    const forcePan = e.pointerType === "mouse" && (e.button === 1 || e.button === 2);
    if (this.game.tool === "pan" || forcePan) {
      this.mode = "pan";
      this.lastPan = p;
    } else {
      this.mode = "paint";
      this.lastPaintTile = null;
      this.paintAt(p);
    }
  };

  private onMove = (e: PointerEvent) => {
    const p = this.pos(e);
    if (this.pointers.has(e.pointerId)) this.pointers.set(e.pointerId, p);
    this.hover = this.camera.screenToTile(p.x, p.y);

    if (this.mode === "gesture" && this.pointers.size >= 2) {
      this.updateGesture();
      return;
    }
    if (this.mode === "pan") {
      this.camera.panByPixels(p.x - this.lastPan.x, p.y - this.lastPan.y);
      this.lastPan = p;
      return;
    }
    if (this.mode === "paint") {
      this.paintAt(p);
    }
  };

  private onUp = (e: PointerEvent) => {
    this.pointers.delete(e.pointerId);
    if (this.canvas.hasPointerCapture(e.pointerId)) {
      this.canvas.releasePointerCapture(e.pointerId);
    }
    if (this.pointers.size === 0) {
      this.mode = "idle";
      this.lastPaintTile = null;
    } else if (this.pointers.size === 1) {
      // Dropped from two fingers to one: settle into a pan without a jump.
      this.mode = "pan";
      this.lastPan = [...this.pointers.values()][0];
    }
  };

  private onLeave = () => {
    if (this.pointers.size === 0) this.hover = null;
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const r = this.canvas.getBoundingClientRect();
    const factor = e.deltaY < 0 ? CONFIG.ZOOM_STEP : 1 / CONFIG.ZOOM_STEP;
    this.camera.zoomAt(factor, e.clientX - r.left, e.clientY - r.top);
  };

  // --- Two-finger pinch/pan ---

  private beginGesture(): void {
    this.mode = "gesture";
    const [a, b] = [...this.pointers.values()];
    this.gestureDist = dist(a, b);
    this.gestureMid = mid(a, b);
  }

  private updateGesture(): void {
    const [a, b] = [...this.pointers.values()];
    const newDist = dist(a, b);
    const newMid = mid(a, b);
    // Pan by the midpoint movement.
    this.camera.panByPixels(newMid.x - this.gestureMid.x, newMid.y - this.gestureMid.y);
    // Zoom by the change in finger spread, anchored at the midpoint.
    if (this.gestureDist > 0) {
      this.camera.zoomAt(newDist / this.gestureDist, newMid.x, newMid.y);
    }
    this.gestureDist = newDist;
    this.gestureMid = newMid;
  }

  // --- Painting ---

  private paintAt(p: Pt): void {
    const tile = this.camera.screenToTile(p.x, p.y);
    if (this.lastPaintTile) {
      // Fill every tile along the drag so fast strokes don't skip cells.
      this.paintLine(this.lastPaintTile, tile);
    } else {
      this.game.build(tile.x, tile.y);
    }
    this.lastPaintTile = tile;
  }

  /** Integer line raster (Bresenham) from a→b, building each tile once. */
  private paintLine(a: Pt, b: Pt): void {
    let x0 = a.x;
    let y0 = a.y;
    const dx = Math.abs(b.x - x0);
    const dy = -Math.abs(b.y - y0);
    const sx = x0 < b.x ? 1 : -1;
    const sy = y0 < b.y ? 1 : -1;
    let err = dx + dy;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      this.game.build(x0, y0);
      if (x0 === b.x && y0 === b.y) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }
}

function dist(a: Pt, b: Pt): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function mid(a: Pt, b: Pt): Pt {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}
