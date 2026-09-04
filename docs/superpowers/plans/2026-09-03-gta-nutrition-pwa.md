# GTA Nutrition Plan PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship supplied nutrition bundle as dependency-free, installable, offline-capable, mobile-first PWA with reliable navigation, editable shopping, corrected tracker, device backup, and whey-label calculator.

**Architecture:** Keep focused static pages joined by shared navigation and CSS. Put calculations and state transformations in side-effect-free ES modules tested with Node's built-in test runner; thin page controllers own DOM and local storage. GitHub Pages serves same relative files used during local testing.

**Tech Stack:** HTML5, CSS, browser ES modules, service worker, Web App Manifest, Node.js 24 built-in `node:test`, PowerShell release verification, Git, GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-09-03-gta-nutrition-pwa-design.md`

## Global Constraints

- Work only in `C:\Users\ibsna.DESKTOP-83743D7\GTA-Nutrition-Plan`; do not edit AgentOps.
- Use no framework, bundler, database, account system, analytics, cookies, network API, or runtime dependency.
- Keep all internal paths relative so GitHub Pages repository subpath works.
- Preserve static nutrition content; change only navigation, filenames, accessibility, presentation wrappers, and explicitly approved tools.
- Render user/imported text with `textContent`, never `innerHTML`.
- Store personal entries locally; transmit nothing automatically.
- Follow RED-GREEN-REFACTOR for every behavior change.
- End on clean `main`, delete feature branch, create release tag, and exclude development files from release ZIP.

---

### Task 1: Project Contract And Core Calculations

**Files:**
- Create: `.gitattributes`
- Create: `package.json`
- Create: `assets/core.js`
- Create: `tests/core.test.mjs`

**Interfaces:**
- Produces `formatLocalDate(date: Date): string`.
- Produces `buildLocalDates(startDate: string, count?: number): string[]`.
- Produces `calculateWheyLabel(input): WheyResult`.
- Produces `calculateTracker(input): TrackerResult`.

- [ ] **Step 1: Add project and failing calculation tests**

Create `package.json` with only metadata and `"test": "node --test"`. Create `.gitattributes` containing `* text=auto eol=lf` and `*.pdf binary`.

Create `tests/core.test.mjs` importing missing functions from `../assets/core.js`. Include exact cases:

```js
test('formatLocalDate keeps Toronto evening on local day', () => {
  const date = new Date(2026, 8, 3, 23, 30);
  assert.equal(formatLocalDate(date), '2026-09-03');
});

test('buildLocalDates crosses DST without skipping dates', () => {
  assert.deepEqual(buildLocalDates('2026-10-31', 4), [
    '2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03',
  ]);
});

test('calculateWheyLabel uses honey inside allowed range', () => {
  assert.deepEqual(calculateWheyLabel({ scoopCalories: 120, scoopProtein: 25, scoopCarbs: 2, scoopFat: 1 }), {
    uncorrectedCalories: 3306,
    differenceCalories: -6,
    method: 'honey',
    honeyGrams: 18,
    oilAdjustmentGrams: null,
    dailyProteinGrams: 176.7,
    dailyCarbGrams: 427.3,
    dailyFatGrams: 101.6,
  });
});

