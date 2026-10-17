# Daybreak Row — independent realism asset research

**Research date:** 2026-10-17
**Author:** ChatGPT / Local Workspace research pass
**Historical research snapshot:** this document was written before integration. Since then, **23 optimized/source-verified assets have been installed and a ninth laundromat interior added**. Current implementation results and limitations: [REALISM-INTEGRATION-2026-10-17.md](REALISM-INTEGRATION-2026-10-17.md). This original shortlist remains a reference; Claude's separate future research is not a dependency.
**Target:** Pixel 6a / Android 17 / Termux / Chrome / Three.js, current source on `main`.

## Decision summary

**Keep the current rigged human and NPC package.** It is the strongest existing realism baseline: 9 licensed textured human GLBs plus walk/run/idle animation clips. The next large improvement is to bring buildings, interiors, street life and asset consistency up to the same standard. Do not replace people with another pack just to change assets.

**Priority order:** (1) building *facades and door/window silhouettes*, (2) furnished/credible interiors and storefront displays, (3) city street furniture/vehicle diversity, (4) a new playable destination, (5) small material/decals/lighting refinements. This is a **research recommendation**, not a change to gameplay priorities.

### Evidence from current code

| Visual issue | Direct source evidence | Best asset strategy |
| --- | --- | --- |
| Too many rectangular building bodies and uniform windows | `src/game/city-world.ts`: `boxGeo`, batched `mass`/`windows`, `bld(...)`; some facades use PBR maps but geometry is still boxes | Use selected real facade modules (doors, frames, sills, balconies, cornices, weathering) over existing building/collider mass; build shared material atlases, sample one city block first |
| Harbor architecture and interior objects still largely procedural | `src/game/world.ts` uses many built-in Box/Plane instanced meshes, with some existing GLTF props layered on | Target high-visibility corners, doorways, counters, store shelves, equipment, appliances and food props; retain performant collision boxes |
| Several front-window displays are flat illustrations | `src/game/shopfronts.ts` draws bakery/gym/cinema/laundry/books/courier window scenes in Canvas2D | For enterable sites, use real nearby 3D displays visible at player level; non-enterable shop fronts can keep cheap planar depth/fake occlusion |
| Vehicle population has very few distinct realistic source models | `src/game/environment-assets.ts` and `public/environment/models/`: `realistic-sedan.glb` and `red-sedan.glb` | Keep existing cars; add realistic buses + visibly different silhouettes, not stylized toy vehicles |
| Trees, street lamps, litter bins and benches already received a realism pass | `src/game/realistic-vegetation.ts`, `environment-assets.ts`, `STREET-ASSETS.md` | **Retain existing** assets; fill missing categories (bike racks, utilities, delivery, storefront equipment) instead of duplicating identical trees/benches |
| City has destinations that are not full interiors | `CITY-EXPANSION.md` and `docs/handoff/CURRENT-STATE.md` | Research new purposeful environments such as laundry, transit station and shop interiors; don't automatically make every building enterable |

## Shortlist — original provider pages verified

