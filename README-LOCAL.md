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
