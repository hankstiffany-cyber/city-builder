import "./styles.css";
import { CONFIG } from "./config.ts";
import { Game } from "./core/game.ts";
import { Input } from "./core/input.ts";
import { Camera } from "./render/camera.ts";
import { drawTilemap } from "./render/tilemap.ts";
import { createToolbar } from "./ui/toolbar.ts";
import { createMenu } from "./ui/menu.ts";
import { Hud } from "./ui/hud.ts";
import { isSaveData } from "./core/save.ts";

const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;
const appEl = document.getElementById("app")!;
const hudEl = document.getElementById("hud")!;
const toolbarEl = document.getElementById("toolbar")!;

const game = new Game();

// Resume the autosaved city, if this browser has one.
try {
  const raw = localStorage.getItem(CONFIG.SAVE_KEY);
  if (raw) {
    const data: unknown = JSON.parse(raw);
    if (isSaveData(data)) game.loadSave(data);
  }
} catch {
  // Corrupt or inaccessible storage — just start fresh.
}
document.title = `${game.cityName} — City Builder`;

function persist(): void {
  try {
    localStorage.setItem(CONFIG.SAVE_KEY, JSON.stringify(game.toSave()));
  } catch {
    // Storage full/blocked; skip silently rather than crash the game loop.
  }
}
setInterval(persist, CONFIG.AUTOSAVE_MS);
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "hidden") persist(); // phone lock / tab switch
});
const camera = new Camera(window.innerWidth, window.innerHeight);
camera.centerOn(CONFIG.MAP_WIDTH / 2, CONFIG.MAP_HEIGHT / 2);

const input = new Input(canvas, camera, game);
const hud = new Hud(hudEl, game);
createToolbar(toolbarEl, game);
createMenu(toolbarEl, appEl, game);

let dpr = 1;

/** Resize the backing store to the display size × devicePixelRatio for crisp pixels. */
function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2); // cap at 2 for perf on retina phones
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  camera.setViewport(w, h);
}

window.addEventListener("resize", resize);
resize();

let lastTime = performance.now();
let tickAccumulator = 0;

function frame(now: number): void {
  // Fixed-timestep sim ticks driven by wall-clock time, decoupled from fps.
  const elapsed = now - lastTime;
  lastTime = now;
  if (game.speed === "paused") {
    tickAccumulator = 0;
  } else {
    tickAccumulator += elapsed;
    const tickMs = CONFIG.TICK_MS[game.speed];
    let ran = 0;
    while (tickAccumulator >= tickMs && ran < CONFIG.MAX_TICKS_PER_FRAME) {
      game.tick();
      tickAccumulator -= tickMs;
      ran++;
    }
    // After a long stall (backgrounded tab), drop the backlog instead of fast-forwarding.
    if (ran === CONFIG.MAX_TICKS_PER_FRAME) tickAccumulator = 0;
  }

  // Draw in CSS pixels; the transform scales to the device-pixel backing store.
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  drawTilemap(ctx, game.grid, camera, input.hover, game.overlayOn ? game.landValue : null);
  hud.update(game, camera, input.hover);

  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
