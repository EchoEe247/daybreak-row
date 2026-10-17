# Connected City — Playable Business & Daily Route Expansion

## New activities

Six new businesses in the connected city, with street-facing façades, signage, and illustrated window displays. **Bakery and gym are now enterable** with dedicated interior interactions; the other four remain walk-up businesses:

| Business | Coordinates (x,z) | Interaction | Outcome |
|---|---|---|---|
| Old Town Bakery | 82, -47 | Enter, buy pastry ($7), coffee ($3), meet baker | Hunger +27, fun +5, 16 minutes |
| Civic Fitness | 122, -47 | Enter, train ($12), stretch, meet trainer | Fun +24, energy −17, hygiene −11, 65 minutes; needs energy |
| Metro Cinema | 148, -47 | Watch movie ($16) | Fun +38, social +5, 98 minutes |
| Fresh Spin Laundry | 82, -88 | Wash clothes ($6) | Hygiene +36, fun +3, 42 minutes |
| Corner Books | 108, -102 | Browse/buy a book ($8) | Fun +21, social +6, 30 minutes |
| Parcel Dispatch | 162, -101 | Delivery work (+$38) | Energy −20, hunger −9, 86 minutes, cooldown (230 minutes) |

All activities advance simulated time, applying the standard decay and day-boundary logic. Costs are checked before payment and return a clear toast when insufficient. Parcel work is locked out until the recorded cooldown expires. Old Town Bakery and Civic Fitness now have dedicated rooms, enter/exit doors, their own collisions and camera-safe transitions, indoor activities, and locally animated human staff. Cinema, laundry, bookshop, and courier remain outdoor walk-up interactions; storefront glazing is decorative.

## Daily City Passport

Each in-game day, the phone's **City** tab shows three geographically marked destinations. Routes rotate through 13 real city destinations, including the new businesses. Interact successfully with those sites to earn stamps. Once all three are complete, visit City Hall in Old Town and **use the route board** to collect **$65** plus a small fun/social bonus. The reward is available only once per day. A new route appears on the following in-game day.

- Three route markers on the city phone map; checked/completed markers change appearance.
- Progress is saved to optional fields on the existing version-1 game save, with no version migration. Old saves begin with an empty route.
- Only completed actions count toward a route. A failed payment, insufficient energy or courier cooldown does not stamp the passport.
- The Hall reward is claimed through an in-world interaction, not a passive auto-payout.
- The underlying 24-hour simulation clock and permanent daylight remain untouched.

## Visual, technical and QA

- Unique storefront awnings, glazed ground-floor façades, metal frames, readable signs, and small distinct bakery/gym/cinema/laundry/books/courier display textures (six canvases; no new model downloads).
- Extra façades stay within the original building meshes. Collision layout, walkable roads, original enterable buildings, bus navigation, touch gestures, and existing storylines remain unchanged.
- `npm run test:game` runs all gameplay, mobile-input, human, environment, daylight and city route regression suites. Production: `npm run typecheck`, `npm run build`.
- QA walkthrough in dedicated browser successfully visited Library, Station, and Music Plaza, then claimed +$65 at City Hall (balance increased from $176 to $241), and phone showed 3/3 done. Six new business visits in a fresh game had combined expected cash changes ($186 → $175).
- Screenshot of Old Town Bakery visual window display inspected at a 360×740 mobile viewport. Physical Pixel FPS and touchscreen comfort remain user-verification items.

Implementation intentionally prioritizes meaningful city gameplay over adding large photogrammetry models that would stress the Pixel.
## Enterable interior upgrade (subsequent pass)

- Bakery and gym rooms are separated from the main city geometry, like the original café and apartment. Both reuse the existing fade-out / camera snap / fade-in door pipeline, and offer safe exit positions 2.2m away from the entry interaction so the Use prompt does not re-trigger.
- Interiors include bespoke furnishings and equipment, with selected locally bundled PBR props; one idle rigged human attendant or trainer appears only in their own active room.
- The original City Passport now stamps the bakery after purchasing a pastry, and gym after completing a paid workout. Simply entering does not count.
- All old v1 saves retain their format, with new place values supported by the existing indoor arrival reconciler. See `src/game/door-transition.test.mjs` and browser QA script `work/local-qa/daybreak/city-interiors-qa.js`.
- No other businesses were changed to enterable status. Physical Android performance remains to be measured on-device.
