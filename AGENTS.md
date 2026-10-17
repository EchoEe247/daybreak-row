# Agent instructions — Daybreak Row

This project is a **mobile-first Three.js browser life-simulation game**, currently developed and played locally on an Android Pixel 6a in Termux, not inside the original Grok Build sandbox.

## Canonical repository context
- Read `README.md` and `docs/handoff/CURRENT-STATE.md` before drawing conclusions about gameplay.
- Read `docs/handoff/RUNTIME-AND-QA.md` for how it runs and the exact quality-assurance status.
- Read `docs/handoff/ASSET-BASELINE.md` and source asset manifests before proposing replacements.
- Claude's current research-only brief and output directory: `CLAUDE.md` and `docs/claude/`.
- Game implementation: `src/game/`. Framework scaffold: `src/lib/`, `scripts/`, `server/`, `.grok/`.
- Original upstream Grok Build instructions assumed `/workspace` and a sandbox live-preview pipeline. **Those instructions do not describe this repository's present Android runtime.** The superseded version remains accessible in Git history.

## Nonnegotiable project constraints for proposals
- Preserve the phone-first performance target and touch controls.
- Preserve version-1 local browser saves and existing money/needs/game-time systems unless explicitly approved otherwise.
- The rendered sky stays clear midday; simulation hours and NPC schedules continue to advance. Do not accidentally reintroduce nighttime illumination.
- Keep license provenance and notices, and distinguish free-to-download from free-to-redistribute.
- Do not claim stable on-device FPS or battery performance without real physical-device measurements.
- Current assignment is **documentation/research only**. No unrequested code, asset, dependency, or deployment changes.

## Local commands
Run `./start-local.sh` for the owner's Termux setup (port 4186); run `npm run dev` for standard development (port 8080). QA: `npm run test:game`, `npm run typecheck`, `npm run build`. Other known check failures are documented in `docs/handoff/RUNTIME-AND-QA.md`.

Leave investigation outputs under `docs/claude/`. Source citations, relevant asset URLs and exact licensing proof are expected.
