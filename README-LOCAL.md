# Daybreak Row — local phone setup

This directory is the Grok Build export, adapted for the Pixel 6a / Termux.

## Play on this phone
Open **http://127.0.0.1:4186/** in Chrome while the local server is running.
If the server is not running, open Termux and run:
```sh
cd ~/MainWorkspace/daybreak-row
./start-local.sh
```
The game is a browser app, not an APK. Save data stays in the browser on this origin.
Avoid clearing Chrome site data for 127.0.0.1:4186 if you want to keep your saved game.
The game runs on the phone. Local testing in the dedicated ChatGPT browser uses software WebGL and is not representative of Chrome Android GPU performance.

## Changes from original export
- Reset touch input on tab blur/background to prevent stuck walking.
- Reset controller A tracking on disconnect.
- Save on pagehide.
- Fix switching between pause and phone menus.
- Graphics failure displays a recovery message.

## Verified on Pixel 6a (October 16, 2026)
- npm install: successful.
- npm run typecheck: successful.
- npm run build: successful (Vite / TanStack Start production).
- Local HTTP 200 and Start screen -> gameplay HUD.
- Keyboard W event delivered through test browser; continuous movement/render performance not yet independently confirmed.
- 59 application tests passed.
- The generic scaffold branding tests contain fixture mismatches when run inside a customized game directory; not a game-test pass.
- Dedicated browser uses Mesa llvmpipe; scene frame capture could not be certified due to capture-runtime failure.

If the game will not load after Android suspends Termux, rerun ./start-local.sh. Keep Termux running while playing.
## Mobile controls v2
- Drag the lower-left joystick: up = walk forward, down = back, left/right = strafe.
- Hold **Run** with a second finger while moving to sprint.
- Drag the open world with a free finger to rotate the camera without cancelling movement.
- Tap **Use** to activate the nearby action shown above the controls.
- Controls have `touch-action: none` to avoid Android browser scroll/swipe gesture interception.
- Lost pointer capture, pointer cancellation, tab backgrounding, window blur, and unmount all release movement/Run safely.
- Android/mobile graphics use no MSAA, a lower shadow map, and a 1x internal pixel ratio to prioritize responsiveness.
- The touch QA URL uses `?touchqa` to allow deterministic QA positioning, not intended for normal play.
- Automated checks: `npm run test:mobile-controls`, `npm run typecheck`, `npm run build`.
- Synthetic touch validated joystick, Run, simultaneous camera-look, Use (park bench action), cancellation, portrait hitboxes. **Physical touchscreen gameplay remains for user confirmation.**
## Connected City Expansion (October 16, 2026)

The original coastal Daybreak Row neighborhood remains available. A connected mainland city now extends east and north across a 4-avenue street grid and 9 urban blocks. Preserved original apartment/cafe/market/office interiors and original version-1 save file schema.

**Districts:** Daybreak Row, Old Town, Civic Quarter, Downtown, Arts & Station. All five are accessible by walking the outdoor street system.

**Physical city:** 26 additional buildings with varied heights and facades, town hall/clock tower, station, gallery, library, hospital, plazas, shops, crosswalks and lane markings, sidewalk trees, street lamps, 10 moving ambient cars and up to 20 moving background pedestrians. Shared instanced geometry reduces draw calls and city decoration uses no extra shadow-casting objects.

**City gameplay:** Eight real world interaction sites with proximity/use prompts, city errands, library, gallery, busking, food cart, clinic and downtown contract work. These affect the original money, time, need and activity-log systems.

**Navigation:** Phone -> City opens a schematic district/transit map. Rides between five outdoor transit stops cost $5 and take 18 in-game minutes. Transits move to validated curb positions, show confirmation and save progression. Walkable routes are free. The main HUD indicates your current district; indoor HUD continues to show the interior location.

**QA:** Run `npm run test:city`, `npm run typecheck`, `npm run build`. Portrait phone review at 360x740, original controls and legacy save preserved; no physical-device frame-rate claim without direct device testing.

**Implementation constraints:** Browser-based Three.js, no new APK and no external assets. This is the first major connected-city pass, not a simulation of every city service, enterable building, or traffic collision.
## Clean building entry / exit update
- Fully verified entrance and exit paths for the four original enterable interiors: apartment, Harbor Cafe, Cho's Market and Northline Office.
- Door interaction begins a timed fade-out **before** the location changes, snaps the camera at blackout, then fades back in while blocking input. No long camera interpolation across hundreds of world units.
- Distinct arrival positions in the room avoid an immediate exit prompt; exterior arrivals land outside the entrance's trigger radius, on the sidewalk.
- Active interior roof/ceiling is hidden for an elevated, wider-angle, room-aware camera; outdoors retains the original street camera.
- Old version-1 saves with a character directly on an indoor exit are relocated to the safe interior arrival, preserving the other save fields. Save format remains version 1.
- Quick regression: `npm run test:doors`, `npm run typecheck`, `npm run build`. Browser QA covered all eight enter/exit paths with state/position/camera receipts. Touchscreen feel on the physical Pixel still requires direct user test.
- New city expansion buildings still remain exterior scenery until enterable interiors are explicitly implemented for them.
## Permanent daylight (October 16, 2026)
- The entire outdoor city and all interiors remain in **clear 12:30 PM sunlight** at all hours. No darkness, orange sunset, stars, or illuminated night streetlights.
- Only visual rendering and ambient day/night selection use the fixed midday sky. The in-game HUD clock still advances through 24 hours; NPC schedules, jobs, economy, needs, day changes and saved games are untouched.
- `npm run test:daylight` verifies fixed illumination and ordinary game-time functions. Tested the actual Downtown scene at 12:00 AM: in-game HUD displayed midnight while outdoor lighting remained bright blue daylight.
