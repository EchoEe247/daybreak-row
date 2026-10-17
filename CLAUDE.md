# Claude handoff — Daybreak Row

This file is the entry point for Claude or another repository-only research assistant. The owner's current runtime is Termux on a Pixel 6a. **This task is research and planning, not implementation.** Do not change game code, installed assets, save schema, or configurations unless the owner separately requests it.

## Read in this order
1. `README.md` — game overview and navigation.
2. `docs/handoff/CURRENT-STATE.md` — authoritative implemented features and limits.
3. `docs/handoff/RUNTIME-AND-QA.md` — real Android device/runtime and reproducible checks.
4. `docs/handoff/ASSET-BASELINE.md` — what is already installed, licensing, and performance policy.
   The October 17 [realism integration report](docs/research/REALISM-INTEGRATION-2026-10-17.md) records 23 newly installed CC0 models and the ninth enterable interior.
5. `docs/claude/RESEARCH-BRIEF.md` — the actual assignment, methodology, and acceptance criteria.
6. `docs/claude/README.md` — expected deliverables and exact destinations.

**Authority:** Current source code, package scripts, license files and asset manifests take precedence over summaries. Subsequent October 17 development has already improved facades, shops, city props, and added an enterable laundry; investigate what remains rather than re-recommending installed assets. The handoff documents reflect a verified snapshot on 2026-10-17. Older root-level update reports describe development stages, not necessarily today's state. `AGENTS.md` contains current general project guidance; the original exported Grok-specific contract has been replaced because its `/workspace` runtime instructions did not apply to the owner's phone.

## Your assignment
Research the **most realistic genuinely free 3D assets** suitable for improving or replacing current game assets, while preserving the Pixel 6a/Android mobile-first target. Then propose the game's future direction, a prioritized multi-phase roadmap, and measurable upgrade plan. Use the documented output folder `docs/claude/`. Distinguish independently confirmed findings from conjecture and link to original publishers/license pages.

Do not assume a temporarily public GitHub repo means its game code is open-source or that third-party media can be relicensed. No repo-only assistant can inspect the owner's live local environment; treat local hostnames and earlier QA reports as documentation, not remote access.

**Deliverables:** `docs/claude/research/ASSET-CANDIDATES.md`, `docs/claude/planning/ROADMAP.md`, `docs/claude/planning/VISION-AND-DESIGN.md`, and `docs/claude/FINAL-HANDOFF.md`. Replace template contents with researched material, clearly retaining uncertainties.