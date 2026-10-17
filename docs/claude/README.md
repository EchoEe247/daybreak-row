# Claude research workspace

**Status: templates prepared; external research has NOT been completed.** This directory is the designated place for Claude's research and long-term product thinking. It belongs in the same repository as the game so future assistants and developers can reuse the evidence.

## Assignment and context
- Start with [the research brief](RESEARCH-BRIEF.md).
- For the implemented game and environment, read [current game state](../handoff/CURRENT-STATE.md), [runtime and QA](../handoff/RUNTIME-AND-QA.md), [shipped asset baseline](../handoff/ASSET-BASELINE.md), and [the October 17 installed realism package](../research/REALISM-INTEGRATION-2026-10-17.md).
- Follow repository-level [CLAUDE.md](../../CLAUDE.md).
- The [copy-ready prompt](PROMPT-FOR-CLAUDE.md) explains the assignment to the Claude app; see the [public-access checklist](../handoff/TEMPORARY-PUBLIC-ACCESS.md) before changing visibility.
- Current assignment is **research-only**. Do not change game code or ship new 3D assets.

## Where Claude should save work
| File | Deliverable |
| --- | --- |
| [research/ASSET-CANDIDATES.md](research/ASSET-CANDIDATES.md) | Source-linked candidate catalog, licenses, relative merits and shortlist |
| [research/SOURCE-LOG.md](research/SOURCE-LOG.md) | Source verification and evidence trail; unresolved licensing/questions |
| [research/CURRENT-VS-PROPOSED.md](research/CURRENT-VS-PROPOSED.md) | Before/after gap analysis and integration risk |
| [planning/VISION-AND-DESIGN.md](planning/VISION-AND-DESIGN.md) | Plausible future directions, gameplay loops, differentiated value |
| [planning/ROADMAP.md](planning/ROADMAP.md) | Prioritized phases, dependencies, validation gates and measurable milestones |
| [decisions/README.md](decisions/README.md) | Proposed architectural/design decisions and trade-offs |
| [FINAL-HANDOFF.md](FINAL-HANDOFF.md) | Executive summary, top ten actions, remaining questions, updated-on date |

When Claude starts, update the status line and dates of documents it actually completed. Avoid leaving the templates looking like verified findings. Clearly mark *confirmed*, *inferred*, *speculative*, *license not verified*, or *requires device testing*. Link original vendor/creator URLs inline.

## Collaboration
Make all changes to this research folder unless the owner separately approves a code task. Open a pull request if possible so the owner can review recommendations before merging. A repository becoming public briefly does **not** grant anonymous write rights; Claude will require an authorized GitHub integration or another supported means to propose a PR/commit. Otherwise return the documents for the owner to merge.

The owner's local Termux workspace and Android browser saves are not exposed through GitHub; never claim a live device benchmark from source inspection.