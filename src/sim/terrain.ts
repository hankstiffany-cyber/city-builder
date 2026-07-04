import { CONFIG } from "../config.ts";
import { Grid } from "./grid.ts";
import { TileType } from "./tiles.ts";

/** Deterministic PRNG (mulberry32). Same seed → same map, every time. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t);
}

/**
 * Value-noise field in [0,1]: random values on a coarse lattice, bilinearly
 * interpolated with a smoothstep for soft, natural-looking blobs (lakes,
 * forests). Cheap, seedable, and good enough for v1 terrain.
 */
function makeNoise(width: number, height: number, cell: number, rand: () => number) {
  const cols = Math.ceil(width / cell) + 2;
  const rows = Math.ceil(height / cell) + 2;
  const lattice = new Float32Array(cols * rows);
  for (let i = 0; i < lattice.length; i++) lattice[i] = rand();

  return (x: number, y: number): number => {
    const gx = x / cell;
    const gy = y / cell;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const tx = smoothstep(gx - x0);
    const ty = smoothstep(gy - y0);
    const v = (cx: number, cy: number) => lattice[cy * cols + cx];
    const top = v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx;
    const bot = v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx;
    return top * (1 - ty) + bot * ty;
  };
}

/**
 * Paints grass / water / trees onto the grid using two independent noise
 * fields (one for water, a finer one for tree cover). Deterministic per seed.
 */
export function generateTerrain(grid: Grid, seed: number = CONFIG.DEFAULT_SEED): void {
  const rand = mulberry32(seed);
  const water = makeNoise(grid.width, grid.height, 18, rand);
  const trees = makeNoise(grid.width, grid.height, 6, rand);

  grid.forEach((_tile, x, y) => {
    const w = water(x, y);
    if (w < CONFIG.WATER_LEVEL) {
      grid.setType(x, y, TileType.Water);
      return;
    }
    const t = trees(x, y);
    if (t >= CONFIG.TREE_LOW && t <= CONFIG.TREE_HIGH) {
      grid.setType(x, y, TileType.Trees);
      return;
    }
    grid.setType(x, y, TileType.Grass);
  });
}
