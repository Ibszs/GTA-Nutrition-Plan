# GTA Nutrition Plan PWA Design

## Status

Approved in chat on September 3, 2026. Recommended public, installable PWA route selected. Static plan content will be publicly reachable after deployment. Shopping and tracker entries will remain inside each device unless the user deliberately exports a backup.

## Product Goal

Turn the supplied ZIP into one dependable, mobile-first personal nutrition app for the user and the user's mother. Fix broken launch behavior, make routine tools editable, preserve useful reference material, remove redundant delivery formats, and ship without frameworks or runtime dependencies.

## Baseline Evidence

- All eight relative links in `START_HERE.html` point to files present in the complete extracted bundle.
- First navigation works when the complete bundle is served through HTTP.
- Opening a launcher from a ZIP preview or as a separately downloaded file cannot reliably expose sibling files. Packaging and delivery cause the reported navigation failure.
- Tracker default date uses `Date.toISOString()`, so evening use in Toronto can show the following UTC date.
- Tracker exposes target-protein and target-finish controls without using either value in its decision output.
- Tracker forces a 980-pixel table on a 390-pixel phone viewport.
- Shopping checklist persists checked positions only. Items, quantities, notes, and stores cannot be edited.
- Child pages provide no dependable route home.
- Bundle has no manifest, service worker, application icons, favicon, install instructions, or storage failure notice.
- Separate plain-text shopping file duplicates checklist content and can become stale.

## Architecture

Use a small multi-page static PWA. `index.html` becomes canonical launcher and hosting entry point. Focused pages remain separate so each page stays understandable, printable, and fast. Shared CSS, navigation, storage helpers, pure calculations, and backup handling live in small asset modules.

No framework, bundler, database, account system, analytics, cookies, network API, or production server code. Browser receives only static files. GitHub Pages is deployment target because it provides one HTTPS link and supports service-worker installation.

All internal paths remain relative. App must work under a repository subpath such as `/GTA-Nutrition-Plan/`, not only at domain root.

## Final Product Files

```text
index.html                 Dashboard and install guidance
plan.html                  Full reference plan
tracker.html               Fourteen-day tracker
shopping.html              Editable store-by-store list
quick-start.html            Daily quick card
cooking.html               Sunday cooking sheet
manifest.webmanifest       PWA metadata
sw.js                      Offline application shell cache
assets/
  styles.css               Shared responsive visual system
  common.js                Navigation, install prompt, storage status
  core.js                  Pure dates, tracker, whey, and validation logic
  tracker.js               Tracker page controller
  shopping.js              Shopping page controller
  backup.js                Versioned JSON export/import
icons/
  icon-192.png
  icon-512.png
GTA_16_Week_Nutrition_Plan.pdf
Mothers_Sunday_Cooking_Sheet.pdf
Quick_Start_Card.pdf
README.md
package.json                Test commands only; zero dependencies
tests/
  core.test.mjs
  shopping.test.mjs
  static.test.mjs
```

Original legacy HTML names and `shopping_list_phone_notes.txt` will be removed. No redirects or compatibility wrappers will remain.

## Navigation

Every HTML page uses one consistent top navigation:

- Home
- Today
- Shopping
- Tracker
- Plan
- Sunday Prep

Current page receives `aria-current="page"`. Navigation stays touch-friendly, horizontally scrollable on narrow screens, and available without JavaScript. Dashboard cards use ordinary relative links, so navigation works even when scripts fail.

## Dashboard

Dashboard prioritizes daily use:

1. Today card
2. Shopping progress
3. Tracker completion and latest decision
4. Whey-label setup
5. Full plan and printable references

Dashboard also explains phone installation:

- iPhone/iPad: Safari Share, then Add to Home Screen.
- Android: Chrome menu or browser install prompt.
- First online visit installs offline files.
- User data stays on current device.
- Backup file moves data between devices.

When supported, browser install event powers an Install button. Unsupported browsers show platform instructions instead of a dead button.

## Shared Visual System

Preserve navy, teal, cream, and paper palette. Improve consistency through shared tokens and components. Minimum touch target is 44 by 44 CSS pixels. Body text remains at least 16 pixels on small screens. Focus rings remain visible. Pages support reduced motion, high-contrast text, and print layouts.

No decorative animation. Motion limited to short progress and state changes.

