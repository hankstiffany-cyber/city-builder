import { TileType, type Tile } from "./tiles.ts";

/**
 * The city map: a flat 2D array of tiles, row-major. Pure data + accessors,
 * no rendering. This is the object every sim module reads and writes.
 */
export class Grid {
  readonly width: number;
  readonly height: number;
  private readonly cells: Tile[];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.cells = new Array(width * height);
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i] = { type: TileType.Grass, powered: false, roadAccess: false };
    }
  }

  inBounds(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.width && y < this.height;
  }

  private index(x: number, y: number): number {
    return y * this.width + x;
  }

  /** Returns the tile, or undefined if out of bounds. */
  get(x: number, y: number): Tile | undefined {
    if (!this.inBounds(x, y)) return undefined;
    return this.cells[this.index(x, y)];
  }

  getType(x: number, y: number): TileType | undefined {
    return this.get(x, y)?.type;
  }

  /** Sets a tile's type in place. No-op (returns false) if out of bounds. */
  setType(x: number, y: number, type: TileType): boolean {
    if (!this.inBounds(x, y)) return false;
    this.cells[this.index(x, y)].type = type;
    return true;
  }

  /** Visit every tile with its coordinates. */
  forEach(fn: (tile: Tile, x: number, y: number) => void): void {
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        fn(this.cells[this.index(x, y)], x, y);
      }
    }
  }
}
