# Daybreak Row — implemented game state

**Verified snapshot:** 2026-10-17. **Scope:** features in the checked-out source and the existing regression tests. This document is the canonical description for external research/planning; verify against code if source changes.

## Product and play loop
- Mobile-first, third-person, 3D browser-based urban/coastal life simulation with touch joystick, Run, look drag, Use actions and an in-game phone.
- Player tracks money, hunger, energy, hygiene, fun, social needs, daily activities and an advancing simulation clock.
- Outdoor lighting is visually fixed at clear midday, including when game time says night. This is intentional; **do not** propose darker lighting as an assumed missing feature without acknowledging that product decision.
- Game progress persists locally in the browser under the site's origin; existing version-1 saves are backward compatible.
- World has five connected walkable districts: **Daybreak Row, Old Town, Civic Quarter, Downtown, Arts & Station**.
- The connected city has streets, crosswalks, plazas, decorative buildings, roadside props, ambient moving cars, background pedestrians, and five transit stops (transit currently costs $5 and advances simulated time 18 minutes).
- Named NPCs **Mara, Ellis, Theo, Jun and Idris** follow time-of-day routines, animate, support interactions and are represented in the phone's People tab.
- City Passport: three daily destinations, actionable activity stamps, and a claimable City Hall reward ($65) once per day. District discovery grants one-time exploration rewards.

## Enterable locations — current count: 8
1. Apartment (original harbor interior)
2. Harbor Cafe
3. Cho's Market
4. Northline Office
5. Old Town Bakery
6. Civic Fitness gym
7. Metro Cinema
8. Corner Books

Cinema and bookstore were **changed from outdoor-only actions into real enterable interiors** in the most recent gameplay commit (`f3be9dd`). Do not use the earlier description in `CITY-EXPANSION.md` as the final feature list.

Other storefronts including Fresh Spin Laundry and Parcel Dispatch remain street-side interactions. **Not all buildings are enterable.** Enter/exit sequences fade out, reposition safely and fade back in. Original saves retain their format.

## Current character and environment art
- Character visuals use nine rigged GLB human models, male/female idle-walk-run clips and named character animations, with a procedural fallback.
- Assets include photographed asphalt, concrete, wood, grass, brick textures, interior furniture, GLB vehicles, tree species and transit objects. Mobile uses simplified/capped populations/graphics.
- The city contains procedural/primitive architecture and some placeholder building exteriors or interior geometry despite those asset upgrades. Current captures in `screenshots/downtown-current.png`, `screenshots/bakery-current.jpg` and `screenshots/bookshop-current.jpg` show part of this mix, **not** verified physical phone performance.

## Code orientation
| Area | Main implementation |
| --- | --- |
| World and scene renderer | `src/game/engine.ts`, `src/game/world.ts`, `src/game/city-world.ts` |
| Layout and interaction content | `src/game/layout.ts`, `src/game/city-layout.ts`, `src/game/content.ts`, `src/game/shopfronts.ts` |
| Human/NPC systems | `src/game/actors.ts`, `src/game/human-assets.ts`, `src/game/npc-routines.ts` |
| Environment and streets | `src/game/environment-assets.ts`, `src/game/realistic-vegetation.ts`, `src/game/street-assets.test.mjs` |
| Progress, economy, logic | `src/game/store.ts`, `src/game/logic.ts`, `src/game/city-passport.ts`, `src/game/discovery.ts` |
| Controls and overlays | `src/game/input.ts`, `src/game/virtual-stick.ts`, `src/components/life/` |

## Important unknowns / limitations
- No independently measured sustained physical Pixel 6a FPS, memory pressure, temperature, battery drain or final touch UX certification.
- Scene view tests have used software WebGL (Mesa/llvmpipe); software rendering cannot establish phone GPU performance.
- Environmental detail/texture quality is mixed; replacing everything with high-poly assets would be a regression on the target phone.
- NPC routes are scheduled and visually animated but do not yet implement full persistent pathfinding across the whole city.
- This repository does not contain the player's browser-local saved progress, development-server process, or a universally accessible public game URL.

For historical implementation details, read `NEIGHBORHOOD-LIFE-UPDATE.md`, `CITY-EXPANSION.md`, `STREET-ASSETS.md` and the source files, giving the latest snapshot precedence.
