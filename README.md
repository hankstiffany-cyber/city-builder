# City Builder

A classic SimCity-style, top-down city-building game that runs in the browser —
on desktop and on your phone. Built with TypeScript + HTML5 Canvas (no game
engine, no backend). Scoped to the original SimCity (1989): simple, tunable, fun.

**Status:** Phases 0–5 + 7 complete (and most of the art pass). The full loop is
playable: paint roads, power lines, R/C/I zones and power plants onto seeded
terrain; power flood-fills the grid (unpowered zones flash ⚡); zones grow from
empty lots into dense buildings under an RCI demand model; pollution drags down
residential growth; taxes come in monthly (slider adjustable); a land-value heat
map (🗺) shows where the good addresses are. Your city autosaves in the browser
and can be exported/imported as a file, with new-game difficulties from the ⚙
menu. See [`PLAN.md`](./PLAN.md) for what's left.

## Play

```bash
npm install
npm run dev      # open the printed localhost URL
```

**Controls**

| Action | Desktop | Touch |
|---|---|---|
| Pan | Pan tool + drag, or right/middle-drag | one finger (Pan tool) / two-finger drag |
| Zoom | mouse wheel | pinch |
| Build | pick a tool, click or drag to paint | pick a tool, drag to paint |
| Bulldoze | Bulldoze tool | Bulldoze tool |

You can't build on water. Building over existing infrastructure requires
bulldozing it first. The debug line in the top bar shows the hovered tile's
coordinates, type, growth level, and power/road status.

**Making the city grow:** zones need power (from a plant, conducted through
roads, power lines, and other zones) *and* a road within 3 tiles. Keep homes
away from industry and power plants — pollution stalls residential growth.
Watch the R/C/I numbers in the top bar to see what the city wants, use ⏸/▶/⏩
to control time, and mind the tax slider: higher rates fill the treasury but
scare growth away.

## Develop

```bash
npm run test     # unit tests for the sim layer (grid, terrain, build rules)
npm run build    # typecheck + production bundle into dist/
npm run preview  # serve the production build locally
```

Architecture and the golden rule (sim never touches render) are in
[`ARCHITECTURE.md`](./ARCHITECTURE.md). The phase-by-phase roadmap is in
[`PLAN.md`](./PLAN.md). All balance constants live in
[`src/config.ts`](./src/config.ts).

## Deploy (GitHub Pages)

Pushing to the default branch runs `.github/workflows/deploy.yml`, which builds
the app and publishes `dist/` to GitHub Pages. Enable it once under
**Settings → Pages → Source → GitHub Actions**. The build uses a relative base
path, so it works at any sub-path.

## Add to your iPhone home screen

Open the deployed URL in Safari → Share → **Add to Home Screen**. The web
manifest launches it full-screen, like a native app.

## License / legal

This is an original game. It is *inspired by* SimCity but shares no code, art, or
assets with it. "SimCity" is a trademark of Electronic Arts.
