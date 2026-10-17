# Independent Game Asset Research

Research here is maintained by ChatGPT/Local Workspace and **does not depend on Claude's separate, unfinished research** under `docs/claude/`. Claude may eventually deliver a ZIP; its findings can be reviewed and merged later without delaying current game work.

## Current research

- [October 17 realism asset scout](REALISM-ASSET-SCOUT-2026-10-17.md): current visual gaps grounded in game source, 18 CC0 candidate assets, evidence and mobile-aware integration plan.
- [Machine-readable candidate catalog](asset-candidate-catalog.json): named source URLs, target code areas, known source specs and QA status.
- [Realism implementation report](REALISM-INTEGRATION-2026-10-17.md): actual installed assets, locations, loading strategy, ninth playable interior, build and browser QA.

**Implementation update (2026-10-17):** The approved assets have now been integrated into the actual game. The shipped package contains 23 CC0 GLBs totaling approximately 8.82 MiB, with optimized model files and preserved provenance. [Read the implementation report](REALISM-INTEGRATION-2026-10-17.md). Four early raw samples and all 1K source assets remain in the Git-ignored QA workspace; exported runtime assets are now tracked under `public/environment/models/realism/`. Source model triangle counts are not physical phone performance measurements.

Initial implementations now use focused facade, shop and street props; existing rigged characters and NPCs are preserved. Verify new street placement and smoothness on the actual Pixel 6a before expanding density beyond the documented mobile safeguards.

Older general baseline: [Shipped assets](../handoff/ASSET-BASELINE.md), [Current state](../handoff/CURRENT-STATE.md), [Device and QA](../handoff/RUNTIME-AND-QA.md).