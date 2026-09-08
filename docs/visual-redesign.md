# Form & Fuel design and verification

## Training studio · version 3.0

The training screen uses a midnight and cobalt palette, locally bundled Manrope and Barlow Condensed fonts, and a real Three.js dumbbell with studio lighting. The scene renders during its short entrance and pointer interaction, then settles. It pauses when hidden, respects reduced motion, caps rendering resolution, and keeps an SVG fallback if the renderer cannot load. Exercise technique remains grounded in the audited photographs, with variation-specific cues and load conventions.

The five-day rotation is Upper, Lower, Rest, Chest + Back, Legs, Shoulders + Arms, Rest. The logger presents one movement and one set at a time, with explicit completion, progress, save feedback and a rest dock above mobile navigation. Program, Library and History remain directly accessible. Legacy records keep their original prescriptions; partial sessions, unfinished inputs and complete backups retain their data.

Release-candidate verification completed September 7, 2026 (Toronto):

- All 150 automated tests passed, including mixed legacy/new backup restoration, calendar shifts, partial sessions, copied-value safeguards, exact photo mapping and complete offline asset coverage. JavaScript syntax and `git diff --check` passed.
- Browser screenshots reviewed at 320, 375, 390 and 430 pixels, plus a 1366-pixel desktop. Checks included the overview, active logger, saved history, expanded program, movement library and variation sheets. No horizontal document overflow was found. Visual checks caught and fixed faint navigation text, rest-dock overlap and cramped expanded program cards.
- Entered and saved synthetic sets, confirmed progress and draft persistence, saved partial history and verified load/reps/RIR. Earlier overhaul checks also covered editing, undo, copied values, protected recorded sets, order changes and seven-movement sessions.
- Actual WebGL rendering and loaded local fonts were verified. Emulated reduced motion disabled panel/button animation while keeping the scene visible. Blocking the vendored renderer produced a loaded SVG fallback and a usable Start action.
- With the localhost HTTP server stopped and the HTTP cache disabled, the installed service worker loaded the new training screen, WebGL scene, fonts, corrected program layout, exercise thumbnails and a recipe deep link. Existing Today, Meals, Shop, Progress and reference screens were also reviewed for regressions.
- Tests used isolated localhost records and browser viewport emulation. Physical iPhone/Safari and Android testing was not performed.

## Version 2.2 component update

- Consistent local Lucide icons, a floating mobile navigation bar, quieter hover feedback, clearer action cards and compact page shortcuts.
- Weekly training cards with dates, session status and horizontal phone scrolling. Meals gets a month picker with previous/next month, arrow-key selection, today shortcut and focus restoration. Nutrition cards use two columns on phones.
- Every workout exercise is collapsible, with completion badges and expand/collapse controls. Drag grips reorder whole entries, including any recorded sets and setup. Move up/down buttons and Alt + arrow keys offer alternatives. Reuse the last or a historical lineup with its order and prescription preserved and every working set blank.
- Collapsible movement library with search and muscle filters. Progress gets fourteen selectable date buttons with entry indicators.

Verification completed September 6, 2026:

- 136 automated checks passed, including leap-year/month-boundary dates, invalid reordering, preservation of logged values, repeated lineup isolation, backup compatibility, SVG fragment links and complete offline asset coverage. All JavaScript passed syntax checks; `git diff --check` passed.
- Every route checked at 320, 390, 430 and 1440 pixels: no horizontal document overflow or broken loaded images. Screenshots reviewed for all phone routes, core desktop screens, expanded/collapsed workouts, exercise guides, search, meal plans, and the month picker.
- Browser interaction proof: logged 35 lb × 8 reps at 3 RIR; dragged that exercise from first to third; moved it back one place with Alt + Up; reloaded and verified order and numbers. Expanded all seven exercises and collapsed them. Saved partial history, reused its lineup and confirmed blank sets. Added chest flyes and used Move up. Filtered the library to chest flyes and opened its guide.
- Calendar: next-month navigation, arrow-key date movement, Enter selection, today shortcut, and focus returning to its trigger. Progress: selected a date, entered a synthetic weight, reloaded and confirmed the date indicator and saved entry.
- Screenshot checks caught and resolved inherited white calendar cards hiding their text, cramped narrow-screen shortcuts and wrapped nutrition units.
- Update check installed version 2.2.0. With the preview HTTP server stopped, the month picker, local icons and reordered workout draft still loaded from the service worker.
- Verification used isolated localhost records and browser viewport emulation. Physical iPhone/Safari and Android touch dragging were not tested; this browser supports pointer dragging but does not expose touch-event injection.