**Licenses:** Poly Haven's [official asset license](https://polyhaven.com/license) states its models/textures are CC0, including commercial and redistribution use. Innerscene's [official library terms](https://www.innerscene.com/tools/library/terms) describe original contributions as CC0 and permit modification and redistribution. [ambientCG's own site](https://ambientcg.com/) declares its materials/models CC0. These are *publisher-level license checks*; files/embedded components still need local verification before adding to the game.

**Technical metadata notation:** numbers below are **website-reported source-model triangle counts or published download sizes**, not measured mobile GPU cost or the size after conversion. Unknown means not verified.

| Rank | Asset / official link | Type | Publisher-reported data | Target integration | Verdict |
| --- | --- | --- | --- | --- | --- |
| **1** | [Modular Urban Apartments Facade](https://polyhaven.com/a/modular_urban_apartments_facade) | **Replacement** | Poly Haven, CC0, **118K triangles** full modular kit; glTF available; large multi-map 4K/8K source | `city-world.ts` apartments, commercial-building door/window facade rhythm and upper stories | **High visual upside, high conversion cost.** Extract only needed modules; LOD/atlas/merge required. Do *not* instantiate 118K per building. |
| **2** | [Modular Factory Facade](https://polyhaven.com/a/modular_factory_facade) | **Replacement** | Poly Haven CC0, **175K triangles** full factory kit; glTF | Industrial blocks, delivery/station and warehouse-like businesses | Strong architectural contrast; treat as a selective facade-parts source, never copy whole full-resolution kit repeatedly. |
| **3** | [Rollershutter Window 01](https://polyhaven.com/a/rollershutter_window_01) | **Replacement + addition** | Poly Haven CC0, **~1K triangles** | Closed storefronts, parking/loading entrances, industrial shop fronts | **Very good pilot:** realistic detailed silhouette with small geometry, texture decimation necessary. |
| **4** | [Shelf 01](https://polyhaven.com/a/Shelf_01) | **Replacement** | Poly Haven CC0, **182 triangles** | Bookshop, market, apartment closet and storage | **Ideal mobile first-pass.** Keep cheap mesh and import ~1K color/normal maps; can instance. |
| **5** | [Steel Frame Shelves 01](https://polyhaven.com/a/steel_frame_shelves_01) | **Replacement** | Poly Haven CC0, **~4K triangles** | Market, bookshop, station and parcel shop | High practical realism per triangle. Use selected shelves only and varied shelf contents. |
| **6** | [Wooden Display Shelves 01](https://polyhaven.com/a/wooden_display_shelves_01) | **Replacement** | Poly Haven CC0, **~3K triangles** | Corner Books and retail interiors | More distinctive shop appearance; good near-player prop. |
| **7** | [Croissant](https://polyhaven.com/a/croissant) | **Addition** | Poly Haven CC0, **~2K triangles** | Bakery pastry display, cafe props; optional collectible/interaction | High-frequency human eye-level detail; use a small number/instances with compressed atlas. |
| **8** | [Cash Register 01](https://polyhaven.com/a/CashRegister_01) | **Addition** | Poly Haven CC0, **~10K triangles** | Cafe, bakery or market counter | Highly visible; vintage styling may not fit every store. One hero instance max per room. |
| **9** | [Standing Chalkboard 01](https://polyhaven.com/a/standing_chalkboard_01) | **Addition** | Poly Haven CC0, **~2K triangles** | Cafe/bakery sidewalk menu | Plausible readable storefront cue; bake sign text to single low-res material. |
| **10** | [Trashbag](https://polyhaven.com/a/trashbag) | **Addition** | Poly Haven CC0, **~4K triangles** | Alleys, loading zones and curbside bins | Promising street micro-detail; avoid large counts / harsh repeating placement. |
| **11** | [Low-floor city bus](https://www.innerscene.com/tools/library/3d-parts/low-floor-city-bus-9e7ce899) | **Addition** | Innerscene original CC0, **803,152 bytes / 18,780 triangles / 85 primitives / 9 materials / zero textures**, as locally inspected; no seats/mechanisms | Transit stop parked/animated bus in `city-world.ts` | **Conditional candidate only:** geometry detail is reasonable, but zero textures and 85 primitives mean photorealistic quality is *unproven*. Batch parts and visually inspect before considering it an upgrade. |
| **12** | [Three-loop bicycle rack](https://www.innerscene.com/tools/library/3d-parts/three-loop-bicycle-rack-3a1b8cc5) | **Addition** | Innerscene original CC0, **150,956 bytes / 3,516 triangles / 9 primitives / one embedded PNG**, ~1.8m x .76m x .866m, inspected locally | Civic park, gym, transit and shops | Easy set dressing, minimal geometry/material footprint pending load test. |
| **13** | [Exterior Aircon Unit](https://polyhaven.com/a/exterior_aircon_unit) | **Addition** | Poly Haven CC0, **~19K triangles** | Rooftops, offices, station and side streets | Useful silhouette/material realism, but convert/downsample and use limited visible instances. |
| **14** | [Washer-dryer](https://www.innerscene.com/tools/library/3d-parts/washer-dryer-ac3fa07d) | **Future new location** | Innerscene original CC0, **571,936 bytes / 5,868 triangles / 54 primitives / six textures** from local GLB inspection | Candidate for eventual **enterable Fresh Spin Laundry**; real appliances | Low file-size candidate. Requires game location/interior/collision/UI work before it contributes to play. |
| **15** | [Stacked washer and dryer](https://www.innerscene.com/tools/library/3d-parts/stacked-washer-and-dryer-9ce30252) | **Future new location** | Innerscene original CC0, **915,172 bytes / 11,792 triangles / 114 primitives / six textures**, ~1.71m tall, local GLB inspection | Laundromat rows | Good variation; first confirm game world has space and safe door transitions. |
| **16** | [Leg press — Gym equipment](https://www.innerscene.com/tools/library/3d-parts/leg-press-gym-equipment-75e948fb) | **Addition, higher pipeline risk** | Innerscene original CC0, **480 KB STEP CAD**, not browser-ready | Civic Fitness floor | Requires CAD→mesh→decimation→GLB and surface materials. Do not treat STEP bytes as game download size. |
| **17** | [Coffee Cart 01](https://polyhaven.com/a/CoffeeCart_01) | **Addition** | Poly Haven CC0, **~28K triangles** | Outdoor food-cart activity and city plaza | Hero prop with high visual value but must optimize and limit placement. |
| **18** | [Modular Chainlink Fence](https://polyhaven.com/a/modular_chainlink_fence) | **Replacement/addition, defer** | Poly Haven CC0, **~89K triangles** full kit | Station, storage/delivery yards | Use optimized transparent mesh segments only after checking alpha-overdraw and depth sorting on Android. |

### Good secondary choices (not immediate)

- [Fire Hydrant](https://polyhaven.com/a/fire_hydrant) — Poly Haven CC0, **~86K triangles**: *too heavy unchanged* for repeated curb props; decimate/bake or choose a more economical option.
- [Concrete Road Barrier 02](https://polyhaven.com/a/concrete_road_barrier_02) — Poly Haven CC0, **~43K triangles**: useful as a limited hero near construction, but use reduced LOD for multiples.
- [PavingStones001](https://ambientcg.com/a/PavingStones001) — ambientCG CC0 catalog texture candidate for replacing monotonous walk material. **Individual texture page/download inaccessible in this research session; validate exact package before using.**
- [Pretville Street HDRI](https://polyhaven.com/a/pretville_street) — Poly Haven CC0 photographic street environment: *option* for generating a small baked, fixed **daytime reflection/environment map**, not for adding nighttime lighting or shipping 8K HDRI. Need consistent sky/sun direction and GPU/material tests.
- [Low-poly traffic light](https://www.innerscene.com/tools/library/3d-parts/low-poly-city-traffic-light-94ebd054) — **do not recommend as a realism asset** despite 15 KB/CC0; suitable only as a collision/proxy or prototype until a photoreal game-ready version is verified.

## Sources and license confidence

| Publisher | Evidence checked | License confidence | Remaining verification |
| --- | --- | --- | --- |
| Poly Haven | [license](https://polyhaven.com/license), individual asset pages above | High: official CC0 declaration | Confirm exact downloaded texture/model archive, dimensions, copyright notices where supplied and converted glTF format |
| Innerscene | [library terms](https://www.innerscene.com/tools/library/terms), individual original-model records above | High for models explicitly marked *Innerscene - original* CC0 | Recheck each publisher/creator field when downloading; verify file bytes and geometry/material counts |
| ambientCG | [ambientCG homepage](https://ambientcg.com/) and [documentation](https://docs.ambientcg.com/license/) | High at catalog level for CC0; *specific paving stone link not fetched* | Confirm individual asset URL, available 1K/2K formats and map channels |

**Not evaluated and not approved for bundling:** individually listed Sketchfab, Fab, CGTrader or scan-site items lacking a checked author/license grant; copyrighted game rips; heavily branded cars; "free personal-use" licenses; licensed vendor downloads that restrict source-file redistribution. Future search can revisit these, but they should not displace well-supported CC0 candidates.

## Actual binary smoke-test results (local QA, 2026-10-17)

The following source files were fetched from the **direct Innerscene download links** and GLB JSON/chunk structure inspected. No images were rendered and no real GPU profiling was done. They were stored only under Git-ignored `work/local-qa/daybreak/asset-scout/`.

| Candidate | Actual GLB bytes | Indexed triangle estimate | Mesh primitives | Materials / embedded textures | SHA-256 (downloaded bytes) | Implication |
| --- | ---: | ---: | ---: | --- | --- | --- |
| Low-floor city bus | 803,152 | 18,780 | 85 | 9 / **0** | `42fc939d64b8bcfc5329e13356fc984872c18ecb10535da6354f98ea58d3519c` | More detail than a boxy bus, but textureless colored materials; do not call it photoreal yet; combine primitives and review side-by-side |
| Three-loop bicycle rack | 150,956 | 3,516 | 9 | 1 / **1 PNG** | `6e9b71524cfe13285c6660ad1c35dfbf7fa7fbf0f9199d614b44aa1c08aaecfe` | Excellent small new city prop prospect, subject to visual review |
| Washer-dryer | 571,936 | 5,868 | 54 | 6 / **6** | `fb3b6e29441cd24665fa04b77a797d970f7b23a0cb8f252f0bb6f4ee706ccaaf` | Candidate future laundry interior, needs mesh batching |
| Stacked washer/dryer | 915,172 | 11,792 | 114 | 6 / **6** | `afac477af41c0980fc40872eb8328fd9e38178fb73774936039e5784a735bb76` | Detailed but relatively draw-call-heavy; batch parts and limit number of independently drawn copies |

Triangle counts above are derived from GLB triangle primitive accessor counts, not a render-time measurement. Embedded textures may be flat/color-only and **do not prove photorealistic appearance**. Optimized exports must be separately audited.

## High-value pilots for continued work — independent of Claude

### Pilot A: one believable downtown street frontage
- Keep current `bld()` masses/colliders in `src/game/city-world.ts`. **Do not replace walkable road geometry or save IDs.**
- Extract 1–3 Poly Haven apartment/factory facade module types; optimize (lower LOD, 1K material atlas, deduplicate windows/doors, optional normal map).
- Add cheaper roller shutter and architectural trim details to **one** block first, not all 26 buildings.
- Compare identical camera views, visible tiling, door interaction, asset-load time, draw calls and phone FPS against old scene.
- **Acceptance:** facade looks plausibly built, collision and paths remain correct; no visible stutter on actual Pixel 6a.

### Pilot B: credible enterable shops
- Replace selected block shelves and counter props in Corner Books / bakery / market with the 182-triangle Shelf 01, 3K wooden display shelf, 4K steel shelves and 2K croissants.
- Keep existing customer use points, actor rigs, fades and room collider structure.
- Add believable checkout counter and signage; bake static decorative clutter into few batches.
- **Acceptance:** doorway remains safe; rooms no longer feel like empty procedural stages; no new menu, touch or save regressions.

### Pilot C: living street / meaningful new additions
- Keep the realistic car assets. Prototype **a few bicycle racks** by civic/gym areas and selected aircon/curb props. **Gate the 784 KB bus** behind a visual review and static batching: the source GLB has 85 primitives and no textures, so it may not meet the desired realism target.
- For a **later approved new interior**: realistic washer-dryers for a playable laundromat. Merely adding models to non-enterable Fresh Spin Laundry would not deliver worthwhile gameplay; plan a real location.
- **Acceptance:** visible category diversity at phone eye level, no collisions obstructing sidewalks, steady mobile frame pacing and no increase in unnecessary loading at start.

## Proposed technical constraints (not measured device benchmarks)

- **Build source vs. runtime size:** Poly Haven headline 8K download packages are huge and **must not be copied unchanged into the game repo**. Select 1K/2K channels only, generate compact GLB and use compressed textures where verified compatible.
- Aim initially for **single-object hero props under ~5–15K triangles** near player, *ideally less for repeated props*, but treat this as a proposed constraint to calibrate with real phone QA—not a hard universal limit.
- **Facades:** keep low-poly physics mass separate; material-atlas and share geometry; one new foreground-detail asset should not create dozens of extra draw calls.
- **Textures:** use color-only for distant buildings, color + normal + ORM selectively near player; explore Basis Universal/KTX2 when loader/toolchain support is implemented and tested.
- **Occlusion:** city currently batches geometry and has some batches with `frustumCulled=false`; any additional high-detail props should be *visibility bounded*, pooled and avoid high-frequency material switching.
- **Variation:** add selective architectural silhouette and mixed façade pattern before increasing total prop count; duplicated 3D models with no scale/placement variation still look synthetic.
- **Interaction:** when replacing buildings/interiors, preserve original trigger coordinates and v1 save compatibility. Permanent visual daylight remains intentional.
- **License:** add each approved binary to a provenance manifest with original download URL, publisher, license URL, SHA-256, optimization steps, date, and redistribution notice where relevant.

## Open research questions

1. **Best lightweight photoreal vehicles:** Search beyond the already-shipped sedan and Innerscene bus for genuinely textured trucks, delivery vans, bikes and motorcycles with explicit game redistribution rights; do not treat "low-poly city" toy models as photoreal substitutes.
2. **A coherent contemporary shopfront kit:** The Poly Haven urban facade source is strong but too heavy unchanged. Test converting just parts or source-level baking a small facade atlas; source rights are settled, integration value must be proven.
3. **Road-level fine detail:** Find useful 1K cracks, tire marks, drainage grates, worn painted lines, curb decals and road seams from a CC0 publisher with links to *exact* matching assets; improve geometry at crossings.
4. **Exterior storefront signs and interiors:** Identify mesh/material pack with real-world counter glazing, light fixtures and appliances; prefer selective high-quality items over dense whole-scene scans.
5. **Audio:** Original engine has `src/game/audio.ts`; compare audio realism separately and verify Creative Commons/Public Domain licensing before additions.
6. **Physical Pixel QA:** Actual device FPS, load times, GPU memory and thermal headroom remain unmeasured. These are required to choose safe mesh and texture budgets.

## Ownership and integration

This is independent ChatGPT research in `docs/research/`. **Do not overwrite Claude's still-pending files in `docs/claude/`.** When Claude eventually delivers a ZIP, evaluate it against this source-grounded shortlist, resolve conflicting licenses and use the most practical findings from both. The game can continue evolving without waiting.

**Subsequent action:** integration is recorded in [the current report](REALISM-INTEGRATION-2026-10-17.md). These notes reflect the earlier research phase. No actual physical-phone FPS benchmark has been performed.