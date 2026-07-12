import { CONFIG } from "../config.ts";
import { Game } from "../core/game.ts";
import { TileType, carriesTraffic } from "../sim/tiles.ts";
import { Camera } from "./camera.ts";

/**
 * Ambient life, all render-side: cars commuting on roads (count scales with
 * population, frozen while paused), sailboats drifting on water, and bird
 * flocks crossing the sky. None of it touches the sim — bulldoze a road and
 * any car on it simply vanishes on its next step.
 */

interface Car {
  tx: number;
  ty: number;
  dir: number; // index into DIRS
  p: number; // progress toward the next tile centre, 0..1
  color: string;
}

interface Boat {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface Flock {
  x: number;
  y: number;
  vx: number;
  vy: number;
  count: number;
  born: number;
}

const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
]; // N E S W
const CAR_COLORS = ["#e8e8ec", "#c65b4e", "#5b8fc6", "#d9c65b", "#767c86"];

export class Ambient {
  private cars: Car[] = [];
  private boats: Boat[] = [];
  private flocks: Flock[] = [];
  private roads: number[] = [];
  private roadsVersion = -1;
  private boatTimer = 4_000;
  private flockTimer = 9_000;

  update(dtMs: number, game: Game, camera: Camera): void {
    const dt = Math.min(dtMs, 100) / 1000; // clamp huge tab-stall deltas
    this.refreshRoads(game);
    this.updateCars(dt, game);
    this.updateBoats(dt, game);
    this.updateFlocks(dt, camera, game);
  }

  draw(ctx: CanvasRenderingContext2D, camera: Camera, darkness: number, now: number): void {
    const ts = camera.tileSize;
    const toScreen = (wx: number, wy: number) => ({
      x: (wx - camera.x) * ts,
      y: (wy - camera.y) * ts,
    });

    if (ts >= 9) {
      for (const car of this.cars) {
        const d = DIRS[car.dir];
        // Drive on the right: offset perpendicular to the travel direction.
        const wx = car.tx + 0.5 + d.dx * car.p - d.dy * 0.18;
        const wy = car.ty + 0.5 + d.dy * car.p + d.dx * 0.18;
        const { x, y } = toScreen(wx, wy);
        const along = ts * 0.3;
        const across = ts * 0.16;
        const w = d.dx !== 0 ? along : across;
        const h = d.dx !== 0 ? across : along;
        if (darkness > 0.15) {
          // Headlight pool just ahead of the car.
          const hx = x + d.dx * ts * 0.3;
          const hy = y + d.dy * ts * 0.3;
          ctx.fillStyle = "rgba(255,240,180,0.28)";
          ctx.fillRect(hx - w / 2, hy - h / 2, w, h);
        }
        ctx.fillStyle = car.color;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
      }
    }

    for (const boat of this.boats) {
      const { x, y } = toScreen(boat.x, boat.y);
      const s = ts * 0.5;
      ctx.fillStyle = "#5f4630"; // hull
      ctx.fillRect(x - s / 2, y, s, s * 0.28);
      ctx.fillStyle = darkness > 0.15 ? "#d8cba8" : "#f2eee2"; // sail
      ctx.beginPath();
      ctx.moveTo(x, y - s * 0.75);
      ctx.lineTo(x, y);
      ctx.lineTo(x + s * 0.42, y);
      ctx.closePath();
      ctx.fill();
      if (darkness > 0.15) {
        ctx.fillStyle = "rgba(255,220,130,0.9)"; // lantern
        ctx.fillRect(x - 1, y - s * 0.2, 2, 2);
      }
    }

    // Birds roost at night.
    if (darkness < 0.15) {
      ctx.strokeStyle = "rgba(25,30,40,0.75)";
      ctx.lineWidth = Math.max(1, ts * 0.045);
      for (const flock of this.flocks) {
        for (let k = 0; k < flock.count; k++) {
          const back = -Math.sign(flock.vx) * k * 0.4;
          const wx = flock.x + back;
          const wy = flock.y + (k % 2 === 0 ? 1 : -1) * k * 0.16;
          const { x, y } = toScreen(wx, wy);
          const flap = Math.sin(now / 90 + k * 1.7) * ts * 0.06;
          const span = ts * 0.14;
          ctx.beginPath();
          ctx.moveTo(x - span, y + flap);
          ctx.lineTo(x, y - flap);
          ctx.lineTo(x + span, y + flap);
          ctx.stroke();
        }
      }
    }
  }

  // --- Traffic ---

  private refreshRoads(game: Game): void {
    if (game.version === this.roadsVersion) return;
    this.roadsVersion = game.version;
    this.roads.length = 0;
    game.grid.forEach((tile, x, y) => {
      if (carriesTraffic(tile.type)) this.roads.push(x + y * game.grid.width);
    });
  }

