# Form & Fuel

A personal, offline-capable training and nutrition journal.

Open the app: https://ibszs.github.io/GTA-Nutrition-Plan/

## Open the local preview

From this directory in PowerShell:

```powershell
python -m http.server 4191 --bind 127.0.0.1
```

Open http://127.0.0.1:4191/. Keep the terminal running. No dependencies or build step are required.

## Use it

- **Today:** next session, next meal, weekly rhythm and quick morning weight/sleep entry.
- **Train:** four starting templates across 16 weeks. Add movements, swap unlogged exercises, remove blank movements, and adjust working sets/reps for the active workout. Thirty-five illustrated movement guides cover chest, back, shoulders, biceps, triceps, legs, calves and core. Each has two local reference photos and setup/load notes. Recorded sets stay attached to their exercise/setup. One exercise at a time; load, reps, reps in reserve (RIR), clean technique and done checks; last matching exercise/setup; copy previous numbers; resumable drafts, partial sessions, history and rest timer.
- **Meals:** separate Week planner and Recipe book views; four current day templates and 19 current recipes. Search by ingredient, filter by meal type or saved recipes, and sort by time or name. Save favourites, kitchen notes, ingredient checks, 1–7 servings and cooking progress. Ingredients and method quantities scale together. Work Box A / Home Box B and their templates are archived; previously saved menus and original reference documents remain readable. Three new templates estimate 3,500–3,600 kcal and 90–95 g fat with the default whey assumption.
- **Shop:** ingredients from the chosen week, manual pantry subtraction, store/aisle grouping and saved checkboxes; shopping mode hides bought items. Existing custom shopping lists remain editable under the separate disclosure.
- **Progress:** one day at a time or all 14 days, weekly averages, contextual calorie feedback, archived periods and CSV export. The first date locks once entries exist to keep their dates intact.
- **Guides:** the full training/nutrition rationale and sources, cooking and food safety, and original meal card. Legacy PDFs are historical references with superseded guidance.

Search and contextual **How this works** guides are available on every page. Try a practice set without adding a journal record. See [the design and verification notes](docs/visual-redesign.md).

Version 2.3 adds the organised recipe book, persistent cooking records, structured methods, illustrated technique cues and links to Ottawa Public Health cooking demonstrations. Recipe concepts have not been taste-tested; cooking temperatures and storage guidance come from the linked public-health sources. The 16 added non-chest movements are optional choices; the four base workout templates retain their existing set counts.

Version 2.2 added collapsible exercise cards, drag grips for workout ordering, Move up/down buttons and Alt + arrow-key alternatives. Reuse a saved lineup with blank working sets. The movement library collapses and filters by name or muscle. Local Lucide icons, a floating phone navigation bar, weekly training cards, a month picker and journal date buttons complete the component update. In Meals, tap the month to choose a date; arrow keys navigate the calendar and Enter selects.

## Saved data

Everything stays in this browser; devices and different URL origins have separate records. No automatic sync. Browser-data clearing removes records. Use **Today → Backup & settings → Export all data** before moving devices or clearing storage. Version-2 JSON includes training, meal calendar/pantry, saved recipe details, custom shopping, progress/history and whey label. Older version-1 imports retain newer training/planner data. Imports validate before writing, with rollback on write failure. Storage failures show a notice; temporary changes must be exported from their current page where supported.

Actual package labels override estimates. Enter your whey label in Today. Grocery dry/raw/cooked quantities follow each ingredient label; pantry stock is manual and is not depleted when checking off a meal.

## Install and offline use

Open the HTTPS app link in Safari and use Share → Add to Home Screen, or use Chrome’s Install app option. The first successful online visit precaches the app. External research links need a connection. **Today → Backup & settings → Check for updates** checks manually. When a fresh version is ready, choose Reload app or Later; updates never automatically reload an unfinished form. A local laptop preview is not available on a phone via the phone’s localhost.

## Verify

Node.js 22 or newer:

```powershell
npm test
```

Tests cover progression, completed-set validity, history isolation, food totals, calendar dates, pantry aggregation, backup migration/rollback, tracker feedback, shared navigation and offline asset completeness. No root build command exists.

Increment `CACHE_NAME` in `sw.js` for each published update. Keep generated browser data out of Git. This is a personal planning tool; the 195 lb goal is an aspiration, not a deadline used to force calorie increases.

## Personal log

Tap the small eye at the top right of Today. Tap the crossed eye, press Escape, or tap the backdrop to hide it. The log starts hidden on every page load. This discreet popup records actual timestamps, amount, optional site and notes, with edit/delete and an 84-hour reference from the newest entry. It is not password-protected or encrypted. Complete backups include an existing personal log; older backups without the section leave it intact. The separate personal-log download is a readable archive; use the complete backup for app import. No automatic entries or background notifications.
