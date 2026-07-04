import { CONFIG } from "../config.ts";
import { Grid } from "../sim/grid.ts";
import { TileType, isZone } from "../sim/tiles.ts";
import { Camera } from "./camera.ts";
import { sprite, tileSprite } from "./sprites.ts";

/**
 * Phase 6 art pass. Buildings use real sprites; terrain, roads, and power
 * lines are drawn procedurally — but every procedural tile first checks for
 * a sprite by a documented name, so hand-drawn art can replace any of it by
 * just adding a PNG under src/assets/:
 *
 *   grass.png, water.png, trees.png            — full-tile terrain art
 *   road_<mask>.png, powerline_<mask>.png      — mask bits: N=1 E=2 S=4 W=8
 *   power_plant.png, res/com/ind_<level>[b].png — buildings (see sprites.ts)
 */

/** Zone tint drawn under the (transparent-background) lot/building art. */
const ZONE_TINT: Record<string, string> = {
  [TileType.ZoneR]: "#4c9a56",
  [TileType.ZoneC]: "#3f7fc0",
  [TileType.ZoneI]: "#c9a94e",
  [TileType.PowerPlant]: "#9a4f3f",
};

const GRASS_SHADES = ["#5a8f4a", "#568b46", "#5f9350", "#548845"];

/** Cheap 2D integer hash — stable per tile, uncorrelated between neighbours. */
function hash2(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (h ^ (h >>> 16)) >>> 0;
}

/**
 * Draws the visible slice of the grid. Only tiles inside the camera's view
 * are touched, so cost scales with the viewport, not the 100×100 map.
 */
