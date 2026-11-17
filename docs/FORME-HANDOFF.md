# Forme 4.0 handoff

Written 17 Nov 2026 on the branch `fable/forme-rebuild`. Nothing is committed and nothing is pushed.

## What changed

**Structure.** The seven separate pages are now one app: `index.html` plus a router, with a screen module per area under `app/`. The old page addresses (`training.html`, `meals.html` and the rest) redirect to the matching screen, so bookmarks and the installed icon keep working.

**Your data.** The earlier journals are not converted. Training, the private log and your custom store lists are still read and written through the original modules, under the original storage keys, in the original format. Forme adds its own records beside them (`forme.*`). On first run it copies your daily tracker rows into the new body log, carries your calorie and protein targets into Lean gain (flagged as carried, so you can review them) and carries your whey label. Backups are version 3: the old envelope plus a `forme` section. Version 1 and 2 backups still import.

**Design.** This is the third pass, done on 17 Nov 2026 after you said the second still looked AI-made. It replaces the colours, the typefaces and the on-screen writing. Structure, data and features are unchanged.

- **The idea.** Forme is set like a sports daily printed on coloured paper. Pink stock, black ink, one spot red. Dark appearance is the night edition: black page, with the pink kept for the block you act on. Light appearance prints black on the pink.
- **Colour.** No amber, no bone, no warm black. Red is only used for a record, a recording in progress or a warning. Working muscle (red) and lengthening (blue hatch) on the movement drawings are separate from the brand colours. Settings has a Paper choice: Pink (default), Sky, Butter or Grey. Every tint in the app is mixed from that one paper colour, so the whole app follows it.
- **Type.** One family in three widths instead of four unrelated faces: Sofia Sans Extra Condensed for headlines, buttons, dish names and big numerals; Sofia Sans Condensed for figures, tables and labels; Sofia Sans for reading. No serif, no monospace, no LED-clock face.
- **Layout.** Each main tab opens with one inverted block for the thing to do now (today's session, tonight's dinner, today's practice). Sections sit under a 2px rule. Corners are square. Tags lean the same way the headlines do. Nutrition and comparison tables are set like box scores.
- **Removed.** Film grain, the camera date stamp, sprocket holes on the dock, scanlines on the replays, the receipt zigzag and barcode, the rotated masking-tape labels, vignettes and filters on photographs.
- **Writing.** Screen titles are plain names (Settings, Progress, Week plan) instead of slogans. Film terms are gone: Contact sheet is now Month, The sheet is Stickers, "on tape" is "logged". Lines built as "not X, just Y" or reassurance nobody asked for were rewritten or cut. Researched content (recipes, drill cards, evidence notes) was left as written.
- **Icon.** Redrawn: black italic F on pink with a red rule.

**New and rebuilt areas**

| Area | What is there |
|---|---|
| Today | Workout start or resume, the week, dinner, movement, habits, morning numbers, Use It First, the one thing, side quest. Pin, hide, reorder. "Just got home" and "Pick for me". |
| Train | Same program and history. Faster logger with last-time values, undo, rest timer, rough or clean reps. Quick log for a past day. Leg and hamstring view. Record replay. |
| Eat | 16 recipes rebuilt from scratch, recipe page, cook mode, two sample weeks, grocery list, prep flows, Use It First, fridge finder, the old recipe book as an archive. |
| Move | 7-day practice with a Day 7 choice and an opt-in 30-day plan, guided player, 18 teaching cards, evidence page, "when to get checked". |
| Habits | Create and edit, days of week, count or yes/no, skip, yesterday, undo, mute streaks, reminders while the app is open. |
| Reset | Four editable actions and an evening check-in. |
| Private | Opt-in "A minute" pause tool, plus the earlier private log unchanged. |
| Play | Stickers, side quest, Night Drive, the month at a glance, weekly replay with a cover made from what you cooked. |
| You | Goal mode and targets, trends, appearance, motion, backup, credits. |
| Everywhere | Quick add (the red button), search, toasts with undo. |

## Try these first

1. **Open it on the address you normally use** and check Train, History. Your sessions should all be there. Then You, Backup and data: export a backup before anything else.
2. **You, Goal and targets.** Enter your current weight. Your old targets were carried into Lean gain; compare them with the suggestion shown beside them.
3. **Eat, Week.** Switch between Lean gain and Recomp, swap a dinner, change a portion, then open Groceries.
4. **Today, Movement, Start day 1.** It is one tap. Try the 2-minute version on a second day.
5. **Train.** Start today's session, tick a set, leave the screen, come back.

## Research and sources

- **Recipes.** Twelve start from named creators (Mimi Harrison, Nicole Keshishian Modic, Hajar Larbah, Taylor Stinson, Andy Hay, Izzah Cheema, Stealth Health, Yumna Jawad, Beth Moncel); four are house recipes. Each creator's own page was opened and read. Instructions are rewritten, quantities and timings are Forme's, and nutrition is recomputed from USDA FoodData Central rows. Where a creator's stated macros do not match the ingredient maths, the recipe page says so and shows both. Creator, link, what was changed and the macro check are on every recipe page.
- **Food safety.** Health Canada pages for leftovers, storage, cooking temperatures and defrosting, with the page date shown in the app.
- **Movement.** 42 sources in `app/data/evidence.js`: systematic reviews, guidelines and trials found on PubMed and checked against their abstracts or full text, plus HealthLink BC for the "get checked" wording. Each claim in the app carries its evidence level, who was studied, for how long and what it cannot tell you.
- **Goal modes, habits, the pause tool.** Same file, same format.
- **Photographs, icons, typefaces.** `docs/asset-sources.md`, and inside the app under You, Credits and sources.
- **Demo videos.** 18 YouTube links from physiotherapy and hospital channels, one per drill. They are links, not embeds.

Two limits on the research:

- Reddit could not be read from this environment without using your logged-in account, which I did not do. The "what people report" section therefore quotes three non-Reddit first-hand accounts and says why.
- The patellofemoral pain guideline (JOSPT 2019) was behind a bot check. Only its abstract was used, and the claim says so.

## Checks that were actually run

**Automated: `npm test`, 628 tests, all passing.** The eight original test files pass untouched. New tests cover the nutrition maths, sample weeks and grocery list, movement plan, habits, quick add, lift records, reminders, content integrity (every ingredient resolves, no seafood, every drill has a full teaching card, every claim has a source), storage and migration (legacy keys byte-for-byte unchanged after migrating twice), backup and restore with rollback, the offline file list, redirects, and a render of every screen in three data states (empty, a realistic user, awkward edge data) with no `undefined`, `NaN` or broken text.

**In a browser, phone size (375 x 812), on a separate address with throwaway data:**

| Flow | Result |
|---|---|
| Log a set, edit it, leave, resume | Passed. Also survives a full reload. Finishing with sets left saves a partial session. A heavier set later was detected as a record and replayed. |
| Find a meal, swap and scale it in a week, groceries update, reheating notes, switch goal mode | Passed. Totals and the grocery list followed the swap and the portion change. Switching mode and back left the body log, saved recipes and training journal identical. |
| Start movement in one tap, drawing and cue, shorter version, log how it felt, reopen, Day 7 choice, 30-day opt-in | Passed. "Harder" removed a set next time; two "easier" sessions moved four drills up a level; Day 7 offered four choices and the 30-day plan asked before starting. |
| Create a habit, mark it, undo, see it on Today; private pause recorded and discarded; hide and delete | Passed. |
| Reduced motion, wider screen, no dependence on outside embeds | Passed. Reduced motion turns every animation off. 1280 x 800 has no sideways scroll. No screen loads anything from another site. |

Every route (about 70) was opened at phone size in both dark and light: no errors, no broken text, no sideways overflow.

**Contrast, measured.** On every route in both appearances, each piece of text on a solid background was compared with that background against the WCAG AA thresholds (4.5 to 1, or 3 to 1 for large text). Dark passed everywhere. Light had four misses (the date stamp, the faintest grey, and the red used for warnings), which were darkened until they passed. Text over photographs was not measured; it sits on a dark gradient.

**Bugs found and fixed during this pass:** ingredient notes printing as `[object Object]`; a movement day with one drill listed twice; the Today dinner card ignoring the planned portion; leftover texture ratings being recorded but changing nothing; confirmation dialogs and screen changes that could stall when the page was not being painted; labels that wrapped or were clipped on a phone.

**Not checked. Treat these as unknown:**

- **Your real data.** I never opened the address your real records live on. Migration was tested with made-up legacy data only.
- **A real phone.** Touch, safe areas, install to the home screen, haptics, sound and notifications were not tried on a device.
- **Offline in a real browser.** The service worker was exercised in a test harness, not installed.
- **Animations by eye.** The app window was not on screen during this work, so motion was verified by which animations start and where they end, not by watching them. The muscle trace, the receipt print, the weekly replay and the record replay need a look.
- **Light appearance by eye.** Every route was opened in light for errors and contrast, but only Today, the kitchen index, the week plan, Habits and one teaching card were looked at as pictures.
- **Safari and a screen reader.** Not tried. Controls have labels and keyboard focus styles, but nobody has listened to it.
- **Taste.** No recipe was cooked. Timings and quantities are careful estimates.

## Checks for the third design pass (17 Nov 2026)

- **Automated:** `npm test`, 628 tests, all passing. One test list was updated for the new font files. One copy change was reverted because a test pins that wording on purpose (the habit "Yesterday did not happen" line).
- **Looked at as pictures, phone width (390), throwaway data:** Today (dark and light), Train, the workout logger, Kitchen, a recipe page, cook mode, Week plan, Groceries, Move, the movement setup screen, Stickers, Settings, and Today at 1280 wide. Also Today on the Sky paper.
- **Contrast, measured:** every text colour against every surface it sits on, in dark and light, on the page and inside the inverted block, for all four papers (304 pairs). All pass 4.5 to 1. The blue day-marker dot is 3.7 to 1 on the light papers; it is a marker, not text.
- **Not looked at as pictures:** Habits and Reset after their header fix, Private and the pause screen, Search, Progress, Backup, Credits, Use it first, the fridge finder, the replays, most sheets and dialogs, and the Butter and Grey papers. They use the same components as the screens above, but nobody has seen them.
- **Not checked:** animations by eye (the headline wipe, the block wipe and the replays were written but not watched), a real phone, Safari, a screen reader, and your real data. The earlier "not checked" list below still applies.
- **Backup of the second pass:** the working tree as it was before this pass is saved in git at `refs/backup/pre-design-pass-3`. Nothing is committed on the branch.

## Things you should know

- **The repository is public.** Pushing publishes the code. It does not publish your data, which never leaves your browser.
- **After publishing**, open the app once online and reload so the new offline copy replaces the old one. Change `CACHE_NAME` in `sw.js` for every later release.
- **Four recipes have no photograph** because no properly licensed picture matched the dish. They show a coloured card with the dish's description.
- **Habit reminders** only fire while Forme is open or alive in the background.
- **The private areas are hidden, not protected.** No password, no encryption.
- **Movement content is general practice guidance**, not assessment or treatment. The drawings are diagrams, not anatomy plates.
- **Old documents.** `docs/visual-redesign.md`, `docs/implementation-plan.md`, `docs/exercise-audit-2026.md` and `research/` describe version 3. The exercise audit still applies to the gym photographs.
- **Removed files.** The old page scripts and stylesheets, Three.js, two fonts and three generated images are deleted from the working tree. Git still has them. The four typefaces from the second pass (Archivo, Young Serif, Martian Mono, DSEG7) are also removed; they exist only in the backup ref above.
