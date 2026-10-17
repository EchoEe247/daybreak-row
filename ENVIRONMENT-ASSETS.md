# Realistic Environment Assets — Daybreak Row

**Release scope:** Upgrade the original city geometry instead of breaking its working life-simulation gameplay. The prior verified human model/animation package remains unchanged.

## Included CC0 content
- **Poly Haven:** photographed asphalt, poured concrete sidewalks, weathered red brick, wooden plank flooring, grass path surfaces; all shipped in a 1K color/normal/roughness set. Also 1K detailed models of a painted bench, table, sofa, other seating, nightstand, street lamp, and metal trash can.
- **Innerscene:** unbranded GLB sedan (16K triangles) and detailed red sedan (132K triangles). The lighter sedan is automatically used in place of the red sedan on touch devices. The downtown moving-traffic pool is limited to four detailed cars on touchscreens, eight on desktop.
- Exact download URLs, filenames, byte sizes and SHA-256 hashes: `public/environment/manifest.json` and `assets/environment-car-provenance.json`. **All are CC0-1.0** per the source metadata. Source catalog: https://polyhaven.com and https://www.innerscene.com/tools/library/.

## Placement and gameplay invariants
- City pavement, sidewalks, bricks and building façades, grass, indoor floors and concrete surfaces now use photo-based maps.
- Original Harbor has realistic parked/driving vehicles, seating, street bins, and selected street lamps. Apartment, café and office have realistic furniture positioned at existing interaction coordinates. Downtown receives benches, litter bins, and its light-weight moving sedans.
- Preserved player/NPC rigs, city layout, driving paths, original building door/exit logic, collisions, save format and in-game money/needs interactions.
- Original geometry and materials remain fallbacks when a local GLTF fails to load.
- On mobile, diffuse textures retain photographic quality, while auxiliary PBR normal/roughness samplers are disabled to reduce shader/memory load. Geometry batching merges compatible sedan parts and visual models load after the first playable frame.
- On-device Pixel FPS and battery load have **not** been measured. Software-rendered browser QA in mobile-quality mode is only a functional visual check.

## Tests
Run `npm run test:environment`, `npm run typecheck`, `npm run build`. Visual cases tested: Downtown asphalt/traffic, Harbor parked sedan, apartment floor/furniture; simulated joystick+Run and apartment entry/exit. The newer procedural trees and generic building shells are *not yet* fully replaced with scans—the current asset upgrade prioritizes touch-screen performance and gameplay compatibility.
