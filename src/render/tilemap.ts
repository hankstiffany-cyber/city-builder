import { CONFIG } from "../config.ts";
import { Grid } from "../sim/grid.ts";
import { TileType, isZone } from "../sim/tiles.ts";
import { Camera } from "./camera.ts";
import { sprite, tileSprite } from "./sprites.ts";

/** Flat fill color per tile type (Phase 6 swaps these for real art). */
const TILE_COLOR: Record<TileType, string> = {
  [TileType.Grass]: "#5a8f4a",
  [TileType.Water]: "#3d6b9e",
  [TileType.Trees]: "#2f6b38",
  [TileType.Road]: "#5b5f68",
  [TileType.PowerLine]: "#8a7f52",
  [TileType.ZoneR]: "#4c9a56",
  [TileType.ZoneC]: "#3f7fc0",
  [TileType.ZoneI]: "#c9a94e",
  [TileType.PowerPlant]: "#9a4f3f",
};

/**
 * Draws the visible slice of the grid. Only tiles inside the camera's view
 * are touched, so cost scales with the viewport, not the 100×100 map.
 */
export function drawTilemap(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  camera: Camera,
  hover: { x: number; y: number } | null
): void {
  const ts = camera.tileSize;
  const { x0, y0, x1, y1 } = camera.visibleTileRange();
  // The no-power indicator blinks on a shared clock so all zones flash in sync.
  const blinkOn =
    Math.floor(performance.now() / (CONFIG.NO_POWER_BLINK_MS / 2)) % 2 === 0;

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = grid.get(tx, ty);
      const type = tile?.type;
      const { x: sx, y: sy } = camera.tileToScreen(tx, ty);
      // +1 covers sub-pixel seams between adjacent fills.
      const size = Math.ceil(ts) + 1;

      if (tile === undefined || type === undefined) {
        ctx.fillStyle = "#10141b"; // out-of-map void
        ctx.fillRect(sx, sy, size, size);
        continue;
      }

      ctx.fillStyle = TILE_COLOR[type];
      ctx.fillRect(sx, sy, size, size);

      // Real building art (level-0 zoned lots + power plant) drawn over the base
      // fill. Until the PNG decodes, tileSprite() returns undefined and we fall
      // back to the flat fill / vector flourish below.
      const img = tileSprite(type);
      if (img) {
        ctx.imageSmoothingEnabled = false; // keep the pixel-art crisp
        ctx.drawImage(img, sx, sy, size, size);
      } else if (type === TileType.Trees) {
        drawTreeDots(ctx, sx, sy, ts);
      } else if (type === TileType.Road) {
        drawRoadDashes(ctx, grid, tx, ty, sx, sy, ts);
      } else if (type === TileType.PowerLine) {
        drawPowerLine(ctx, sx, sy, ts);
      } else if (type === TileType.PowerPlant) {
        drawPlant(ctx, sx, sy, ts);
      }

      // Unpowered zones flash the no-power bolt (Phase 3).
      if (blinkOn && isZone(type) && !tile.powered) {
        const bolt = sprite("icon_nopower");
        if (bolt) {
          ctx.imageSmoothingEnabled = false;
          // Centered at 60% of the tile so the lot art stays recognisable.
          const pad = ts * 0.2;
          ctx.drawImage(bolt, sx + pad, sy + pad, ts - pad * 2, ts - pad * 2);
        }
      }
    }
  }

  // Grid lines only when zoomed in enough to be legible.
  if (ts >= 14) {
    ctx.strokeStyle = "rgba(0,0,0,0.14)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let tx = x0; tx <= x1 + 1; tx++) {
      const sx = Math.round(camera.tileToScreen(tx, 0).x) + 0.5;
      ctx.moveTo(sx, 0);
      ctx.lineTo(sx, ctx.canvas.height);
    }
    for (let ty = y0; ty <= y1 + 1; ty++) {
      const sy = Math.round(camera.tileToScreen(0, ty).y) + 0.5;
      ctx.moveTo(0, sy);
      ctx.lineTo(ctx.canvas.width, sy);
    }
    ctx.stroke();
  }

  // Hover highlight.
  if (hover && grid.inBounds(hover.x, hover.y)) {
    const { x: sx, y: sy } = camera.tileToScreen(hover.x, hover.y);
    ctx.strokeStyle = "rgba(255,255,255,0.9)";
    ctx.lineWidth = 2;
    ctx.strokeRect(sx + 1, sy + 1, ts - 2, ts - 2);
  }
}

function drawTreeDots(ctx: CanvasRenderingContext2D, sx: number, sy: number, ts: number) {
  ctx.fillStyle = "#245029";
  const r = Math.max(1, ts * 0.09);
  ctx.beginPath();
  ctx.arc(sx + ts * 0.35, sy + ts * 0.4, r, 0, Math.PI * 2);
  ctx.arc(sx + ts * 0.62, sy + ts * 0.6, r, 0, Math.PI * 2);
  ctx.fill();
}

/** Center dashes that visually connect to orthogonal road neighbours. */
function drawRoadDashes(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  ts: number
) {
  ctx.fillStyle = "#d9d38a";
  const cx = sx + ts / 2;
  const cy = sy + ts / 2;
  const t = Math.max(1, ts * 0.06);
  const isRoad = (x: number, y: number) => grid.getType(x, y) === TileType.Road;
  const linkH = isRoad(tx - 1, ty) || isRoad(tx + 1, ty);
  const linkV = isRoad(tx, ty - 1) || isRoad(tx, ty + 1);
  if (linkH || (!linkH && !linkV)) ctx.fillRect(sx, cy - t / 2, ts, t);
  if (linkV) ctx.fillRect(cx - t / 2, sy, t, ts);
}

function drawPowerLine(ctx: CanvasRenderingContext2D, sx: number, sy: number, ts: number) {
  ctx.strokeStyle = "#403a20";
  ctx.lineWidth = Math.max(1, ts * 0.08);
  ctx.beginPath();
  ctx.moveTo(sx + ts * 0.2, sy + ts * 0.2);
  ctx.lineTo(sx + ts * 0.8, sy + ts * 0.8);
  ctx.stroke();
}

function drawPlant(ctx: CanvasRenderingContext2D, sx: number, sy: number, ts: number) {
  ctx.fillStyle = "#3a2320";
  ctx.fillRect(sx + ts * 0.2, sy + ts * 0.25, ts * 0.18, ts * 0.5);
  ctx.fillRect(sx + ts * 0.5, sy + ts * 0.25, ts * 0.18, ts * 0.5);
}
