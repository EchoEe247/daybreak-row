# Physical Pixel 6a acceptance run

**Status:** repeatable procedure prepared; a sustained physical Chrome test and thermal/battery measurements still need an actual owner session. Do not treat software-WebGL counts as real device FPS.

## Start
On the Pixel 6a in Termux: `cd ~/MainWorkspace/daybreak-row && ./start-local.sh`. Keep Termux active, and open **Chrome on the same phone** at `http://127.0.0.1:4186/?perfqa=1`. The optional performance HUD reports approximate rolling frame time, frames per second, draw calls, triangles and loaded textures. The HUD is intentionally disabled during normal play.

## Test plan
1. Record build SHA, Android and Chrome versions, battery charge, approximate device temperature/ambient conditions, screen brightness and whether on battery.
2. Cold start after loading/reloading Chrome: record time to Start and first playable frame. Warm reload again.
3. Walk and sprint through the harbor, Old Town, Civic Quarter, Downtown and Arts & Station. Drag camera while holding joystick+Run, then release all touch controls and verify movement stops.
4. Enter and exit all **nine interiors**, use at least one action in each, and return outdoors. Visit laundry and wash clothes; check money changes.
5. Leave app backgrounded for a minute and return; verify animation, controls and scene resume.
6. Play for **at least 20 minutes** with camera sweeps, crowded blocks and normal interactions. Capture FPS HUD readings near minute 1, 5, 10 and 20, and at worst observed frame-time dips.
7. Use Pause → Save and return, then Continue; verify balance, time, needs and position survive. Test in an isolated disposable Chrome profile if intentionally denying browser storage.
8. Record battery drop, observed heat/throttling, memory pressure or browser reloads, touch problems, visual clipping, and unwanted network requests.

## Suggested (not certified) initial targets
- Smooth movement at **30 FPS or better** through core outdoor and indoor gameplay under normal conditions.
- No sustained frame freeze longer than 500 ms, tab crash or forced reload.
- Every mobile touch interaction visibly responds, especially the Run+joystick+camera combination.
- No progress lost during ordinary save and reload.
- Compare future asset or feature changes against a **recorded, same-device baseline**, rather than guessing from model polygon counts.

Report each sample as **measured** only after doing the physical test; keep engine debug counters distinct from Chrome/system metrics and thermal observations.