export function drawTilemap(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  camera: Camera,
  hover: { x: number; y: number } | null,
  /** Land-value field in [0,1] to draw as a heat map, or null for no overlay. */
  overlay: Float32Array | null = null
): void {
  const ts = camera.tileSize;
  const now = performance.now();
  const { x0, y0, x1, y1 } = camera.visibleTileRange();
  // The no-power indicator blinks on a shared clock so all zones flash in sync.
  const blinkOn = Math.floor(now / (CONFIG.NO_POWER_BLINK_MS / 2)) % 2 === 0;

  for (let ty = y0; ty <= y1; ty++) {
    for (let tx = x0; tx <= x1; tx++) {
      const tile = grid.get(tx, ty);
      const { x: sx, y: sy } = camera.tileToScreen(tx, ty);
      // +1 covers sub-pixel seams between adjacent fills.
      const size = Math.ceil(ts) + 1;

      if (tile === undefined) {
        ctx.fillStyle = "#10141b"; // out-of-map void
        ctx.fillRect(sx, sy, size, size);
        continue;
      }

      const type = tile.type;
      switch (type) {
        case TileType.Grass:
          drawGrass(ctx, tx, ty, sx, sy, size);
          break;
        case TileType.Water:
          drawWater(ctx, grid, tx, ty, sx, sy, size, ts, now);
          break;
        case TileType.Trees:
          drawTrees(ctx, tx, ty, sx, sy, size, ts);
          break;
        case TileType.Road:
          drawRoad(ctx, grid, tx, ty, sx, sy, size, ts);
          break;
        case TileType.PowerLine:
          drawPowerLine(ctx, grid, tx, ty, sx, sy, size, ts);
          break;
        case TileType.Park:
          drawPark(ctx, tx, ty, sx, sy, size, ts);
          break;
        default: {
          // Zones + power plant: tinted ground, then the building sprite.
          ctx.fillStyle = ZONE_TINT[type];
          ctx.fillRect(sx, sy, size, size);
          const img = tileSprite(tile, tx, ty);
          if (img) {
            ctx.imageSmoothingEnabled = false; // keep the pixel-art crisp
            ctx.drawImage(img, sx, sy, size, size);
          }
          if (type === TileType.PowerPlant) {
            drawSmoke(ctx, tx, ty, sx, sy, ts, now);
          }
        }
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

      // Land-value heat map: cold blue (low) → warm red (high).
      if (overlay) {
        const v = overlay[ty * grid.width + tx];
        ctx.fillStyle = `hsla(${Math.round(240 - v * 240)}, 90%, 50%, 0.4)`;
        ctx.fillRect(sx, sy, size, size);
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

// --- Terrain ---

function drawGrass(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  size: number
): void {
  const img = sprite("grass");
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, size, size);
    return;
  }
  ctx.fillStyle = GRASS_SHADES[hash2(tx, ty) % GRASS_SHADES.length];
  ctx.fillRect(sx, sy, size, size);
}

function drawWater(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  size: number,
  ts: number,
  now: number
): void {
  const img = sprite("water");
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, size, size);
    return;
  }
  // Gentle twinkle: each tile steps through 3 close shades on its own phase.
  const h = hash2(tx, ty);
  const step = (h + Math.floor(now / 600)) % 3;
  ctx.fillStyle = `hsl(211, 45%, ${33 + step * 2}%)`;
  ctx.fillRect(sx, sy, size, size);

  // Light foam edge against any adjacent land tile.
  const isLand = (x: number, y: number) => {
    const t = grid.getType(x, y);
    return t !== undefined && t !== TileType.Water;
  };
  const edge = Math.max(1.5, ts * 0.1);
  ctx.fillStyle = "rgba(215, 235, 250, 0.35)";
  if (isLand(tx, ty - 1)) ctx.fillRect(sx, sy, size, edge);
  if (isLand(tx, ty + 1)) ctx.fillRect(sx, sy + size - edge, size, edge);
  if (isLand(tx - 1, ty)) ctx.fillRect(sx, sy, edge, size);
  if (isLand(tx + 1, ty)) ctx.fillRect(sx + size - edge, sy, edge, size);
}

function drawTrees(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  size: number,
  ts: number
): void {
  const img = sprite("trees");
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, size, size);
    return;
  }
  drawGrass(ctx, tx, ty, sx, sy, size);
  // 2–3 canopy blobs, arranged by the tile hash so forests look irregular.
  const h = hash2(tx, ty);
  const blobs = 2 + (h % 2);
  for (let k = 0; k < blobs; k++) {
    const bx = sx + ts * (0.25 + (((h >> (k * 5)) & 15) / 15) * 0.5);
    const by = sy + ts * (0.25 + (((h >> (k * 5 + 3)) & 15) / 15) * 0.5);
    const r = Math.max(1.5, ts * (0.16 + ((h >> (k * 3)) & 3) * 0.02));
    ctx.fillStyle = "#1f4a26"; // shadowed outline
    ctx.beginPath();
    ctx.arc(bx + ts * 0.02, by + ts * 0.03, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#2f6b38";
    ctx.beginPath();
    ctx.arc(bx, by, r * 0.88, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#3d7d45"; // sun-lit crown
    ctx.beginPath();
    ctx.arc(bx - r * 0.25, by - r * 0.25, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPark(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  size: number,
  ts: number
): void {
  const img = sprite("park");
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, size, size);
    return;
  }
  // Manicured lawn, a tree, and a couple of flowers.
  ctx.fillStyle = "#67a555";
  ctx.fillRect(sx, sy, size, size);
  const h = hash2(tx, ty);
  const cx = sx + ts * (0.35 + ((h & 7) / 7) * 0.3);
  const cy = sy + ts * (0.3 + (((h >> 3) & 7) / 7) * 0.2);
  const r = Math.max(2, ts * 0.18);
  ctx.fillStyle = "#2c5e33";
  ctx.beginPath();
  ctx.arc(cx + ts * 0.02, cy + ts * 0.03, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#3f8a4a";
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.85, 0, Math.PI * 2);
  ctx.fill();
  const flowers = ["#e5c94e", "#d96a6a", "#e08bd0"];
  for (let k = 0; k < 3; k++) {
    const fx = sx + ts * (0.15 + (((h >> (k * 4)) & 15) / 15) * 0.7);
    const fy = sy + ts * (0.6 + (((h >> (k * 4 + 2)) & 7) / 7) * 0.3);
    ctx.fillStyle = flowers[(h >> k) % 3];
    ctx.fillRect(fx, fy, Math.max(1.5, ts * 0.07), Math.max(1.5, ts * 0.07));
  }
}

// --- Infrastructure ---

/** Bitmask of orthogonal neighbours matching `match`: N=1, E=2, S=4, W=8. */
function neighbourMask(
  grid: Grid,
  tx: number,
  ty: number,
  match: (t: TileType | undefined) => boolean
): number {
  let mask = 0;
  if (match(grid.getType(tx, ty - 1))) mask |= 1;
  if (match(grid.getType(tx + 1, ty))) mask |= 2;
  if (match(grid.getType(tx, ty + 1))) mask |= 4;
  if (match(grid.getType(tx - 1, ty))) mask |= 8;
  return mask;
}

function drawRoad(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  size: number,
  ts: number
): void {
  const mask = neighbourMask(grid, tx, ty, (t) => t === TileType.Road);
  const img = sprite(`road_${mask}`);
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, size, size);
    return;
  }

  ctx.fillStyle = "#4a4e55"; // asphalt
  ctx.fillRect(sx, sy, size, size);

  // Pale shoulder along any side with no connecting road.
  const shoulder = Math.max(1, ts * 0.08);
  ctx.fillStyle = "#6d7178";
  if (!(mask & 1)) ctx.fillRect(sx, sy, size, shoulder);
  if (!(mask & 4)) ctx.fillRect(sx, sy + size - shoulder, size, shoulder);
  if (!(mask & 8)) ctx.fillRect(sx, sy, shoulder, size);
  if (!(mask & 2)) ctx.fillRect(sx + size - shoulder, sy, shoulder, size);

  // Centre-line dashes reaching toward each connected neighbour.
  const cx = sx + ts / 2;
  const cy = sy + ts / 2;
  const t = Math.max(1, ts * 0.06);
  const half = ts / 2;
  ctx.fillStyle = "#d9d38a";
  if (mask === 0) {
    ctx.fillRect(sx + ts * 0.15, cy - t / 2, ts * 0.7, t); // isolated stub
  } else {
    if (mask & 1) ctx.fillRect(cx - t / 2, sy, t, half);
    if (mask & 4) ctx.fillRect(cx - t / 2, cy, t, half);
    if (mask & 8) ctx.fillRect(sx, cy - t / 2, half, t);
    if (mask & 2) ctx.fillRect(cx, cy - t / 2, half, t);
  }
}

