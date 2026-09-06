# Form & Fuel design and verification

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
