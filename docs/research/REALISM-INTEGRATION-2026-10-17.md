# Daybreak Row — licensed realism asset integration

**Date:** 2026-10-17. This report supersedes the research-only status in the [earlier asset scout](REALISM-ASSET-SCOUT-2026-10-17.md).

## Pack and provenance

- **23 compact locally bundled GLBs:** 19 extracted/optimized Poly Haven assets plus 4 original Innerscene GLBs, total **about 8.82 MiB**.
- Poly Haven's official [API](https://polyhaven.com/our-api) supplied original 1K glTF sources and dependencies, which were MD5 checked and repacked into self-contained GLBs with 512–768px JPEG textures.
- Modular facade **subpieces** are included, not entire heavyweight building kits. The extracted sections retain real doors/windows/walls/cornices for selective placement.
- Original source pages, license, exported SHA-256 checksums, model geometry and optimization details: [assets/realism-provenance.json](../../assets/realism-provenance.json).
- [Poly Haven CC0 license](https://polyhaven.com/license); [Innerscene CC0 terms](https://www.innerscene.com/tools/library/terms).
- The nine existing rigged player/NPC human assets, earlier trees, vehicles and props are preserved.

## Implemented, not merely researched

| Area | Actual integration | Source files |
| --- | --- | --- |
| Selected city buildings | Detailed urban/factory facade window, wall, door and cornice pieces replace bare visual facades; retain original building mass and collision | `src/game/city-world.ts` |
| Public urban areas | City bus, bicycle racks, chainlink fencing, food cart, cafe board, alley trash and rooftop air-conditioning | `src/game/city-world.ts` |
| Market and bookshop | Real commercial shelving and display fixtures in place of rectangular primitive shelves, plus textured registers | `src/game/world.ts` |
| Bakery and cafe | Real croissant meshes and countertop cash registers | `src/game/world.ts` |
| Fresh Spin Laundry | **New ninth enterable interior** with washer/dryers, stacked units, a human attendant, paid wash interaction, passport stamp, safe indoor/outdoor transitions | `src/game/world.ts`, `src/game/layout.ts`, `src/game/logic.ts`, `src/game/door-transition.ts` |

Additional user-facing labels were updated in `src/game/time.ts` and `src/components/life/Overlay.tsx`. The earlier exterior-only laundry activity was replaced with an actual indoor paid interaction. Site coordinates, door routes, fixed sunny visual lighting and version-1 browser save compatibility were retained.

## Mobile-first implementation strategy

- The renderer reuses the existing cached Three.js GLTFLoader and model normalization, including optional Y offset for objects placed on counter tops and rooftops.
- **Demand-based asset loading:** Recent shop/laundry models are requested only when the relevant indoor location is active. Recent detailed city props are requested only outdoors when within **54 metres** of the player. This avoids loading the entire pack at game startup.
- The mobile city facade policy caps selection at six buildings and one upper-level band; desktop can load more. Background city scenery and existing touch controls remain unchanged.
- Physical colliders remain low-complexity boxes and are kept distinct from detailed 3D meshes. New parked vehicles and sidewalk props get conservative collision boundaries. Door arrival points preserve non-retriggering exits.
- The bus is **parked scenery**, not a new working driving system. The laundry appliances are actual models, but spinning machine animations were not added. STEP-only gym CAD assets and whole heavy building kits were deliberately not shipped.

## Tests and evidence

- `npm run test:game`: **42/42 pass**, including checksum integrity for every GLB and checks for the ninth location.
- `npm run typecheck`: **pass**.
- `npm run build`: **pass**, with previously documented nonfatal dependency warnings.
- Software-WebGL Chrome QA captured actual Corner Books models with **60 draw calls** and the new laundromat with **112 draw calls** at a 360x740 portrait viewport. In both captures, rigged humans remained visible and the downloaded models rendered.
- These renderer statistics are **not** physical Pixel 6a benchmark measurements. On-device FPS, temperatures, loading feel and multitouch remain for physical verification.

## Follow-up improvements to consider

First, perform a real-device Chrome walkthrough of the new facade block, market, bookshop, bakery and laundry using saved progress. Confirm that no mesh obscures a Use prompt or active doorway. Then record actual FPS and loading times. If laundromat performance proves marginal, merge repeating appliance meshes/materials and reduce any unnecessary visibility of off-room geometry. Finally, tune architectural module placements to specific streets and screenshots rather than expanding them indiscriminately.

Claude's unfinished strategic research remains separate under `docs/claude/` and **was not required to complete this implementation**.
