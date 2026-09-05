# Personal training journal implementation plan

Goal: a personal, simple offline training and food journal for a 16-week muscle-building block, preserving the original meals and existing browser data.

Scope and assumptions: one person; full gym; four 60–75 minute sessions; no injuries reported; existing halal/plain-ingredient preferences retained. Research uses primary training studies, consensus syntheses, Canadian food safety guidance and food labels. No dose-based training or nutrition formula; the personal log is behind a discreet eye toggle. Its user-requested default schedule is part of the public app code; actual saved entries remain in browser storage and exported backups.

Design: soft grey #f5f5f7, white #ffffff, charcoal #1d1d1f and blue #0071e3. Native system typography, quiet surfaces, centered desktop popup cards and mobile bottom sheets. A weekly session rail is the signature: completed sessions fill in, with the next session always obvious. Desktop sidebar; five mobile navigation destinations. Today, Train, Meals, Shop, Progress; guides reached contextually.

- [x] Inspect old routes, storage, calculations and source claims; baseline 82 tests pass.
- [x] Discovery and follow-up: reconcile training, nutrition and food-safety evidence; audit old calorie rules and grocery quantities. Record sources and uncertainty in research/report-source.md; reader-facing synthesis in plan.html.
- [x] Write failing behavioral tests for progression, set validation, meal aggregation, date isolation, backup migration and safer calorie feedback. Implement training-data.js, training-state.js and food-data.js as pure modules.
- [x] Build training.html and training.js: resumable dated sessions, per-set load/reps/RIR, explicit completion, past performance, next-load suggestion, substitutions, history and rest timer. Never count a copied/prefilled set as performed.
- [x] Build meals.html and meals.js: preserve six original eating points, additional original recipes with weights and cooking guides, complete-day templates, dated weekly menu, ingredient totals and pantry subtraction.
- [x] Redesign index.html and common shell/styles; enhance shopping without replacing custom stores. Integrate new journal data into complete backup with version-1 import support and transactional restore.
- [x] Replace inaccurate scale-first guidance in core.js and old HTML references; distinguish rough nutrient estimates from label values. Keep supplied PDFs as historical files and clearly label them as superseded.
- [x] Verify npm test, JS syntax, desktop/390px browser screenshots and interactions, reload persistence, invalid input, backup/import and offline asset coverage. Review the local branch and preview before the separately authorized GitHub Pages release.

Test commands (confirmed from package.json): npm test; node --test tests/training.test.mjs; node --check assets/training.js. Preview: python -m http.server 4191 --bind 127.0.0.1.


Verification completed: 125 automated checks passed. All JavaScript parsed. Browser checks covered 390 px layouts on all eight pages, desktop review, set validation/reload/partial completion/copy flags/focused navigation/timer, recipe search/scaling, meal selection/copy/persistence, pantry subtraction and store grouping, tracker archives/negative-input feedback/two-tab preservation, v1 and v2 backup import, full export, and a meal page opened with network disabled. No page console errors were reported. Test data used separate localhost origins; the initial review did not modify the published site. Native confirm popups were replaced with accessible app dialogs after a browser compatibility issue.

Publication approved by the user on September 5, 2026. GitHub Pages uses main at the repository root with HTTPS enabled.
