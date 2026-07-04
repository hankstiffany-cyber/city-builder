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
const urls = import.meta.glob("../assets/buildings/*.png", {
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

/**
 * The sprite for a tile, or null if it has no art. Zones pick their art by
 * growth level; residential levels 1–2 also have a `b` variant, chosen by a
 * position hash so the mix is stable frame-to-frame but varies across the map.
 */
function spriteNameForTile(tile: Tile, x: number, y: number): string | null {
  switch (tile.type) {
    case TileType.ZoneR: {
      const lvl = tile.level;
      const wantVariant = ((x * 31 + y * 17) & 1) === 1;
      if (wantVariant && (lvl === 1 || lvl === 2)) return `res_${lvl}b`;
      return `res_${lvl}`;
    }
    case TileType.ZoneC:
      return `com_${tile.level}`;
    case TileType.ZoneI:
      return `ind_${tile.level}`;
    case TileType.PowerPlant:
      return "power_plant";
    default:
      return null;
  }
}

/** A decoded, ready-to-draw image for `name`, or undefined if not loaded yet. */
export function sprite(name: string): HTMLImageElement | undefined {
  const img = images.get(name);
  return img && img.complete && img.naturalWidth > 0 ? img : undefined;
}

/** The ready sprite for a tile, or undefined if none / not yet loaded. */
export function tileSprite(tile: Tile, x: number, y: number): HTMLImageElement | undefined {
  const name = spriteNameForTile(tile, x, y);
  return name ? sprite(name) : undefined;
}
