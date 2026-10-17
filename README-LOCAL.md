# Daybreak Row — current phone setup

**Current operational summary: 2026-10-17.** For the complete, dated baseline see [runtime and QA](docs/handoff/RUNTIME-AND-QA.md) and [current features](docs/handoff/CURRENT-STATE.md).

## Actual device and how to play
- **Phone:** Google Pixel 6a, Android 17.
- **Host:** Termux, Node.js v24.18.0 observed locally.
- **App:** Three.js/React browser game (not an APK).
- **On-phone browser URL:** `http://127.0.0.1:4186/`, open in Chrome *on the same phone*.
- **Local project:** `$HOME/MainWorkspace/daybreak-row` under the Termux home directory.

In Termux:
```sh
cd "$HOME/MainWorkspace/daybreak-row"
./start-local.sh
```

The script detects an already-running server; otherwise it launches the development server in the background on port 4186. Keep Termux running while playing. If Android suspends the process, rerun the command. Other machines use `npm ci` followed by `npm run dev` (normally port 8080).

**Saves remain in the browser for that exact local origin**, not in GitHub or any cloud database. Do not clear site data for `127.0.0.1:4186` if you want to preserve your game. Do not assume that a GitHub clone includes current player progress.

## Gameplay and controls
Drag the lower-left virtual joystick to walk/strafe; hold **Run** with another finger to sprint; drag the world to look; tap **Use** near an action. The in-game **Phone** contains City and People information.

Five connected districts: Daybreak Row, Old Town, Civic Quarter, Downtown, and Arts & Station. **Eight enterable interiors:** apartment, Harbor Cafe, Cho's Market, Northline Office, Old Town Bakery, Civic Fitness, Metro Cinema, Corner Books. Additional storefronts (e.g. laundry and courier) remain sidewalk-based interactions. Named NPC routines, economy/needs, daily passport and district discovery exist. Daylight is deliberately fixed visually even though the simulation clock moves.

## Validated check results — 2026-10-17
- `npm run test:game`: **39/39 pass**
- `npm run typecheck`: **pass**
- `npm run build`: **pass**, with nonfatal dependency warnings; missing DATABASE_URL skips the optional migration
- `npm test`: **fails original scaffold branding/PWA test assumptions**; not equivalent to failed game tests
- `npm run lint`: **two existing findings** (`src/game/human-assets.test.mjs:1` and `src/lib/app-data/client.server.ts:281`)

Desktop/dedicated browser QA used software WebGL (Mesa/llvmpipe). **No verified real Pixel sustained FPS, thermals, battery, or comprehensive physical multitouch performance report exists.** Asset research should not assume otherwise.

See [asset inventory](docs/handoff/ASSET-BASELINE.md), [Claude research instructions](CLAUDE.md), and [the main README](README.md). Previous feature-by-feature development notes are historical; the linked 2026-10-17 handoff documents are authoritative for current features.