# Daybreak Row — full-world asset placement audit

**Audited:** 2026-10-17
**Scope:** **all existing model categories, old and recently added** — not just the new realism GLBs. This covers outdoor buildings, signs, streets, street furniture, tree positions, vehicle spaces, and all nine enterable interior layouts. It also checks access to the game's interactions.

## Inventory and QA approach

- **103 placed model anchors** (legacy Poly Haven/Innerscene assets plus the newly bundled 23 CC0 types) were enumerated in the live Three.js scene using a QA-only inspection hook. Models are demand-loaded; only those relevant to the player area are resident at once.
- **Nine interiors** were checked with deterministic mobile-size browser scenes. The apartment, cafe, market, office, bakery, gym, cinema and bookshop were visually captured in the software WebGL browser, and Fresh Spin Laundry's interior and enter/use/exit workflow were separately checked.
- **Building and sidewalk geometry** was compared against loaded model bounding boxes, street colliders, shop interaction points, and door positions.
- **All 51 desktop city-tree placements and 13 mobile placements** were compared against the building footprint map with a 2-metre minimum center-to-building clearance. This checks the *approximate canopy footprint*, rather than only the solid trunk.
- **Vehicle placement:** the static city bus's runtime geometry was checked against its intended parking collider; the existing cars, traffic lanes and render/model loading logic were inspected. Human/NPC rigs remain in their existing locations with their licensed animation sets intact.
- **Path clearance:** a conservative grid traversal used the same 0.34m player radius as the engine and the actual indoor/outdoor collision rectangles. It reached all **35 interior action points** and all **20 outdoor action points**, including all building entrances and the pier.
- Visual review used **software WebGL / Mesa llvmpipe** at a mobile portrait viewport; it is not a physical Pixel 6a GPU benchmark.

## Corrections made

| Area | Problem found | Resolution |
| --- | --- | --- |
| Downtown / Old Town | Older bins and streetlamps occupied the same spot, benches and bike racks intersected | Separated objects; updated accompanying physical collision footprints |
| City storefronts | A shelter, recycling station and several props protruded into building footprints | Moved to unobstructed curb locations; consistent street/raised-sidewalk grounding |
| Building facades | Some facade decorations didn't align cleanly with service-door modules or signage | Adjusted service-elevation overlays, three-part cornices and landmark-sign planes |
| City vegetation | Several canopies clipped buildings; one tree trunk extended inside an exterior wall | Repositioned trees toward the curbs while preserving the original tree count, species cycles and mobile density |
| Café | Third table constricted the main circulation aisle | Kept the side tables and removed the obstructing central table |
| Home | Large kitchen enclosure collision made the shower action unreachable | Shifted the **shower Use anchor** to the accessible edge, leaving geometry and save state unchanged |
| Interiors | Some older furniture could be walked through; some new shelves had invisible oversized blockers | Matched simple obstacle boxes to actual 3D furniture footprints |
| Northline Office | A realistic sofa intersected an older solid wooden unit | Relocated the sofa to an open side of the room and moved its collider with it |
| Old Town Bakery | A legacy trash can intersected a built-in shelf | Relocated the can to the open side of the counter and moved its collider with it |
| Streets and laundry | Static bus and appliance colliders needed to correspond to the actual scaled models | Kept their colliders sized for loaded geometry; preserved all exits and paid interactions |

## Verification

- `npm run test:game`: **42 / 42 pass**.
- `npm run typecheck`: **pass**.
- `npm run build`: **pass** (upstream dependency-directive warnings remain nonfatal).
- Targeted ESLint for the changed source files: **pass**.
- `git diff --check`: **pass**.
- Outdoor reachability: **20 / 20 action points reached** with pier-boundary extension.
- Indoor reachability: **all actions reachable** from their respective spawn points after fixing the shower.
- Curbside city trees: **0 / 51 facade-canopy proximity conflicts** with the conservative 2m threshold; **0 / 13** on mobile.
- City bus AABB: approximately `x 176.84–179.16; z -136.55 to -127.85`, matching its simple obstacle `x 176.8–179.2; z -136.6 to -127.8`.

## Important QA limits

The geometry/bounds tests are useful for clipping, collisions and basic spatial plausibility but cannot prove every camera angle or every NPC animation frame is flawless. Browser captures are software-rendered, and **sustained frame rate, thermal load and real multitouch ergonomics on the owner's physical Pixel 6a remain to be tested**. Procedural background architecture is still simple; this pass repairs placement, not art direction or scene detail.

**Future modification rule:** every new or relocated visible prop should be checked against the underlying building/room structure, player collision, nearby actions, road usage and the mobile budget. When the user plays on the phone, prioritize any concrete visual placement issue reported from actual gameplay.