function drawPowerLine(
  ctx: CanvasRenderingContext2D,
  grid: Grid,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  size: number,
  ts: number
): void {
  // Wires run toward anything that carries current onward.
  const mask = neighbourMask(
    grid,
    tx,
    ty,
    (t) => t === TileType.PowerLine || t === TileType.PowerPlant
  );
  const img = sprite(`powerline_${mask}`);
  if (img) {
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, sx, sy, size, size);
    return;
  }

  drawGrass(ctx, tx, ty, sx, sy, size);
  const cx = sx + ts / 2;
  const wireY = sy + ts * 0.32;

  // Wires out to each connected side (or a short stub pair when isolated).
  ctx.strokeStyle = "#2e2a1c";
  ctx.lineWidth = Math.max(1, ts * 0.05);
  ctx.beginPath();
  if (mask & 1) {
    ctx.moveTo(cx, wireY);
    ctx.lineTo(cx, sy);
  }
  if (mask & 4) {
    ctx.moveTo(cx, wireY);
    ctx.lineTo(cx, sy + size);
  }
  if (mask & 8 || mask === 0) {
    ctx.moveTo(cx, wireY);
    ctx.lineTo(sx, wireY);
  }
  if (mask & 2 || mask === 0) {
    ctx.moveTo(cx, wireY);
    ctx.lineTo(sx + size, wireY);
  }
  ctx.stroke();

  // Pylon: pole + crossarm.
  const poleW = Math.max(1.5, ts * 0.09);
  ctx.fillStyle = "#5c4a2e";
  ctx.fillRect(cx - poleW / 2, sy + ts * 0.22, poleW, ts * 0.58);
  ctx.fillRect(cx - ts * 0.22, wireY - poleW / 2, ts * 0.44, poleW);
}

/** Drifting smoke puffs above a power plant's stacks. */
function drawSmoke(
  ctx: CanvasRenderingContext2D,
  tx: number,
  ty: number,
  sx: number,
  sy: number,
  ts: number,
  now: number
): void {
  const h = hash2(tx, ty);
  for (let k = 0; k < 3; k++) {
    const phase = ((now / 2800 + k / 3 + (h % 7) / 7) % 1 + 1) % 1;
    const px = sx + ts * (0.32 + Math.sin(phase * Math.PI * 2 + k) * 0.06);
    const py = sy + ts * (0.18 - phase * 0.45);
    const r = ts * (0.05 + phase * 0.09);
    ctx.fillStyle = `rgba(190, 190, 195, ${0.38 * (1 - phase)})`;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
}
