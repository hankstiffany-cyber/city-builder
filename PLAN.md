# City Builder — PLAN.md

> Claude Code reads this at the start of every session. Keep it current.
> To start a session: **"Read PLAN.md. We're doing Phase N, item X."**

A classic SimCity-1989-style, top-down city builder. Browser-based, playable on
desktop and iPhone (Add to Home Screen). Scope is deliberately SimCity 1989 —
no terrain elevation, no underground layers, no disasters in v1.

## Guiding rules (see §6 of the original plan)
1. **One feature per session.**
2. **Sim and render stay strictly separated.** `/sim` is pure logic with no DOM.
3. **Commit after every working feature.**
4. **The sim layer has unit tests.** Rendering is verified by eyeball.
5. **All tuning constants live in `src/config.ts`.**
6. **Resist refactors mid-phase** — note them here, do them between phases.

## Build phases

- [x] **Phase 0 — Setup.** Vite + TypeScript + Canvas scaffold, PLAN/ARCHITECTURE,
      GitHub Pages deploy workflow, web manifest + icon. Blank page → real URL.
- [x] **Phase 1 — The Grid.** 100×100 tile map of colored squares. Pan (drag),
      zoom (wheel / pinch), tap-to-highlight, debug overlay (tile coords + type +
      zoom). Smooth on desktop and phone.
- [x] **Phase 2 — Tools & Terrain.** Toolbar: pan, bulldoze, road, power line,
      R/C/I zones, power plant. Click/drag to paint; each placement costs money;
      money counter starts at $20,000. Seeded terrain: grass, water (can't build
      on), trees. → *You can draw a city layout and run out of money.*
- [x] **Phase 3 — Power & Connectivity.** Power flood-fills from plants through
      adjacent conducting tiles (`sim/power.ts`, recomputed after every build).
      Unpowered zones flash the no-power bolt; HUD shows ⚡/🛣 per tile. Zones get
      `Tile.roadAccess` when a road is within `ROAD_ACCESS_RADIUS` (3) tiles —
      Phase 4's growth conditions consume it.
- [x] **Phase 4 — The Living City.** Tick loop (pause/slow/fast, HUD buttons,
      fixed timestep in main.ts). Zones grow empty→small→medium→dense
      (`Tile.level`, `sim/growth.ts`) when powered + road-connected + demand
      exists, and decay when disconnected. RCI demand model in `sim/demand.ts`
      (jobs↔population feedback, base settler/export pull). Population + in-game
      date (Jan 1900 epoch) + RCI meter in the HUD. Growth-stage art now renders,
      including the `res_*b` variants via a position hash.
- [x] **Phase 5 — Economy & Feedback.** Monthly tax income (`monthlyTaxIncome`,
      collected on calendar-month rollover, shown as +$/mo in the HUD), tax-rate
      slider (0–20%; rates above default suppress all demand). Pollution field
      (`sim/pollution.ts`: industry by level + power plants, linear falloff) cuts
      residential growth odds. Land-value heat-map overlay (`sim/landvalue.ts`,
      🗺 button): base + power + roads + waterfront + trees − pollution.
- [x] **Phase 6 — Art Pass.** Building sprites + procedural terrain art:
      grass shade variation, twinkling water with foam shorelines, shaded tree
      canopies, auto-tiling roads (shoulders + connected centre lines),
      power-line pylons with wires, drifting smoke over power plants. Every
      procedural tile checks for a sprite first (grass/water/trees.png,
      road_<mask>.png, powerline_<mask>.png — mask bits N=1 E=2 S=4 W=8), so
      hand-drawn art can replace any of it by dropping a PNG into src/assets/.
- [x] **Phase 7 — Polish & Persistence.** Save/load: versioned JSON codec in
      `core/save.ts` (types+levels only; derived state recomputed on load),
      localStorage autosave every 15s + on tab-hide, file export/import from the
      ⚙ City Hall menu. New game with easy/normal/hard starting funds on a fresh
      random map. City naming (HUD + document.title). Mobile: HUD wraps, debug
      line hidden, touch targets were already large.

