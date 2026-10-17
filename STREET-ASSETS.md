# Street and Vegetation Realism Pass

This Daybreak Row update continues replacing visible primitive street objects with freely reusable CC0 GLB models.

## Models and licenses
- **Oak, maple, linden:** Innerscene light-canopy real-world street trees (CC0). Original sources and SHA-256 hashes are in `assets/trees-provenance.json`; original GLBs are retained locally for provenance. Each was **prebaked offline** from 172 GLTF mesh nodes into 3 meshes preserving all 6,972 original triangles and materials. The game loads `*-batched.glb`.
- **Transit:** CC0 Innerscene bus shelter, public information board, recycling station and wayfinding totem. Same provenance file.
- **Lighting:** High-detail Poly Haven street lamp remains a limited scenic accent rather than populating every corner; the older block lights were removed. Daytime-only mode is preserved.
- All external files are local, no runtime CDN dependency.

## Performance policy
- Mobile street-tree locations are half the desktop population's density in the connected district grid, with colliders created **only for planted locations**; Harbor has all original eight trees replaced.
- The three species use pooled instanced geometry and materials (roughly 3 draw calls per species instead of ~172 mesh draws). Mesh preprocessing is done once ahead of time, never on the browser main thread.
- Realistic static props and cars use working frustum culling, so an asset is not drawn when outside the camera's view.
- Phone-mode uses only two detailed bus shelters and two photoreal downtown street lamps plus two in Harbor. Existing gameplay and original saves are unchanged.
- Browser QA at 480x270 with mobile quality: approximately 188 draws / 575K triangles after fixes, down from 352 draws / 1.17M triangles in initial integration; figures depend on camera position. These are NOT physical Pixel frame-rate measurements.

## Checks
`npm run test:streets`, `npm run typecheck`, `npm run build`. The tests verify seven downloaded model checksums and that prebaked tree GLBs preserve geometry while reducing meshes. Original door, city, environment, and touch tests remain included.

## Remaining art
Original block-based architecture, windows, many store interiors, and distant urban props still require dedicated realism passes. The environment remains mobile-focused rather than photorealistic.
