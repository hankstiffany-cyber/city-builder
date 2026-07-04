/**
 * Building sprite registry. Loads the PNGs in `src/assets/buildings/` (bundled
 * by Vite, so their URLs stay correct under any GitHub Pages sub-path) and
 * exposes a lookup keyed by the file's base name, e.g. "res_0", "power_plant".
 *
 * Images decode asynchronously; `sprite()` returns undefined until one is ready,
 * so callers fall back to a flat fill for the first frame or two. The render
 * loop runs every frame, so sprites simply appear once decoded — no redraw
 * plumbing required.
 */
import { TileType, type Tile } from "../sim/tiles.ts";

// Eager URL imports: Vite rewrites each path to a hashed, base-aware asset URL.
// Every PNG anywhere under assets/ registers by base name, so new art (e.g. a
// future assets/tiles/road_5.png) is picked up with zero code changes.
const urls = import.meta.glob("../assets/**/*.png", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const images = new Map<string, HTMLImageElement>();
for (const [path, url] of Object.entries(urls)) {
  const name = path.split("/").pop()!.replace(/\.png$/, "");
  const img = new Image();
  img.src = url;
  images.set(name, img);
}

/** Zone art prefix per tile type; null for types with no per-level art. */
function zonePrefix(tile: Tile): string | null {
  switch (tile.type) {
    case TileType.ZoneR:
      return "res";
    case TileType.ZoneC:
      return "com";
    case TileType.ZoneI:
      return "ind";
    default:
      return null;
  }
}

/** A decoded, ready-to-draw image for `name`, or undefined if not loaded yet. */
export function sprite(name: string): HTMLImageElement | undefined {
  const img = images.get(name);
  return img && img.complete && img.naturalWidth > 0 ? img : undefined;
}

/**
 * The ready sprite for a tile, or undefined if none / not yet loaded. Zones
 * pick art by growth level; a `b` variant (e.g. res_2b) is used on half the
 * map, chosen by a stable position hash, whenever that variant file exists —
 * drop in com_1b.png and commercial gains variety automatically.
 */
export function tileSprite(tile: Tile, x: number, y: number): HTMLImageElement | undefined {
  if (tile.type === TileType.PowerPlant) return sprite("power_plant");
  const prefix = zonePrefix(tile);
  if (!prefix) return undefined;
  const base = `${prefix}_${tile.level}`;
  if (((x * 31 + y * 17) & 1) === 1) {
    const variant = sprite(`${base}b`);
    if (variant) return variant;
  }
  return sprite(base);
}
