# Heat & Handle — expanded kitchen

An expansion of the original illustrated cooking game. The original ingredient art, chef, typography, palette, base recipes and cooking identity remain; the new room, foods and equipment extend the same style.

## Play

- **Free Cook:** enter with no order or recipe. Choose ingredients, prepare them, combine them in cookware, and serve a plate or bowl. Recipe pins are optional references and never change freeform judging.
- **Recipe practice:** follow a chosen house recipe without a timer.
- **Dinner service:** fulfil timed tickets during a six-minute shift.
- Tap a station to walk there automatically. Drag empty floor space to pan, use the mouse wheel or zoom controls, and pinch on touchscreens. Arrow keys pan the camera; they do not move the chef.
- Pick up and place objects, or drag loose countertop objects. Use the object list to select overlapping items. Cookware holds multiple independently simulated ingredients.
- Six burners have separate heat controls. Cooking keeps running while working elsewhere. Fryer baskets can be raised and carried; the oven door must be closed to cook. Microwave defrosting and reheating have different effects.
- Surfaces and tools can carry raw-food contamination. Use the sink or dishwash to clean. Food freshness depends on storage, and refrigeration/freezing persist between visits.
- Review ten judging categories, five stars and a 100-point score. Successful creations are saved automatically; lower-scoring attempts can be saved manually with their feedback. The complete recipe can be reopened, renamed or pinned from the cookbook.

## Source layout

- `web/engine.mjs`: preserved original recipe and ingredient definitions.
- `web/catalog.mjs`: 56 ingredients, 19 stations, equipment, methods and 17 house recipes.
- `web/simulation.mjs`: independent objects, locations, preparation, contamination, heat, orders and snapshots.
- `web/recipe.mjs` and `web/recipe-view.mjs`: measured additions, chronological recipe reconstruction, incomplete-record handling and shared results/cookbook presentation.
- `web/judging.mjs`: deterministic food-based evaluation and naming. It does not import the recipe database. The structured judge receives requirements explicitly.
- `web/game.mjs`: illustrated canvas, automatic navigation, camera/touch interactions and contextual DOM controls.
- `web/persistence.mjs`: serialized save queue and saved creations.
- `server/worker.mjs`: authenticated, per-user SQLite persistence with revision checks to prevent stale-tab overwrites.
- `db/schema.ts` and `drizzle/`: schema and deployment migrations.

The authoritative kitchen and personal cookbook are stored on the server. Autosaves run every 15 seconds and on pause, serving and mode changes. The game does not advance while closed. A failed save is visible and can be retried; conflicting tabs require reloading the latest version.

## Development and verification

Use Node 22 or newer. Run `npm ci`, then `npm test` and `npm run build`. Build output is a Cloudflare Worker in `dist/server` and the illustrated client in `dist/client`; Sites applies the generated SQLite migration during deployment.

Integration checks cover independent ingredients, shared pans, preparation, object positions, mode preservation, snapshots, hazards and cleaning, baking, fryer baskets, oven doors, defrosting, reheating, boiling/simmering/steaming, grilling, deterministic judging, and structured recipe requirements. Persistence checks execute the real migration and Worker queries against SQLite, including per-user isolation, rename, queued saves and revision conflicts.

An instrumented DOM and native-canvas run additionally exercised all 19 automatic station routes and the complete search/prepare/plate/serve/rename/recreate interface flow, camera controls and mobile viewport sizes. This is not real browser layout or device testing.

Cooking temperatures, durations, freshness and hygiene are game models. Ingredients remain individual portions rather than physics-based fragments, and each hand carries one object (including filled cookware). Most utensils are movable and washable; preparation specifically requires a knife or rolling pin.

## Recipe recording and judging update

New ingredient histories record measured seasoning additions, cookware, individual heat phases, control setpoints, actual heat ranges, durations, doneness, preparation, mixing, marinating, stirring, flipping, combination order and plated positions. The results screen presents readable instructions alongside ten ingredient-specific evaluations. Cooking media are listed separately from absorbed ingredients; the simulation does not measure water uptake, cooking loss or final yield.

The game retains version-2 kitchen saves. New foods have version-3 recording metadata, while older food and cookbook records retain their original information. Unrecorded quantities and earlier equipment/temperature history are explicitly unknown. Existing cookbook scores are preserved. No database migration is needed for the additional recipe and feedback JSON.

Quality weights total 100: freshness 8, technique 10, doneness 22, serving temperature 8, seasoning 12, flavour 12, texture 8, safety 12, plating 5 and coherence 3. Whole cuts are valid; ingredient count is not a quality bonus. Salt and flavour concentration use ingredient mass and measured additions, with labelled estimates for older dose counters. Severe safety, burning, undercooking and overpowering-flavour failures apply explained overall limits. Unsafe food earns no money. Star and verdict thresholds are shared between Free Cook and structured judging.

The additional automated suite cooks the requested salmon, steak, poultry, fish, pasta, vegetables and independently cooked components through real simulation actions, then checks scores, factual feedback, recipe reconstruction and save/reload through the actual Worker and SQLite. It also covers explicit serving intent, crowded presentation, heat-setting changes, marination, optional recipe requirements and incomplete older records. A DOM integration run completed salmon cooking through the visible controls, then served, saved, renamed and reopened its complete recipe and judging; it also saved a failed chicken attempt. Mobile-size controls were exercised, but this is not real browser/device layout testing.
