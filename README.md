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
- **Train:** four starting templates across 16 weeks. Add movements, swap unlogged exercises, remove blank movements, and adjust working sets/reps for the active workout. Nineteen illustrated movement guides include flat/incline presses, flyes, dips and push-ups. Recorded sets stay attached to their exercise/setup. One exercise at a time; load, reps, reps in reserve (RIR), clean technique and done checks; last matching exercise/setup; copy previous numbers; resumable drafts, partial sessions, history and rest timer.
- **Meals:** photographic recipes with ingredient checklists and Cook along steps; seven complete day templates, 21 recipes, seven-day calendar, swaps and serving quantities. The original meal quantities remain available. Three new templates estimate 3,500–3,600 kcal and 90–95 g fat with the default whey assumption.
- **Shop:** ingredients from the chosen week, manual pantry subtraction, store/aisle grouping and saved checkboxes; shopping mode hides bought items. Existing custom shopping lists remain editable under the separate disclosure.
- **Progress:** one day at a time or all 14 days, weekly averages, contextual calorie feedback, archived periods and CSV export. The first date locks once entries exist to keep their dates intact.
- **Guides:** the full training/nutrition rationale and sources, cooking and food safety, and original meal card. Legacy PDFs are historical references with superseded guidance.

Search and contextual **How this works** guides are available on every page. Try a practice set without adding a journal record. See [the 2.1 design and verification notes](docs/visual-redesign.md).

## Saved data

Everything stays in this browser; devices and different URL origins have separate records. No automatic sync. Browser-data clearing removes records. Use **Today → Backup & settings → Export all data** before moving devices or clearing storage. Version-2 JSON includes training, meal calendar/pantry, custom shopping, progress/history and whey label. Older version-1 imports retain newer training/planner data. Imports validate before writing, with rollback on write failure. Storage failures show a notice; temporary changes must be exported from their current page where supported.

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
