# Art generation prompts (ChatGPT / DALL·E)

Learned from integrating three art batches. The master template below produces
assets that drop into the game with zero rework; the pitfalls list is why.

## Master prompt template

> Create a single 2D video game sprite of **[SUBJECT]** in detailed 16-bit
> pixel-art style, like a classic 1990s city-building simulation game.
>
> Requirements:
> - Straight-on front view with a very slight top-down angle (NOT isometric,
>   NOT 3/4 perspective, no vanishing point) — the sprite must sit flat on a
>   square ground tile seen from almost directly above the horizon line
> - One single subject only, centered, filling most of the frame
> - The base of the subject must be a square footprint that would fit a square
>   map tile, with the ground/footprint at the very bottom edge
> - Fully transparent background (true alpha, NOT a checkerboard pattern,
>   NOT white)
> - No drop shadow outside the footprint, no ground beyond the tile base
> - No text, labels, captions, watermarks, or borders anywhere in the image
> - Crisp pixel-art edges, dark outlines, rich saturated colors
> - Square image, 1024×1024

Swap **[SUBJECT]** and generate one image per asset. One subject per image —
never a sheet or grid (grids can't be sliced reliably).

## Current wish list

Buildings (match the existing detailed style — cottages/brick apartments/strip
malls already in game):

| File name to use | [SUBJECT] |
|---|---|
| `com_3b` | a dense downtown commercial tower with ground-floor shops |
| `ind_1b` | a small industrial workshop with a single chimney |
| `ind_2b` | a mid-size warehouse with loading dock |
| `fire_station` | a small city fire station with red garage doors |
| `police_station` | a small city police station with blue lamp |
| `hospital` | a small city hospital with red cross sign (future) |
| `school` | a small brick schoolhouse with flag (future) |

Tile art (these must read as FLAT top-down ground tiles, viewed directly from
above — say "viewed directly from overhead, flat orthographic map tile" instead
of the front-view line in the template):

| File name | [SUBJECT] |
|---|---|
| `powerline_5` | electricity pylon with wires running top-to-bottom of the tile |
| `powerline_10` | electricity pylon with wires running left-to-right of the tile |
| `road_bridge_ns` / `road_bridge_ew` | already have art in `art/tile-pack/` |

Big-ticket (future multi-tile buildings — generate at the same style; we'll
slice): stadium, seaport, airport.

## Pitfalls that cost us rework

1. **Isometric perspective** — two otherwise-great sprites (a road slab and a
   pylon) were unusable because the game is a top-down orthogonal grid.
2. **Baked checkerboard backgrounds** — several images had the transparency
   checkerboard painted INTO the pixels. We can key it out, but true alpha is
   lossless.
3. **Text/UI fragments in the image** — the first power plant had a thumbnail
   strip with filenames baked into the artwork.
4. **Dark edge halos** — fixed on our side with premultiplied-alpha
   downscaling, but clean-edged sources always help.

## Delivery

Paste images straight into the chat or zip them up — either works. Name files
per the table if convenient; zero-padded numbers (`powerline_05`) are fine.
The game auto-discovers `b`/`c` variant suffixes (e.g. `res_2c`) for every
zone level, so extra variants of anything are always usable.
