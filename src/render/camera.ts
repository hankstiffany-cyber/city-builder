import { CONFIG } from "../config.ts";

/**
 * Maps between screen (CSS pixels) and world (tile) space, and owns pan/zoom.
 * World origin is the top-left of tile (0,0). One world unit = one tile.
 */
export class Camera {
  /** World-space coordinate shown at the top-left of the viewport. */
  x = 0;
  y = 0;
  zoom = 1;

  constructor(
    private viewportW: number,
    private viewportH: number
  ) {}

  /** Pixel size of one tile at the current zoom. */
  get tileSize(): number {
    return CONFIG.BASE_TILE_SIZE * this.zoom;
  }

  setViewport(w: number, h: number): void {
    this.viewportW = w;
    this.viewportH = h;
    this.clamp();
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const ts = this.tileSize;
    return { x: this.x + sx / ts, y: this.y + sy / ts };
  }

  screenToTile(sx: number, sy: number): { x: number; y: number } {
    const w = this.screenToWorld(sx, sy);
    return { x: Math.floor(w.x), y: Math.floor(w.y) };
  }

  /** Top-left screen pixel of a given tile. */
  tileToScreen(tx: number, ty: number): { x: number; y: number } {
    const ts = this.tileSize;
    return { x: (tx - this.x) * ts, y: (ty - this.y) * ts };
  }

  /** Pan by a screen-pixel delta (e.g. a drag). */
  panByPixels(dxPx: number, dyPx: number): void {
    const ts = this.tileSize;
    this.x -= dxPx / ts;
    this.y -= dyPx / ts;
    this.clamp();
  }

  /** Zoom by `factor` while keeping the world point under (sx,sy) fixed. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const before = this.screenToWorld(sx, sy);
    this.zoom = clamp(this.zoom * factor, CONFIG.MIN_ZOOM, CONFIG.MAX_ZOOM);
    const after = this.screenToWorld(sx, sy);
    // Shift so the anchor world-point lands back under the cursor.
    this.x += before.x - after.x;
    this.y += before.y - after.y;
    this.clamp();
  }

  /** Range of tiles currently visible (inclusive), for cull-limited drawing. */
  visibleTileRange(): { x0: number; y0: number; x1: number; y1: number } {
    const ts = this.tileSize;
    return {
      x0: Math.floor(this.x),
      y0: Math.floor(this.y),
      x1: Math.ceil(this.x + this.viewportW / ts),
      y1: Math.ceil(this.y + this.viewportH / ts),
    };
  }

  /** Keep the map from drifting entirely off-screen. */
  private clamp(): void {
    const ts = this.tileSize;
    const viewTilesX = this.viewportW / ts;
    const viewTilesY = this.viewportH / ts;
    const maxX = CONFIG.MAP_WIDTH - viewTilesX;
    const maxY = CONFIG.MAP_HEIGHT - viewTilesY;
    // When the map is smaller than the viewport, center it instead.
    this.x = maxX < 0 ? maxX / 2 : clamp(this.x, 0, maxX);
    this.y = maxY < 0 ? maxY / 2 : clamp(this.y, 0, maxY);
  }

  /** Center the camera on a tile coordinate. */
  centerOn(tx: number, ty: number): void {
    const ts = this.tileSize;
    this.x = tx - this.viewportW / ts / 2;
    this.y = ty - this.viewportH / ts / 2;
    this.clamp();
  }
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
