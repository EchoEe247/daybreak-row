# Current game vs. proposed realism upgrades

**Status: NOT STARTED.** Claude should compare actual source and screenshots before recommending replacements.

| Area / scene | Current implementation path + existing look | Gap and evidence | Proposal + candidate link | Expected improvement | Impact on mobile WebGL | QA plan | Priority |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Example only | `src/game/world.ts` (inspect before filling) | Not assessed | Not researched | Unknown | Unknown | Compare like-for-like camera view | TBD |

## Baseline and suggested budget (do not invent measurements)
Record measured CPU/GPU/render stats where they actually exist, and label any hypothetical limits as proposed targets. Specify how future implementers could measure FPS, frame time, draw calls, JS heap, memory use, transfer/download size and thermal behavior on the Pixel 6a.

## Migration/integration strategy
Compare *asset replacement*, *material-only polish*, *LOD/proxy*, *geometry batching/instancing* and *deferred loading*, especially for pedestrians, cars, trees and architecture. Preserve collision proxies and animations where existing mechanics depend on them.

## Risks
Include source/license ambiguity; mobile GPU load; download/flash size; material and skin compatibility; rigging/animation retargeting; clipping/interior collisions; third-party dependencies; regression risks for v1 saves and touch input.

## Proposed proof-of-concept A/B review
Define consistent in-game camera views and objective QA/performance gates for before/after comparison; do **not** represent software-browser captures as physical phone measurements.
