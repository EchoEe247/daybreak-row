# Independent Game Asset Research

Research here is maintained by ChatGPT/Local Workspace and **does not depend on Claude's separate, unfinished research** under `docs/claude/`. Claude may eventually deliver a ZIP; its findings can be reviewed and merged later without delaying current game work.

## Current research

- [October 17 realism asset scout](REALISM-ASSET-SCOUT-2026-10-17.md): current visual gaps grounded in game source, 18 CC0 candidate assets, evidence and mobile-aware integration plan.
- [Machine-readable candidate catalog](asset-candidate-catalog.json): named source URLs, target code areas, known source specs and QA status.

**Scope:** investigation, publisher license verification, selective GLB structure checks and action plans. This pass **did not change gameplay code or install assets**. Four downloaded example GLBs are kept in the **Git-ignored** local QA workspace, not in the tracked repo. Headline source-model polygon counts are not phone performance measurements.

For implementation, begin with the focused facade/store-interior pilots described in the scout, preserve the existing rigged characters and named NPC package, and test on the actual Pixel 6a before rolling any asset change out citywide.

Older general baseline: [Shipped assets](../handoff/ASSET-BASELINE.md), [Current state](../handoff/CURRENT-STATE.md), [Device and QA](../handoff/RUNTIME-AND-QA.md).
