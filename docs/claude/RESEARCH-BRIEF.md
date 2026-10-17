# Research request — realistic free assets and the future of Daybreak Row

**Requested by game owner, 2026-10-17. Status: ready for Claude to execute.**

## Primary objectives
1. Examine this repository's **actual current game, world rendering, gameplay, bundled models/materials and device constraints**, not just screenshots.
2. Research the **most visually realistic genuinely free assets** capable of **replacing or adding to** the current game: 3D models, characters, animations, textures, buildings, interior props, roads, vegetation, vehicles, city scenery and potentially sound.
3. Produce a ranked, **evidence-based asset shortlist** with realistic integration cost, mobile-friendly variants, license confidence and performance implications.
4. Independently think about the **future identity of Daybreak Row** as a long-lived game: better content, systems, unique gameplay, visual quality, immersion, expansion and technical sustainability.
5. Deliver a phased, prioritized **ROADMAP** with milestone outcomes and QA gates. Recommend what to do first, what not to pursue, and why.

## Nonnegotiable baseline
- Target phone is a **Pixel 6a (Android 17)** using **Chrome + Termux**. This is a Three.js browser game, **not an APK**.
- Current game has **five districts, nine enterable interiors, named scheduled NPCs, mobile virtual controls, economy/needs, local version-1 saves, daily City Passport, and district discovery**.
- Time continues moving, but the visual world has **permanent bright midday lighting by design**.
- Preserve playable mobile performance, existing interactions, physical door transitions, browser saves and licenses unless a later task authorizes change.
- Real on-device FPS/thermal/battery benchmarks are **not available**. Label performance budgets as **proposed estimates**.
- Claude **does not have the Local Workspace plugin**, so do not pretend to test the owner's phone, local server or current save.

## Research approach
**Step 1 — audit the existing repo.** Compare current `src/game/`, `public/environment/`, `public/humans/`, `public/environment/models/realism/`, `assets/realism-provenance.json`, `screenshots/` and current handoff docs, including the [October 17 implementation](../research/REALISM-INTEGRATION-2026-10-17.md). Note where present assets already solve a problem and where procedural art remains.

**Step 2 — search original or well-attributed sources.** Investigate high-quality no-cost libraries/catalogs and reputable creators, starting from the documented existing Poly Haven and Innerscene sources and expanding. Source recommendations are not validated until examined independently. Distinguish:
- **CC0/public-domain-equivalent** with evidence and caveats;
- **free with attribution/redistribution obligations**;
- **free for personal use only / restricted game redistribution**;
- **unknown or paid** (exclude from approved shortlist).

Do not assume that a search-results label, aggregator mirror, Sketchfab listing, promotion or "free download" button grants permission for bundling. Avoid pirated game dumps, ripped assets and incompatible editorial/NC licenses.

**Step 3 — prioritize useful categories.** Architecture/building exteriors; interiors; realistic street surfaces, curbs, trees and small city props; more varied mobile-viable vehicles; human character quality/animation; lighting/material coherence; ambient audio where useful; asset streaming/LOD/compression. Some may be best solved through rendering, textures or animation quality rather than adding polygon counts.

**Step 4 — evaluate candidates.** For each meaningful option, capture:
- exact asset name, **original source URL**, creator, source page checked date;
- verified license **URL/text** and rights for game redistribution/commercial use/modification, attribution obligations;
- download format, dependencies, texture set resolution, polygon count / size (or mark unknown), skeleton/animation info if relevant;
- exact **existing game target** (asset or function to replace/add to);
- visual benefit relative to present state, integration difficulty and collision/rigging/animation/LOD work;
- mobile performance risk, conversion/compression plan and lightweight alternative;
- recommendation status: **shortlist**, **needs checking**, **reject**, or **future-only**.

**Step 5 — design and roadmap.** Give at least two plausible game directions with comparative strengths and a reasoned chosen direction. Make the roadmap milestone-driven rather than a generic wish list. Cover art consistency, gameplay depth, city life/NPCs, interiors, map/world architecture, audio, controls/UX, AI/agent ideas where suitable, QA/optimization and release/distribution choices. Prioritize with **impact, confidence, effort, risk, dependency**, and explicit release/rollback criteria. Challenge impractical ideas.

## Files Claude must update
- `docs/claude/research/ASSET-CANDIDATES.md`: candidates, ranked shortlist, license details.
- `docs/claude/research/SOURCE-LOG.md`: where each claim came from and what's uncertain.
- `docs/claude/research/CURRENT-VS-PROPOSED.md`: source-file grounded upgrades and budgets.
- `docs/claude/planning/VISION-AND-DESIGN.md`: proposed future of the game.
- `docs/claude/planning/ROADMAP.md`: short/medium/long-term phases with measurable gates.
- `docs/claude/FINAL-HANDOFF.md`: concise recommendation, top priorities, open questions.

## Definition of done
The owner can read the documents alone (without the Local Workspace plugin), independently verify links and licenses, identify the **first three changes worth implementing**, and hand the roadmap to an implementation agent without guessing which current systems/files/assets to change.

**Do not** implement game changes, import models, overhaul gameplay, delete historical files, claim device FPS, or switch GitHub repository visibility in this research task.