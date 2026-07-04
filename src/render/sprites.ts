/**
 * Building sprite registry. Loads the PNGs in `src/assets/buildings/` (bundled
 * by Vite, so their URLs stay correct under any GitHub Pages sub-path) and
 * exposes a lookup keyed by the file's base name, e.g. "res_0", "power_plant".
 *
 * Images decode asynchronously; `sprite()` returns undefined until one is ready,
 * so callers fall back to a flat fill for the first frame or two. The render
 * loop runs every frame, so sprites simply appear once decoded — no redraw
 * plumbing required.
 *
 * Only the level-0 (freshly-zoned) art and the power plant are wired up for now.
 * The growth-stage art (res_1..3, the `b` variants) and `icon_nopower` are
 * bundled and ready, but stay unused until Phase 4 (growth) and Phase 3 (power).
 */
import { TileType } from "../sim/tiles.ts";

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

/** The sprite for a tile type, or null if that type has no art. */
function spriteNameForType(type: TileType): string | null {
  switch (type) {
    case TileType.ZoneR:
      return "res_0";
    case TileType.ZoneC:
      return "com_0";
    case TileType.ZoneI:
      return "ind_0";
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

/** The ready sprite for a tile type, or undefined if none / not yet loaded. */
export function tileSprite(type: TileType): HTMLImageElement | undefined {
  const name = spriteNameForType(type);
  return name ? sprite(name) : undefined;
}
