# Connected City — Playable Business & Daily Route Expansion

## New activities

Six new walk-to businesses in the connected city, all with physical storefront façades, street-side interaction markers, signs, and illustrated window displays:

| Business | Coordinates (x,z) | Interaction | Outcome |
|---|---|---|---|
| Old Town Bakery | 82, -47 | Buy pastry ($7) | Hunger +27, fun +5, 16 minutes |
| Civic Fitness | 122, -47 | Train ($12) | Fun +24, energy −17, hygiene −11, 65 minutes; needs energy |
| Metro Cinema | 148, -47 | Watch movie ($16) | Fun +38, social +5, 98 minutes |
| Fresh Spin Laundry | 82, -88 | Wash clothes ($6) | Hygiene +36, fun +3, 42 minutes |
| Corner Books | 108, -102 | Browse/buy a book ($8) | Fun +21, social +6, 30 minutes |
| Parcel Dispatch | 162, -101 | Delivery work (+$38) | Energy −20, hunger −9, 86 minutes, cooldown (230 minutes) |

All activities advance simulated time, applying the standard decay and day-boundary logic. Costs are checked before payment and return a clear toast when insufficient. Parcel work is locked out until the recorded cooldown expires. No new interiors are implied; shop displays are closed windows and interactions remain on the public sidewalk.

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
