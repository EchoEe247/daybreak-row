# Current asset inventory and research gaps

**Snapshot:** 2026-10-17. All asset proposals must first compare against what is already present; avoid recommending an asset that's already bundled unless replacing it offers a meaningful improvement.

## Shipped and documented
| Category | Existing baseline | Where to inspect |
| --- | --- | --- |
| Rigged humans | Nine GLB character models with male/female idle, walk and run animation clips; procedural fallbacks | `public/humans/`, `src/game/human-assets.ts`, `HUMAN-ASSETS.md` |
| Human licenses | MIT-licensed source package with preserved Microsoft copyright/permission notice | `public/humans/LICENSE-Microsoft-MIT.txt`, `assets/human-provenance.json` |
| Ground/wall/floor materials | Poly Haven photo-based 1K texture sets (asphalt, concrete, red brick, grass path, wood) | `public/environment/textures/`, `public/environment/manifest.json` |
| Furniture/urban clutter | Benches, sofas, wooden tables, nightstand, bins, lamps and similar props | `public/environment/models/`, `ENVIRONMENT-ASSETS.md` |
| Vehicles | Two locally bundled GLB car sources, including mobile lighter-geometry alternatives | `public/environment/models/realistic-sedan.glb`, `red-sedan.glb`, `assets/environment-car-provenance.json` |
| Street trees/transit | Optimized/batched oak, maple, linden GLBs; bus shelter, signage and recycling props | `public/environment/models/`, `assets/trees-provenance.json`, `STREET-ASSETS.md` |
| Implementation detail | Instancing, model pooling, frustum culling and cheaper mobile material/shadow settings | `src/game/environment-assets.ts`, `src/game/realistic-vegetation.ts` |

Environmental Poly Haven and Innerscene assets are described as **CC0 1.0** in their provenance/manifest files; character assets are documented as **MIT**. **Claude must independently verify licensing and source integrity for all new recommendations**. "Free" on a storefront is not proof of license for redistribution, commercial use, modifications, AI use or game bundling.

## Current visual/technical gaps to investigate — not yet approved work
- Architecture/building shells, realistic windows, doors, materials and skyline cohesion.
- Interior scene variety, lighting, props, believable placement and avoiding repetitive layouts.
- More believable vehicle diversity, pedestrian animation, clothing, interaction props and NPC behaviors.
- Street detail, sidewalks, curbs, vegetation variety, signage and clutter density.
- Better player movement/animation blending and visual polish.
- Streaming, LOD, compressed textures/mesh, loading, collision and caching so realism stays usable on the phone.

These are **research targets**, not claims that particular assets already solve them or that game systems should be rewritten.

## Rules for comparing replacements
1. Reference an **existing location/file and visible limitation** before recommending replacement.
2. Seek real downloaded asset bytes/format and texture/triangle size from reliable metadata when available. Mark *unknown* if not measured.
3. Prefer GLB/glTF, or a realistic import path; specify transforms/animations/collider/rigging work if needed.
4. Confirm compatibility with mobile browser WebGL and licensing, including original creator and attribution conditions.
5. Distinguish CC0/MIT-style redistribution from merely no-cost acquisition; **no scraping paid assets, ripped commercial-game assets, or unclear license sources**.
6. Offer a mobile-friendly alternative when a high-quality source asset is too heavy; don't silently ship huge originals.

See also `ENVIRONMENT-ASSETS.md`, `STREET-ASSETS.md`, `HUMAN-ASSETS.md` and the manifests in `assets/` / `public/environment/`.