## Storage Contract

Local storage keys:

- `gtaNutrition.shopping.v2`
- `gtaNutrition.tracker.v2`
- `gtaNutrition.whey.v1`

Each payload contains explicit schema version. Reads validate object shape before use. Invalid or future-version data is rejected without overwriting current valid data.

Storage probe returns either persistent local storage or in-memory fallback. UI must visibly report fallback mode: changes will disappear when page closes. Current bundle's silent fallback is not acceptable.

No tracker, body-weight, waist, shopping, or supplement data leaves browser automatically.

## Shopping List

Default list preserves supplied three-store basket and safety notes. Stored structure:

```js
{
  version: 2,
  stores: [
    {
      id: "stable-id",
      name: "Store name",
      items: [
        {
          id: "stable-id",
          name: "Item name",
          quantity: "Human-readable quantity",
          note: "Optional note",
          tag: "PLAIN",
          checked: false
        }
      ]
    }
  ]
}
```

Required actions:

- Add store.
- Rename store.
- Delete store after confirmation.
- Add item to selected store.
- Edit item name, quantity, note, and tag.
- Delete item after confirmation.
- Toggle purchased state.
- Clear purchased states while preserving edits.
- Restore original defaults after confirmation.
- Copy readable list to clipboard.
- Export or import full app backup.

All user text renders through `textContent`; imported strings never become HTML. Empty store and item names are rejected inline. IDs use `crypto.randomUUID()` with a timestamp-and-random fallback.

Progress uses checked item count divided by current item count. Empty list displays zero percent without division errors.

## Tracker

Date formatting uses local calendar fields instead of UTC serialization. Fourteen dates are derived from local noon to avoid daylight-saving boundary shifts.

Controls:

- Start date
- Target calories
- Target protein
- Goal minimum weight
- Goal maximum weight
- Weeks remaining after day 14
- Waist baseline
- Current waist
- Previous projection over goal maximum

Goal defaults remain 190-195 lb. Decision logic uses configured minimum and maximum instead of hidden constants. Invalid goal range blocks calculation with inline message.

Target protein powers dashboard adherence count. Tracker reports calorie adherence and protein adherence separately.

Inputs save on `input` and `change`. Final active field therefore persists without requiring blur. CSV export remains. Blob URL revocation occurs after download starts, avoiding Safari timing failures.

At phone widths, each day becomes a labeled vertical card. Desktop retains table presentation. Every input has visible or programmatic label. Horizontal page scrolling is not required.

Numerical validation rejects negative values and impossible ranges. Missing values remain allowed because partial daily entry is normal.

## Tracker Decision Contract

Preserve supplied decision sequence while replacing hard-coded range values:

1. Fewer than six usable weights in either week, fewer than twelve calorie entries, or under 90 percent calorie adherence: collect seven more days.
2. Non-finite pace or projection: collect seven more days.
3. Projection above configured maximum twice consecutively: remove most recently added 250-kcal module.
4. First projection above maximum: hold until next review.
5. Weekly rate below 0.5 lb and projection below configured minimum: add one module.
6. Weekly rate from 0.5 through 1.5 lb and projection within configured range: hold.
7. Weekly rate above 1.5 lb without exceeding configured maximum: hold and report body-composition direction.
8. Remaining valid combinations: hold and review signals, never display stale prior result.

Projection, averages, adherence, and decision return from one pure function tested independently from DOM.

## Whey-Label Setup

Dashboard includes calculator based only on formula already present in supplied plan.

Inputs:

- Scoop calories
- Scoop protein
- Scoop carbohydrate
- Scoop fat

Calculation:

```text
uncorrected calories = 3,186 + scoop calories
difference = 3,300 - uncorrected calories
breakfast honey = 20 + difference / 3.04 grams
```

When honey result stays between 5 and 40 grams, show corrected honey amount. Otherwise keep honey at 20 grams and show oil adjustment of `difference / 8.84` grams across the day. Negative adjustment means remove oil. Result states assumptions and rounding. Saved label values remain device-local.

Calculator does not diagnose, prescribe, or change source nutrition guidance.

## Backup And Device Transfer

One JSON backup contains version, export timestamp, shopping state, tracker state, and whey state. Import flow validates full document before writing any key. Failed import changes nothing. Successful import reports included sections and reloads rendered state.

