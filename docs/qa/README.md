# Daybreak Row — reproducible development and release checks

This directory supersedes the untracked, one-off QA scripts used during earlier asset integration. The audit baseline is [Sol's PR #1](https://github.com/EchoEe247/daybreak-row/pull/1) at commit `577cf0b`.

## Automated checks
- `npm ci` (Node.js 24; `.nvmrc`)
- `npm run test:all` — original scaffold/framework tests, gameplay/save/asset tests, TypeScript, lint and build.
- `node scripts/qa/scan-secrets.mjs` — tracked UTF-8 files checked for a small set of high-confidence key patterns; not a substitute for full secret scanning.
- GitHub Actions: `.github/workflows/ci.yml` runs these on PRs and pushes to `main`. To **enforce** the green job, enable a GitHub branch ruleset requiring `verify` on `main` after the workflow first completes (admin access needed).

## Model provenance / reproducibility
`python scripts/qa/build-realism-assets.py real-shelf` fetches the source from Poly Haven and rebuilds the optimized GLB. Dependencies are checked against recorded publisher MD5 values, while exported files carry SHA-256 manifests in `assets/realism-provenance.json`. Reproduction writes to the ignored `work/rebuilt-realism` directory by default; it **does not overwrite shipped models**. The Python script requires Pillow (installed separately) and network access to Poly Haven if its original source cache is absent. For all candidates: `python scripts/qa/build-realism-assets.py`. Re-verify any source changes before substituting build artifacts.

## Browser and placement checking
The reusable `scripts/qa/placement-cdp.mjs` attaches through Chrome DevTools Protocol to a **dedicated QA browser tab** whose URL includes `?touchqa`. Use a Chromium instance exposing the DevTools protocol on `127.0.0.1:9230`, run the game in its isolated test profile, then:

```sh
node scripts/qa/placement-cdp.mjs http://127.0.0.1:9230
```

The script checks the nine enterable rooms, their action reachability against current box colliders, and collects per-room renderer/model counts. It writes evidence to `work/placement-cdp-report.json`. Run it **against a dedicated disposable profile**: clicking Start will create a test save in that profile. It never targets the owner's ordinary phone Chrome profile. This QA is separate from real multitouch and sustained hardware-performance acceptance.

The existing `scripts/browser-smoke.mjs` relies on desktop Playwright and may not run directly under Termux without a compatible Chromium/CDP bridge. Prefer CDP on the phone/local dedicated browser, desktop Playwright on CI/desktop, and do not describe software llvmpipe rendering as Android GPU performance.

## Physical-device gate
See [the Pixel 6a acceptance checklist](MOBILE-ACCEPTANCE.md), and use `http://127.0.0.1:4186/?perfqa=1` on the real device to record approximate rolling FPS, slowest frame, draw calls and triangles. CPU/GPU thermals and battery usage still require manual observation/device tools. **Physical FPS/thermal acceptance is not verified by source changes or by running software WebGL.**

## Reliability decisions
- Version-1 saves are fully parsed and validated without rejecting documented optional legacy data. A last-known-good backup is retained; damaged primary data is kept in a separate recovery key before a new write. Visible warnings offer retry and raw export rather than pretending a write succeeded.
- Escape and P use the same menu transition as touch controls; actor resources are disposed at game teardown.
- Work cooldown timestamps represent the **next available time after the work duration and cooldown**, using `absMinute`. Older numeric timestamps remain readable; save format stays version 1.
- Local launcher probes `/__daybreak/identity.txt` and binds to loopback by default. Intentional LAN access requires `DAYBREAK_HOST=0.0.0.0`. Inherited Grok extension code is off unless `VITE_GROK_EXTENSIONS=1`.

Changes affecting save validation, menu transitions, collisions, model loading or the local launcher should have regression tests and a green PR check before merging.
