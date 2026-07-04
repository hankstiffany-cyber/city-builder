# City Builder — ARCHITECTURE.md

The one rule that makes everything else work: **the simulation never imports the
renderer, and the renderer never mutates simulation state.** Logic is testable in
Node; graphics are verified by eye. You can rewrite all the art without touching a
line of game rules.

```
src/
  config.ts          All tuning constants + tool costs. Change balance here only.
  main.ts            Orchestrator: wires everything, owns the requestAnimationFrame loop.

  sim/               PURE LOGIC — no DOM, no canvas. Unit-tested.
    tiles.ts           TileType enum + Tile record + predicates (isBuildable, isZone…).
    grid.ts            Grid: flat row-major 2D array of tiles + accessors.
    terrain.ts         Seeded value-noise terrain generation (grass/water/trees).
    build.ts           applyTool(): the rules for placing/bulldozing a tile.
    *.test.ts          Vitest specs for the above.

  render/            DRAWING ONLY — reads sim state, never writes it.
    camera.ts          Pan/zoom + screen↔world/tile coordinate transforms.
    tilemap.ts         Draws the visible slice of the grid (viewport-culled).

  core/
    game.ts            Game: holds all mutable state (grid, money, tool). The single
                       object the UI/input call to change the world. Owns the wallet.
    input.ts           Pointer Events → camera moves + build actions (mouse + touch).

  ui/                DOM widgets (outside the canvas).
    toolbar.ts         Tool palette; calls game.setTool().
    hud.ts             Money + debug overlay (tool, hovered tile, zoom).
```

## Data flow (one frame)

```
pointer/touch → Input ──► Camera (pan/zoom)
                     └──► Game.build(x,y) ──► applyTool() mutates Grid, debits money

requestAnimationFrame → main.frame():
    drawTilemap(ctx, grid, camera, hover)   // render reads sim
    hud.update(game, camera, hover)         // HUD reads sim
```

Input and UI only ever call **into** `Game`. Render and HUD only ever **read**
from it. Nothing in `render/` or `ui/` writes tiles or money directly.

## Coordinate spaces
- **Screen pixels** — CSS px relative to the canvas (what Pointer Events give us).
- **World units** — 1 unit = 1 tile. Camera `(x, y)` is the world point at the
  viewport's top-left; `zoom` scales tile size (`BASE_TILE_SIZE * zoom`).
- The canvas backing store is `size × devicePixelRatio` (capped at 2); we draw in
  CSS px and let a `setTransform(dpr,…)` scale to device pixels for crisp output.

## Rendering performance
`drawTilemap` only iterates tiles inside `camera.visibleTileRange()`, so cost
scales with the viewport, not the 100×100 map. `Game.version` is bumped on every
world change so a future dirty-flag can skip idle redraws if needed (§7 of PLAN).

## Extending it
- **New tile type:** add to `TileType`, give it a color in `tilemap.ts`, wire a
  tool in `build.ts` + `toolbar.ts`, set its cost in `config.ts`.
- **New sim system (power, traffic, taxes):** add a `sim/*.ts` module of pure
  functions over `Grid`, unit-test it, and call it from a tick loop in `Game`.
