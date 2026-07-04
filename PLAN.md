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
- [ ] **Phase 3 — Power & Connectivity.** Power flood-fills from plants through
      adjacent conducting tiles. Unpowered zones flash a no-power indicator. Zones
      need a road within 3 tiles. Scaffolding already in place: `Tile.powered`,
      `conductsPower()` in `sim/tiles.ts`.
- [ ] **Phase 4 — The Living City.** Tick loop (pause/slow/fast). Zones grow
      empty→small→medium→dense when powered + road-connected + demand exists.
      RCI demand model. Population + in-game date.
- [ ] **Phase 5 — Economy & Feedback.** Monthly tax income, tax-rate slider,
      pollution lowering nearby residential desirability, land-value heat-map overlay.
- [ ] **Phase 6 — Art Pass.** Replace colored squares with real tiles/sprites,
      building variety per growth stage, small animations.
- [ ] **Phase 7 — Polish & Persistence.** Save/load (localStorage + file
      export/import), new game / difficulty, city naming, mobile UI pass.

## Phase 8+ backlog (v2 — write ideas here INSTEAD of building them)
Disasters (fire spreads), police/fire coverage, parks, traffic density affecting
desirability, stadium/seaport/airport, scenario challenges, minimap, sound.

## Deferred / notes for later
- **Art pass started early (partial).** Level-0 zoned-lot sprites (`res_0`/`com_0`/
  `ind_0`) and `power_plant.png` are wired up in `render/sprites.ts` +
  `render/tilemap.ts`, drawn over the existing flat fills. The growth-stage art
  (`res_1..3`, `com_1..3`, `ind_1..3`, the `res_*b` variants) and `icon_nopower.png`
  are bundled in `src/assets/buildings/` but unused until Phase 4 (which sprite a
  zone shows needs a growth level) and Phase 3 (the no-power overlay). Finish the
  rest of Phase 6 once those land.
- Power plant is a single tile for now; SimCity used a 4×4 footprint. Revisit
  when multi-tile buildings arrive (Phase 4/6).
- No autosave yet — added in Phase 7.
- Grid lines hide below ~14px tile size; tune if it feels off after the art pass.

## Playtest notes (fill in after each session)
- _(none yet — first playable build)_