## Version 2.1 foundation

## Product direction

Make the next action obvious and put demonstrations beside decisions. The home page leads with a workout and an actionable meal; the daily routine connects check-in, meals, and training. Reference material remains accessible without occupying the main flow.

The visual system pairs ink `#202941`, blue `#4659bd`, lavender `#dbe0ff`, mint `#d9eee6`, and a cool paper background `#f3f4f8`. Native Segoe/system text pairs with restrained Georgia italic display accents. Editorial photography carries the main visual impact. Motion is reserved for dialogs, optional movement playback, and small interaction feedback; reduced-motion settings are respected.

## Included

- New shared visual design across all eight pages, with desktop sidebar and mobile bottom navigation.
- Search across pages, all recipes, and all exercises; direct recipe links.
- Contextual walkthroughs and an interactive practice set that never writes journal records.
- Nineteen exercise guides with paired movement photos, play/pause, variation labels, cues, and load guidance.
- Selectable session cards; secondary training settings in a disclosure; a floating rest timer.
- Flexible active workouts: add movements, swap or remove unlogged movements, and change working sets or rep ranges. Chest options include incline/flat presses, flyes, dips and push-ups. Adapted sessions keep the template name and are labeled in history. Recorded numbers cannot be silently removed or relabeled.
- Photographic meals, ingredient checklists, and forward/back cooking steps with completion and restart.
- Shopping mode hides checked ingredients while preserving the underlying list.
- Chapter links on reference pages.
- Visible app version, manual update check, and a reload/later choice when a new app activates.

## Engineering

The app remains static, with no build step or installed dependencies. Existing nutrition quantities and the complete-backup envelope remain unchanged. Training version 1 accepts an optional customized flag with bounded exercise/set/rep validation; all original templates and saved journals remain valid. Assistance-based dips have their own progression wording. Shared guides, artwork mapping, and update handling are small native modules. Images are local and precached. App installation reloads every asset from the network before activating a complete cache; the user chooses when to reload the page. Navigation requests ignore query strings when matching cached pages, so a recipe deep link reaches Meals offline.

Asset sources and generation prompts: [asset-sources.md](asset-sources.md).

## Verification

- Automated suite: 132 passing checks, including local demonstration coverage and offline deep-link routing.
- Browser checks completed during development: all eight routes at 320 px; morning check-in save/reload; selected workout and performed-set save/reload; partial history; practice isolation; shopping mode and persisted checks; search-to-recipe; cooking completion and restart.
- Final browser checks: all eight routes at 320, 390, 430 and 1440 px without horizontal overflow; desktop and mobile visual review; all 38 movement photos visually reviewed.
- Flexible training: add chest flyes; edit set count and rep range; save a performed set; reload; block a swap that would relabel recorded numbers; swap a blank movement; finish into adapted partial history. Complete-backup roundtrip and restore preserve the adapted session in automated tests.
- Cooking: finish the method, return to a previous step, and continue again. Floating rest timer starts and stops on mobile.
- Update transition: a new version shows Reload/Later, leaves an unfinished input untouched, and retains saved weight/sleep/history after explicit reload. A stale-module issue found in development was resolved by bypassing the HTTP cache during app installation.
- Real offline test with the local HTTP server stopped: cached recipe query links open their requested recipes, adapted workout history remains visible, and new chest-fly images load. A manual update check reports the connection failure.
- All JavaScript parses; git diff --check passes. Browser verification used an isolated localhost origin and synthetic records; no physical-device Safari test was performed.


