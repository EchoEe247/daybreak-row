# Neighborhood Life Update — Cinema, Bookshop & Resident Routines

> **Historical record:** This update originally brought the game from six to eight interiors. Fresh Spin Laundry became the **ninth enterable interior** in the subsequent October 17 asset-realism upgrade. Refer to [the current game state](docs/handoff/CURRENT-STATE.md) and [integration report](docs/research/REALISM-INTEGRATION-2026-10-17.md) for the latest implementation.

This update extends Daybreak Row from **six to eight enterable interiors** without replacing the mobile controls or changing the version-1 save format. It builds on the previous Bakery / Civic Fitness interiors.

## Metro Cinema — Downtown
* Entrance: x=148,z=-47 (near the existing storefront).
* Inside: a cinema lobby, ticket and concession counters, visible screen, film posters, seating, an animated usher.
* Interactions: **Watch a movie** $16, +38 fun / +5 social / 98 in-game minutes; **Popcorn** $4, +14 hunger / +5 fun; **Ask the usher** for dialogue and social gains.
* Exit at x=148,z=-43.5, outside the entrance trigger radius.

## Corner Books — Civic Quarter
* Entrance: x=108,z=-102, at the original bookstore storefront.
* Inside: library shelves, books, display tables, reading nook and a licensed animated bookseller.
* Interactions: **Buy a book** $8, +21 fun / +6 social / 30 minutes; **Read free** +13 fun / +4 energy; **Talk to the bookseller** for a social interaction.
* Exit at x=108,z=-98.4, outside the entrance trigger radius.

Cinema tickets and book purchases stamp the corresponding location on the daily City Passport, with payment checks. The exterior one-tap actions for these two venues are replaced by actual doors; remaining businesses retain their original sidewalk interactions.

The same 280ms fade, snapped-camera and input-clearance transition pipeline is used for all eight doors. Loading a saved player near an exit moves only their arrival position to the safe spawn. All original harbor interiors, bakery, gym, city transit, daily errands, daylight and saved progress remain.

## Resident Routines

Mara, Ellis, Theo, Jun and Idris have deterministic, time-of-day routes. Named neighbors walk with their rigged character animations in the harbor, at Old Town Plaza and in Downtown at relevant hours, including after work. Approaching them enables the original dialogue system. Phone → **People** now displays their current activity/whereabouts, rather than a static biographical address.

The city exploration reward system is also included: visiting a new district records progress, awards a one-time $18 district bonus, and completing all five districts gives an additional $120. Optional persisted data fields leave old saves compatible.

## QA / constraints

- `npm run test:game`, `npm run typecheck`, `npm run build` and targeted ESLint are required.
- The tests cover eight safe door pairs, deterministic resident schedules, city discovery and all existing game systems.
- Dedicated browser tests confirmed Metro Cinema and Corner Books venue transitions and transactions; a scheduled Jun in Old Town at 10:30 AM was visibly active, animated walking, and talkable.
- Physical Android performance, touch comfort and real-device frame rate are still for the player to verify.

Further work: stronger indoor materials/lighting, deeper cinematic interactions, real NPC travel across city roads instead of offscreen schedule relocation, and eventually more enterable buildings.