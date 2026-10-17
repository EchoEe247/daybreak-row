# Human character asset provenance

This game uses nine compressed rigged GLB human models and six shared in-place animation clips obtained on October 16, 2026 from https://models.codelove.in/ (categories Rigged Adults and Rigged Professions, https://models.codelove.in/animations/). Source download URLs are recorded in `assets/human-provenance.json`, including cryptographic SHA-256 hashes.

**Upstream license: MIT.** The downloaded GLBs embed the original copyright: Copyright (c) 2020 Microsoft. The exact copyright and MIT permission text is preserved in `public/humans/LICENSE-Microsoft-MIT.txt`. Retain this notice in redistributed or deployed copies. Model formats use `EXT_meshopt_compression`, `EXT_texture_webp`, and `KHR_mesh_quantization`, all supported by the Three.js GLTFLoader with MeshoptDecoder in this game.

### Cast
- Player — Male Adult 01.
- Mara — Female Adult 01.
- Ellis — Male Adult 02.
- Theo — Businessman 01.
- Jun — Businesswoman 01.
- Idris — Male Adult 09.
- Harbor resident and downtown background walkers — Male Adult 03, Female Adult 05, Male Adult 11 (some reuse, with separate skeletal rigs).
- Idle/Walk/Run — gender-compatible animations licensed MIT.

We deliberately use reasonably realistic textured ~7k–9k-triangle human rigs instead of multi-million-polygon photogrammetry scans; target hardware is Pixel 6a/Android Chrome. Skinned background walkers are capped at eight and distance-culled; named NPCs and player are always individually animated. Original procedural characters remain **fallback only** if an external model fails to load; all production character files are stored locally for offline reliability.

We have not measured stable FPS on the physical Pixel touchscreen in this session. Software-rendered browser tests cannot establish on-device performance.