CSV remains tracker-only for spreadsheet analysis. JSON is authoritative app migration format.

## Offline PWA

Manifest includes product name, short name, theme/background colors, standalone display, relative start URL, scope, and 192/512 icons.

Service worker uses versioned cache name. Install caches application shell and included PDFs. Activate removes older app-cache versions. Fetch behavior:

- Same-origin GET navigation: network first, cached page fallback, then cached dashboard.
- Same-origin static assets: cache first with background cache refresh.
- Cross-origin research links: normal network request; never cached.

Service-worker registration failure stays non-blocking and produces concise console warning plus offline-status message.

## Redundancy Decisions

Keep:

- Focused HTML pages because each serves distinct daily task.
- PDFs because user requested phone sharing/printing and they remain useful outside browser.

Remove:

- Plain-text shopping file; Copy List replaces it.
- Legacy launcher name; `index.html` is universal host entry.
- Repeated page-specific visual CSS; shared stylesheet replaces it.
- Silent storage fallback.
- Unused tracker controls.
- Inline `onclick` handlers.

## Error Handling

- Storage unavailable: visible warning; session remains usable.
- Malformed stored payload: defaults load; invalid payload preserved until user explicitly restores or imports.
- Invalid import: descriptive error; current data unchanged.
- Clipboard unavailable: select or download fallback offered.
- CSV/JSON download failure: generated text remains available for copy.
- Offline first visit before cache exists: standard browser error; README explains first visit must be online.
- External reference unavailable: app content remains readable; no internal function depends on external site.

## Testing

Production behavior follows RED-GREEN-REFACTOR.

Automated tests use Node's built-in `node:test` and `assert` modules. No test framework dependency.

Coverage targets:

- Local Toronto date around UTC-day boundary.
- Fourteen-day date generation across daylight-saving changes.
- Mean, rolling averages, projection, adherence, every decision branch, and fallback branch.
- Configured goal range use.
- Whey honey and oil paths.
- Empty, malformed, and future-version shopping payloads.
- Shopping add/edit/delete/toggle/reset transformations.
- Backup validation and all-or-nothing import preparation.
- Every internal link target and fragment.
- Unique IDs, language declaration, viewport metadata, labels, manifest references, service-worker asset list, and offline files.
- Zero dependency declarations.

Fresh browser checks cover:

- Every dashboard card.
- Shopping edit, persistence, reload, copy, reset, export, and invalid import.
- Tracker entry, autosave, calculation, reload, CSV download, and mobile card layout.
- Whey calculator persistence.
- Desktop and 390-by-844 phone screenshots.
- Service-worker registration and offline reload.
- Browser console warnings and errors.

## Git And Release

- Independent repository: `C:\Users\ibsna.DESKTOP-83743D7\GTA-Nutrition-Plan`.
- Baseline source imported on `main`.
- Work performed on `codex/gta-nutrition-release`.
- Commits remain feature-scoped and tested.
- Final verification runs before merge.
- Feature branch merges into `main`, then is deleted.
- Final worktree must be clean on `main`.
- Release receives semantic version tag.
- Public GitHub repository and Pages deployment occur only after local verification.
- Release ZIP excludes `.git`, tests, design documents, temporary reports, and development-only files.
- Final repository retains source and tests. Final ZIP contains deployable product only.
- Original audit directory and temporary servers are removed after final package verification.

## Acceptance Criteria

1. Visiting deployed root opens dashboard without filename knowledge.
2. Every internal navigation option opens correct page.
3. App installs from supported iPhone/Android browsers and reloads offline after first visit.
4. Shopping list supports persistent add, edit, delete, check, clear, restore, copy, export, and import.
5. Tracker uses local dates, configured goal range, target protein, autosave, responsive cards, CSV, and backup.
6. Whey calculator follows supplied formula and persists locally.
7. No console errors occur during tested core flows.
8. Automated suite passes with zero external packages.
9. Phone layout has no required horizontal page scrolling.
10. Static plan content remains unchanged except navigation, filenames, accessibility, and presentation wrappers.
11. AgentOps repository receives no product changes.
12. Final repository is clean on `main`, feature branch is deleted, and release tag exists.
13. Final deployable ZIP contains no Git metadata, development documents, tests, secrets, logs, or temporary files.

