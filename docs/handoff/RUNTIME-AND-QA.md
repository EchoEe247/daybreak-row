# Runtime, device and quality-assurance baseline

**Checked on 2026-10-17 in Local Workspace.** This is the actual owner's setup, not the original generated sandbox assumptions.

## Hardware and launch
| Parameter | Actual setup |
| --- | --- |
| Device | Google Pixel 6a |
| Android | 17 (`getprop ro.build.version.release`) |
| Environment | Termux, on-device local checkout |
| Workspace | `$HOME/MainWorkspace/daybreak-row` (Termux home) |
| Node in running environment | `v24.18.0` |
| App type | Browser-hosted Three.js/React/TanStack Start game; **not an APK** |
| On-device URL | `http://127.0.0.1:4186/` |
| Standard `npm run dev` URL | `http://localhost:8080/` |
| Start command on device | `cd "$HOME/MainWorkspace/daybreak-row" && ./start-local.sh` |
| Runtime graphics | Chrome Android/WebGL when played on phone; separate dedicated QA Chromium runs software Mesa/llvmpipe |

The checked-in `start-local.sh` selects port 4186 and starts Vite through `npm run dev -- --port 4186`; it keeps running in Termux. A **GitHub repository link is not a live demo**; `127.0.0.1` resolves only on the device where the server runs. The original exported `startup.sh` was written for another sandbox and should not be used as proof of this Android launch contract.

## Reproduce elsewhere
`git clone https://github.com/EchoEe247/daybreak-row.git`, then `cd daybreak-row`, `npm ci`, `npm run dev`. Node.js **24.18.0 is observed and validated locally**; the inherited scaffold was written with Node 22 assumptions. An external contributor should validate their own environment rather than assuming all other Node versions work.

Browser-origin local saves are not part of GitHub and will not transfer when Claude/another contributor clones the repo. Don't clear the owner's browser storage or reset the save schema to test a research task.

## Actual check results (2026-10-17)
| Check | Status | Interpretation |
| --- | --- | --- |
| `npm run test:game` | **PASS: 48/48** | Gameplay/city/NPC/discovery/door/input/asset regressions |
| `npm run typecheck` | **PASS** | TypeScript compilation check |
| `npm run build` | **PASS** | Vite/Nitro production build; database migration is skipped if DATABASE_URL is absent |
| `npm test` | **PASS** | Retained scaffold/PWA and framework tests now use isolated fixture branding |
| `npm run lint` | **PASS** | Existing lint issues repaired, without hiding affected files |

The new `npm run test:all` aggregate runs general tests, gameplay, types, lint and build. An isolated mobile performance HUD is available using `?perfqa=1`; it has **not** yet produced a sustained physical-device baseline. See [mobile acceptance procedure](../qa/MOBILE-ACCEPTANCE.md).

Build also displays warnings from some dependency `use client` directives; this did not cause a build failure. The check results are a timestamped baseline, **not promises for future commits**.

## Mobile performance policy
No verified sustained physical-device FPS, battery, thermal, GPU-memory or load-time benchmark is currently recorded. Previously used dedicated browser QA ran **software GL**, which can validate screen behavior and visual composition but cannot represent Android GPU performance. Asset research should assume a Pixel 6a-class device and propose provisional size/draw-call/triangle/texture budgets **as hypotheses** to validate on-device, never as measured performance.

The goal is reliable touch controls, stable original save compatibility, responsive interactions and consistent daylight. More physically detailed models must justify their incremental GPU, CPU, storage and download costs.