  private updateCars(dt: number, game: Game): void {
    if (game.speed === "paused") return;
    const isRoad = (x: number, y: number) => {
      const t = game.grid.getType(x, y);
      return t !== undefined && carriesTraffic(t);
    };

    const target = Math.min(
      CONFIG.MAX_CARS,
      Math.floor(game.population * CONFIG.TRAFFIC_PER_POP),
      Math.floor(this.roads.length / 2)
    );
    if (this.cars.length < target && this.roads.length > 0) {
      const packed = this.roads[Math.floor(Math.random() * this.roads.length)];
      const tx = packed % game.grid.width;
      const ty = (packed - tx) / game.grid.width;
      const options = DIRS.map((_, i) => i).filter((i) =>
        isRoad(tx + DIRS[i].dx, ty + DIRS[i].dy)
      );
      if (options.length > 0) {
        this.cars.push({
          tx,
          ty,
          dir: options[Math.floor(Math.random() * options.length)],
          p: Math.random(),
          color: CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)],
        });
      }
    }
    if (this.cars.length > target) this.cars.length = target;

    const step = CONFIG.CAR_SPEED * dt;
    for (let i = this.cars.length - 1; i >= 0; i--) {
      const car = this.cars[i];
      car.p += step;
      while (car.p >= 1) {
        car.p -= 1;
        car.tx += DIRS[car.dir].dx;
        car.ty += DIRS[car.dir].dy;
        if (!isRoad(car.tx, car.ty)) {
          this.cars.splice(i, 1);
          break;
        }
        const reverse = (car.dir + 2) % 4;
        const options = DIRS.map((_, k) => k).filter(
          (k) => k !== reverse && isRoad(car.tx + DIRS[k].dx, car.ty + DIRS[k].dy)
        );
        if (options.length === 0) {
          // Dead end: turn around if the way back still exists.
          if (isRoad(car.tx + DIRS[reverse].dx, car.ty + DIRS[reverse].dy)) car.dir = reverse;
          else {
            this.cars.splice(i, 1);
            break;
          }
        } else if (options.includes(car.dir) && Math.random() < 0.65) {
          // Mostly keep going straight through junctions.
        } else {
          car.dir = options[Math.floor(Math.random() * options.length)];
        }
      }
    }
  }

  // --- Boats ---

  private updateBoats(dt: number, game: Game): void {
    this.boatTimer -= dt * 1000;
    if (this.boatTimer <= 0 && this.boats.length < 2) {
      this.boatTimer = 14_000 + Math.random() * 8_000;
      for (let tries = 0; tries < 40; tries++) {
        const x = Math.floor(Math.random() * game.grid.width);
        const y = Math.floor(Math.random() * game.grid.height);
        if (game.grid.getType(x, y) === TileType.Water) {
          const angle = Math.random() * Math.PI * 2;
          this.boats.push({
            x: x + 0.5,
            y: y + 0.5,
            vx: Math.cos(angle) * 0.35,
            vy: Math.sin(angle) * 0.35,
          });
          break;
        }
      }
    }

    for (const boat of this.boats) {
      // Bounce off anything that isn't open water.
      const aheadX = game.grid.getType(Math.floor(boat.x + boat.vx * 0.8), Math.floor(boat.y));
      if (aheadX !== TileType.Water) boat.vx = -boat.vx;
      const aheadY = game.grid.getType(Math.floor(boat.x), Math.floor(boat.y + boat.vy * 0.8));
      if (aheadY !== TileType.Water) boat.vy = -boat.vy;
      boat.x += boat.vx * dt;
      boat.y += boat.vy * dt;
    }
  }

  // --- Birds ---

  private updateFlocks(dt: number, camera: Camera, game: Game): void {
    this.flockTimer -= dt * 1000;
    if (this.flockTimer <= 0 && this.flocks.length < 2) {
      this.flockTimer = 18_000 + Math.random() * 14_000;
      const range = camera.visibleTileRange();
      const fromWest = Math.random() < 0.5;
      this.flocks.push({
        x: fromWest ? range.x0 - 2 : range.x1 + 2,
        y: range.y0 + Math.random() * Math.max(1, range.y1 - range.y0),
        vx: (fromWest ? 1 : -1) * (3.2 + Math.random() * 1.6),
        vy: (Math.random() - 0.5) * 1.2,
        count: 3 + Math.floor(Math.random() * 3),
        born: performance.now(),
      });
    }

    for (let i = this.flocks.length - 1; i >= 0; i--) {
      const flock = this.flocks[i];
      flock.x += flock.vx * dt;
      flock.y += flock.vy * dt;
      const gone =
        flock.x < -6 ||
        flock.y < -6 ||
        flock.x > game.grid.width + 6 ||
        flock.y > game.grid.height + 6 ||
        performance.now() - flock.born > 60_000;
      if (gone) this.flocks.splice(i, 1);
    }
  }
}