test('calculateWheyLabel uses oil when honey leaves range', () => {
  const result = calculateWheyLabel({ scoopCalories: 250, scoopProtein: 25, scoopCarbs: 2, scoopFat: 1 });
  assert.equal(result.method, 'oil');
  assert.equal(result.honeyGrams, 20);
  assert.equal(result.oilAdjustmentGrams, -15.4);
});
```

Add tracker cases for weak data, first overshoot, repeated overshoot, below-goal projection, in-range projection, above-rate hold, remaining valid fallback, configurable range, and protein-adherence count.

- [ ] **Step 2: Verify RED**

Run `npm test`.

Expected: failure with `ERR_MODULE_NOT_FOUND` for `assets/core.js`.

- [ ] **Step 3: Implement pure core functions**

Create `assets/core.js` with local-field date formatting, local-noon date iteration, decimal rounding, numeric normalization, weekly means, adherence calculation, projection, complete decision sequence, and whey calculation. Return explicit objects; do not touch DOM or storage.

Tracker input contract:

```js
{
  rows: [{ weight, calories, protein }],
  targetCalories: 3300,
  targetProtein: 175,
  goalMin: 190,
  goalMax: 195,
  weeksRemaining: 14,
  priorOver: false
}
```

Tracker result contract:

```js
{
  firstAverage,
  secondAverage,
  weeklyRate,
  projection,
  calorieEntries,
  calorieAdherentDays,
  calorieAdherence,
  proteinEntries,
  proteinAdherentDays,
  proteinAdherence,
  rollingAverages,
  decisionCode,
  decisionText
}
```

- [ ] **Step 4: Verify GREEN**

Run `npm test`.

Expected: all core tests pass with zero warnings.

- [ ] **Step 5: Commit**

```powershell
git add .gitattributes package.json assets/core.js tests/core.test.mjs
git commit -m "feat: add tested nutrition calculations"
```

### Task 2: Shopping State And Backup Contract

**Files:**
- Create: `assets/shopping-state.js`
- Create: `assets/backup.js`
- Create: `tests/shopping.test.mjs`
- Create: `tests/backup.test.mjs`

**Interfaces:**
- Produces immutable shopping transforms named `createDefaultShoppingState`, `addStore`, `renameStore`, `removeStore`, `addItem`, `updateItem`, `removeItem`, `toggleItem`, `clearChecks`, `shoppingProgress`, and `shoppingToText`.
- Produces `buildBackup({shopping, tracker, whey}, exportedAt): BackupDocument`.
- Produces `parseBackup(text: string): BackupDocument`; throws descriptive `Error` without writing storage.

- [ ] **Step 1: Write failing shopping transformation tests**

Create tests proving:

```js
test('editing an item preserves original state and updates requested fields', () => {
  const original = createDefaultShoppingState();
  const item = original.stores[0].items[0];
  const edited = updateItem(original, original.stores[0].id, item.id, {
    name: 'Chicken thighs', quantity: '2 packs', note: 'Freeze one', tag: 'PLAIN',
  });
  assert.notEqual(edited, original);
  assert.equal(original.stores[0].items[0].quantity, '1 pack, about 2.1 kg');
  assert.equal(edited.stores[0].items[0].quantity, '2 packs');
});
```

Cover add/rename/delete store, add/edit/delete/toggle item, clear checks, empty progress, readable text output, blank-name rejection, missing-ID rejection, and default-state validation.

- [ ] **Step 2: Verify shopping RED**

Run `node --test tests/shopping.test.mjs`.

Expected: `ERR_MODULE_NOT_FOUND` for `assets/shopping-state.js`.

- [ ] **Step 3: Implement minimal shopping state module**

Embed supplied three-store defaults once. Validate required string fields. Clone before mutations. Accept an optional ID factory for deterministic tests; browser controller passes `makeId` from shared utilities.

- [ ] **Step 4: Verify shopping GREEN**

Run `node --test tests/shopping.test.mjs`.

Expected: all shopping tests pass.

- [ ] **Step 5: Write failing backup tests**

Cover valid round trip, malformed JSON, wrong application marker, unsupported version, missing sections, invalid shopping shape, and all-or-nothing parsed output.

- [ ] **Step 6: Verify backup RED**

Run `node --test tests/backup.test.mjs`.

Expected: `ERR_MODULE_NOT_FOUND` for `assets/backup.js`.

- [ ] **Step 7: Implement backup validation**

Use document shape:

```js
{
  application: 'gta-nutrition-plan',
  version: 1,
  exportedAt: '2026-09-03T20:00:00.000Z',
  data: { shopping, tracker, whey }
}
```

Parse entire document first. Return deep-cloned validated data. Do not import browser APIs.

- [ ] **Step 8: Verify Task 2 GREEN**

Run `npm test`.

Expected: all core, shopping, and backup tests pass.

- [ ] **Step 9: Commit**

```powershell
git add assets/shopping-state.js assets/backup.js tests/shopping.test.mjs tests/backup.test.mjs
git commit -m "feat: add editable shopping and backup models"
```

### Task 3: Shared Shell, Canonical Pages, And Static Contract

**Files:**
- Create: `assets/styles.css`
- Create: `assets/common.js`
- Create: `tests/static.test.mjs`
- Rename: `START_HERE.html` to `index.html`
- Rename: `gta_16_week_nutrition_plan.html` to `plan.html`
- Rename: `intake_response_tracker.html` to `tracker.html`
- Rename: `shopping_checklist.html` to `shopping.html`
- Rename: `quick_start_card.html` to `quick-start.html`
- Rename: `mothers_sunday_cooking_sheet.html` to `cooking.html`
- Modify: all renamed HTML files
- Delete: `shopping_list_phone_notes.txt`

**Interfaces:**
- `common.js` exports `createStorage`, `makeId`, `downloadText`, `copyText`, `loadJson`, and `saveJson`.
- Every page exposes identical `.site-nav` links and one `aria-current="page"` value.
- Dashboard exposes install, backup, and whey elements consumed by later controller work.

- [ ] **Step 1: Write failing static contract tests**

Create `tests/static.test.mjs` to assert:

- Required final HTML filenames exist.
- Legacy HTML filenames and plain-text list do not exist.
- Every page declares `lang="en"`, viewport metadata, shared stylesheet, module script, skip link, main landmark, and full navigation.
- Every relative link resolves with exact case.
- Every fragment points to existing ID.
- Every page has unique IDs.
- Tracker input templates contain programmatic labels.
- No inline `onclick` handlers remain.
- No external script or stylesheet exists.

- [ ] **Step 2: Verify static RED**

Run `node --test tests/static.test.mjs`.

Expected: failure because `index.html` and shared shell do not exist.

- [ ] **Step 3: Rename files and build shared shell**

Use `git mv` for six HTML files. Remove duplicated embedded CSS. Add shared header/navigation/footer, page-specific class on `body`, skip link, module script, and stable main ID. Preserve supplied content blocks.

Create `assets/styles.css` with shared palette, responsive layout, cards, forms, buttons, dialog, progress, tables, tracker mobile cards, print rules, visible focus, 44-pixel controls, and reduced-motion handling.

Create `assets/common.js`. `createStorage` probes local storage and returns `{ storage, persistent }`; memory fallback reports `persistent: false`. `copyText` uses clipboard when available and returns `true` or `false`. `downloadText` creates and revokes object URLs after one second.

Rewrite dashboard as task-first cards and phone-install instructions. Include static links as ordinary anchors.

- [ ] **Step 4: Verify static GREEN**

Run `npm test` and `git diff --check`.

Expected: all tests pass; no whitespace errors.

- [ ] **Step 5: Commit**

```powershell
git add --all
git commit -m "feat: build mobile navigation shell"
```

### Task 4: Editable Shopping Interface

**Files:**
- Create: `assets/shopping.js`
- Modify: `shopping.html`
- Modify: `assets/styles.css`
- Modify: `tests/static.test.mjs`

**Interfaces:**
- Consumes all transforms from `shopping-state.js`.
- Persists `gtaNutrition.shopping.v2`.
- Dispatches `gta-data-changed` on successful save for dashboard summaries.

- [ ] **Step 1: Extend static test with failing shopping controls**

Assert `shopping.html` contains named forms/dialogs and controls for store add/rename/delete, item add/edit/delete, clear checks, restore defaults, copy, export, and import. Assert each destructive control has confirmation copy in controller source. Assert renderer assigns text with `textContent`.

- [ ] **Step 2: Verify RED**

Run `node --test tests/static.test.mjs`.

Expected: missing shopping controls/controller assertions fail.

- [ ] **Step 3: Implement shopping controller and markup**

Render stores and items from validated state. Use event delegation with `data-action`, `data-store-id`, and `data-item-id`. Reuse one store form and one item form. Preserve edits in local storage. Display persistent-storage warning when fallback mode is active.

Confirmation messages identify exact destructive action. Copy produces headings plus `item - quantity` lines. Restore uses `createDefaultShoppingState()`.

- [ ] **Step 4: Verify GREEN**

Run `npm test`.

Then serve repository and use browser automation to add item, edit quantity, check it, reload, and verify state survives.

- [ ] **Step 5: Commit**

```powershell
git add shopping.html assets/shopping.js assets/styles.css tests/static.test.mjs
git commit -m "feat: make shopping list fully editable"
```

### Task 5: Corrected Responsive Tracker And Whey Tool

**Files:**
- Create: `assets/tracker.js`
- Create: `assets/home.js`
- Modify: `tracker.html`
- Modify: `index.html`
- Modify: `assets/styles.css`
- Modify: `tests/static.test.mjs`

**Interfaces:**
- Tracker persists `gtaNutrition.tracker.v2`.
- Whey calculator persists `gtaNutrition.whey.v1`.
- Home controller consumes `calculateWheyLabel`, backup helpers, and storage helpers.

- [ ] **Step 1: Extend static tests with failing tracker and whey contracts**

Assert tracker has goal-minimum, goal-maximum, calorie, protein, date, waist, and previous-overshoot fields; mobile data labels; no old target-finish field; CSV export; backup controls; and module controller. Assert dashboard contains four whey inputs, result region, storage notice, install button, export, and import controls.

- [ ] **Step 2: Verify RED**

Run `node --test tests/static.test.mjs`.

Expected: tracker and whey contract failures.

- [ ] **Step 3: Implement tracker page**

Generate fourteen labeled rows with `data-label` attributes. Load validated saved values. Save on `input` and `change`. Reject goal minimum greater than goal maximum. Use `calculateTracker` for every displayed metric and decision. Render calorie and protein adherence counts. Preserve waist-only warning contract. Build CSV with escaped cells, UTF-8 BOM, and delayed object-URL revocation.

- [ ] **Step 4: Implement dashboard calculator and backup UI**

Calculate on every valid whey change. Display honey or oil method with signed adjustment. Save values locally. Build one JSON download from current three states. Import only after `parseBackup` succeeds; write all keys after validation, then refresh visible summaries.

Register install prompt when browser exposes `beforeinstallprompt`. Otherwise keep platform instructions and hide dead Install button. Register service worker only on HTTP(S).

- [ ] **Step 5: Verify GREEN**

Run `npm test`.

Serve repository. Browser-test date, fourteen input cards, projection, protein adherence, reload persistence, CSV download, whey honey path, whey oil path, and invalid import rejection.

- [ ] **Step 6: Commit**

```powershell
git add tracker.html index.html assets/tracker.js assets/home.js assets/styles.css tests/static.test.mjs
git commit -m "feat: fix tracker and add setup tools"
```

### Task 6: PWA, Offline Contract, Icons, And User Documentation

**Files:**
- Create: `manifest.webmanifest`
- Create: `sw.js`
- Create: `icons/icon-192.png`
- Create: `icons/icon-512.png`
- Create: `README.md`
- Modify: every HTML file
- Modify: `tests/static.test.mjs`
- Delete: `README.txt`

**Interfaces:**
- Service worker cache name follows `gta-nutrition-v1`.
- Manifest start URL and scope use `./`.
- Offline shell lists every final application page, module, stylesheet, icon, and retained PDF.

- [ ] **Step 1: Add failing manifest and cache tests**

Parse manifest as JSON. Assert standalone display, relative start URL/scope, 192/512 icons, theme colors, and app names. Parse service worker asset array and assert every path exists. Assert HTML references manifest, favicon, theme color, and home controller registration.

- [ ] **Step 2: Verify RED**

Run `node --test tests/static.test.mjs`.

Expected: missing manifest, service worker, icons, and README assertions fail.

- [ ] **Step 3: Implement PWA and documentation**

Create icons from one simple navy/teal plate with white `GTA` mark. Add manifest. Implement install/cache cleanup and same-origin fetch policy from spec. Create README covering local launch, public URL, iPhone/Android installation, offline limits, local-only data, backup/import, tests, and deployment.

- [ ] **Step 4: Verify GREEN and offline behavior**

Run `npm test` and `git diff --check`.

Serve repository, open dashboard, confirm service-worker activation, visit every page, switch browser network offline, reload dashboard and core pages, and inspect console logs.

- [ ] **Step 5: Commit**

```powershell
git add --all
git commit -m "feat: ship installable offline PWA"
```

### Task 7: Full Verification, Deployment, Release, And Cleanup

**Files:**
- Create temporarily: `release/GTA-Nutrition-Plan-v1.0.0.zip`
- Remove before final repository commit: `docs/superpowers/`
- No production source additions.

**Interfaces:**
- Produces public GitHub Pages URL.
- Produces clean final repository on `main` tagged `v1.0.0`.
- Produces deployable ZIP without development artifacts.

- [ ] **Step 1: Run full automated gate**

Run:

```powershell
npm test
git diff --check
git status --short
```

Expected: zero failed tests, zero whitespace errors, clean feature branch.

- [ ] **Step 2: Run fresh browser matrix**

At desktop and 390-by-844 viewport, verify every acceptance criterion. Exercise editing, persistence, backup, tracker, calculator, navigation, install metadata, offline reload, PDFs, print pages, focus order, and console logs. Record failures and return to owning task using RED-GREEN-REFACTOR.

- [ ] **Step 3: Remove development-only docs**

Delete `docs/superpowers/`, run `npm test`, and commit:

```powershell
git add --all
git commit -m "chore: prepare personal release"
```

- [ ] **Step 4: Merge and close feature branch**

Switch to `main`, fast-forward merge `codex/gta-nutrition-release`, delete branch, verify only `main` remains, and tag verified commit `v1.0.0`.

- [ ] **Step 5: Publish GitHub Pages**

Confirm GitHub CLI authentication without printing credentials. Create public repository only if no same-name repository exists. Push `main` and tag. Enable Pages from `main` repository root. Poll deployment URL until dashboard returns HTTP 200 and manifest/service worker paths resolve.

- [ ] **Step 6: Build deployable release ZIP**

Package HTML, assets, icons, manifest, service worker, PDFs, and README only. Exclude `.git`, tests, package metadata, development docs, logs, caches, and temporary files. Validate archive entry allowlist and test extracted copy through local HTTP.

- [ ] **Step 7: Remove temporary work**

Stop local server. Delete `D:\Users\earne\Downloads\GTA_Nutrition_Plan_Bundle_audit` after verifying resolved path remains inside Downloads. Replace original supplied ZIP only after new archive passes hash, entry, extraction, and browser gates. Remove temporary release directory after copied ZIP verification.

- [ ] **Step 8: Final completion audit**

Verify requirement-by-requirement against spec acceptance criteria. Confirm AgentOps `git status` matches pre-task state, product repository is clean on `main`, feature branch is gone, tag exists, public URL works, final ZIP opens, and no temporary artifacts remain.