## Recipe library and movement expansion · version 2.3

Meals now separates weekly planning from a 19-recipe cookbook, grouped into breakfast, lunch/dinner and snacks. Search, meal-type filters, saved-only filtering and ordering keep the collection usable on a phone. The recipe sheet separates Ingredients, Method, Store & reheat and My notes. Servings scale both the ingredient list and method food quantities; temperatures stay fixed. Batch timing is explicitly approximate.

Recipe favourites, notes, servings, ingredient checks and the current cooking step live in the existing planner record and complete backup. Old planners without `recipeBook` normalise to an empty collection. Changing servings resets checks and cooking progress; finishing the method does not mark a meal eaten. A completed recipe can be started again with fresh checks. Corrupt imports are rejected before writes. Work Box A and Home Box B are excluded from the book, search, swap choices and new day-plan selectors; their definitions remain for historical menus and backup compatibility.

Cooking guidance was checked September 6, 2026 against [Health Canada cooking temperatures](https://www.canada.ca/en/health-canada/services/general-food-safety-tips/safe-internal-cooking-temperatures.html), [Health Canada leftovers](https://www.canada.ca/en/health-canada/services/general-food-safety-tips/food-safety-tips-leftovers.html), and the [Food Standards Agency rice guidance](https://www.food.gov.uk/safety-hygiene/home-food-fact-checker). The app uses a conservative 2–3-day window for ordinary refrigerated cooked meals and 24 hours for rice. Poultry pieces, egg dishes and reheated leftovers use 74°C. Illustrated pan, thermometer, rice-pot and shallow-container cues are original SVG diagrams. [Ottawa Public Health cooking videos](https://www.ottawapublichealth.ca/en/public-health-topics/cooking-videos.aspx) provide actual narrated demonstrations, clearly labelled as different recipes. No remote video or image loads until a user follows a source link.

The movement library expands from 19 to 35 exercises. Additions cover rows/pulldowns, shoulder press/face pulls, curls, triceps extensions, squat/lunge/hip thrust/curl variations, calves and core. The existing workout templates remain unchanged. Load notes distinguish single-dumbbell, bar-plus-plates, stack and bodyweight logging. [ACE's seated row](https://www.acefitness.org/resources/everyone/exercise-library/168/seated-row/) and [glute bridge](https://www.acefitness.org/resources/everyone/exercise-library/49/glute-bridge/) guidance informed controlled movement and trunk positioning; the exact photo sources are mapped in `assets/exercise-visuals.js`. Every new photo pair was reviewed. The hanging-raise guide was corrected to identify the bent-knee variation actually pictured.

Verification: all 19 active recipes were opened in the browser and checked for ingredient, method and storage completeness. The visual loop covered 320, 390 and 430-pixel phone layouts plus a 1440-pixel desktop layout, recipe cards, scaled ingredients, methods, storage, cooking completion and movement guides. It caught and corrected a chicken/potato photo mapping error, a missing card-open listener, cramped controls and recipe scrolling. Bookmark, note, serving quantity, ingredient check and step persisted after reload. A synthetic older backup was imported through the UI: its archived menu and two eaten checks remained intact. Completing a cooking method left eaten checks unchanged. Node tests cover all added exercise IDs, record validation, legacy backup migration and complete backup restoration. These are browser viewport checks, not a physical-device test or a cooking taste test.

Final release checks: `npm test` passed 142 tests; `git diff --check` passed. With the local HTTP preview server stopped, recipe deep links, cooking steps, SVG illustrations and the newly added hanging-knee-raise photo pair still loaded from the installed offline app cache.