## Phase 8+ backlog (v2 — write ideas here INSTEAD of building them)
- [x] **Advisor messages.** `sim/advisor.ts` rules → toast pop-ups (`ui/toasts.ts`):
      tutorial arc for new cities (plant → zones → power/roads), standing warnings
      (unpowered/roadless zones, low funds, pollution), zoning nudges when demand
      is high with no vacancy, population milestone celebrations (persisted in
      saves), and instant "not enough money" feedback. Once-flags + per-id
      cooldowns pace delivery; the toast UI also dedupes by id.
- [x] **Parks.** 🌳 tool ($30): +land value in radius 2, boosts nearby residential
      growth odds, procedural lawn/tree/flower art (sprite hook: `park.png`).
- [x] **Minimap.** Bottom-right overview, one pixel per tile, cached until the
      world changes, viewport rectangle, click/drag to jump the camera.

- [x] **Atmosphere & ambient life.** Day/night cycle on the tick clock
      (DAY_NIGHT_TICKS; pauses with the sim): night tint, lit windows in
      powered developed zones, plant stack beacon, car headlights. Ambient
      layer (`render/ambient.ts`): cars commuting on roads (count scales with
      population, right-hand traffic, mostly-straight junction choices),
      sailboats bouncing around the water, bird flocks crossing by day.
      Zoom-aware detail: decor and second trees fade in past ~14px tiles.

- [x] **Services & disasters.** Fire + police stations ($500, $15/mo upkeep
      each, must be powered): `sim/coverage.ts` projects max-combined coverage
      over STATION_COVERAGE_RADIUS. Crime (`sim/crime.ts`) plumes from developed
      zones (C worst), minus police coverage; it cuts land value and stalls
      commercial growth. Fires (`sim/fire.ts`): random ignition scaling with
      city size, spread to flammable neighbours (roads/water/rubble are
      firebreaks), burnout to bulldozable rubble — fire coverage prevents,
      slows, and extinguishes. Overlay button cycles land value → crime.
      Advisor: fire alerts, no-fire-dept hint, crime-wave warning. Civic
      sprites from the expansion pack.

Still open: traffic density affecting desirability (the ambient cars are
visual only), stadium/seaport/airport, scenario challenges, sound, bridges.

## Deferred / notes for later
- **Art pass mostly done early.** All building sprites in `src/assets/buildings/`
  are wired up: zone art by growth level (with `res_*b` variants), power plant,
  and the flashing `icon_nopower` overlay. Remaining for Phase 6: terrain/road
  tiles are still flat fills + vector flourishes, and no animations yet.
- ~~`power_plant.png` has a stray thumbnail strip baked in~~ — replaced with the
  cooling-tower render (Jul 2026 art batch).
- **Unused art stash:** `art/expansion-pack/` holds the 75-sprite expansion pack.
  Standouts for future phases: civic buildings (fire/police/hospital/school/city
  hall) for the services phase, `icon_no_water` for water utilities, selection/
  error overlay tiles for build-cursor feedback. The generic building variants
  are flatter than the current art style — mix in only if the style converges.
- **Unused art stash:** `art/tile-pack/` holds the full programmatic tile pack
  (bridges, rivers, pipes, highway, cliffs, sand/dirt, substation, water tower,
  more trees/decor, zone overlays). Not bundled — copy into `src/assets/` when a
  feature needs them (e.g. bridges when roads-over-water lands).
- Power plant is a single tile for now; SimCity used a 4×4 footprint. Revisit
  when multi-tile buildings arrive (Phase 4/6).
- No autosave yet — added in Phase 7.
- Grid lines hide below ~14px tile size; tune if it feels off after the art pass.

## Playtest notes (fill in after each session)
- _(none yet — first playable build)_
