# Daybreak Row — connected-city expansion and business activities

**Updated current-state summary: 2026-10-17.** This file began as a record of the first city expansion. Subsequent enterable-building upgrades have been reconciled below. For all features, use [docs/handoff/CURRENT-STATE.md](docs/handoff/CURRENT-STATE.md) as the authoritative inventory.

## City and activities
The original coastal Daybreak Row neighborhood connects to mainland districts **Old Town, Civic Quarter, Downtown and Arts & Station**. The connected city offers roads and crosswalks, around nine main urban blocks, a schematic Phone → City district/transit map, moving ambient cars and pedestrians, destinations, jobs and commerce. Five city transit stops offer paid travel at **$5 and 18 in-game minutes**.

| Business | Outdoor location (x,z) | Current access | Activities |
| --- | --- | --- | --- |
| Old Town Bakery | (82, -47) | **Enterable interior** | Pastry ($7), coffee ($3), baker interaction |
| Civic Fitness | (122, -47) | **Enterable interior** | Paid workout ($12), stretch, trainer interaction |
| Metro Cinema | (148, -47) | **Enterable interior** | Movie ($16), popcorn ($4), usher interaction |
| Fresh Spin Laundry | (82, -88) | Street-side interaction | Laundry service ($6) |
| Corner Books | (108, -102) | **Enterable interior** | Book purchase ($8), read, bookseller interaction |
| Parcel Dispatch | (162, -101) | Street-side interaction | Delivery contract (+$38, with cooldown) |

**Important correction to original expansion notes:** Cinema and Corner Books **are no longer exterior-only actions**. They were upgraded to enterable, furnished interiors with staff after the initial six-business expansion. Alongside the apartment, Harbor Cafe, Cho's Market, Northline Office, bakery and gym, that brings the count to **eight**. See [NEIGHBORHOOD-LIFE-UPDATE.md](NEIGHBORHOOD-LIFE-UPDATE.md) for latest interior and NPC details.

Daily City Passport offers three activity destinations and a **once-per-day City Hall $65 reward** after valid completion. Exploration progress grants one-time district discovery bonuses. These systems use optional fields within compatible v1 browser saves. Successful actions can affect money, needs, social/fun and in-game time.

## Core technical approach
- Three.js browser rendering, no packaged APK.
- Original city pathing, safe fade-based enter/exit transitions, interactions, phone UI and locally saved progression remain.
- Street textures, models, humans and foliage have subsequent realism passes and mobile-performance optimizations; refer to [ASSET-BASELINE.md](docs/handoff/ASSET-BASELINE.md).
- Lighting remains clear sunny midday **visually** while world simulation time and schedules continue advancing.
- This remains a developing simulation: additional scenery buildings are *not* all enterable, and traffic and NPC behavior are not complete urban simulations.

## Verification and constraints
Use `npm run test:game`, `npm run typecheck`, `npm run build`. On 2026-10-17 the game tests passed 39/39 and build/typecheck passed; see [RUNTIME-AND-QA.md](docs/handoff/RUNTIME-AND-QA.md) for failures in the broader original scaffold suite and missing on-device measurements.

Implementation source: `src/game/city-world.ts`, `src/game/city-layout.ts`, `src/game/city-passport.ts`, `src/game/door-transition.ts`, `src/game/npc-routines.ts`, `src/game/shopfronts.ts`.
