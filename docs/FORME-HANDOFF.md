# Forme 4.0 handoff

Written 17 Nov 2026 on the branch `fable/forme-rebuild`. The work is committed on that branch (the 4.0 rebuild, the third design pass, the final review, then a follow-up pass on light mode and text). Nothing is pushed, so the published copy and your phone are still on Form & Fuel 3.0.

## What changed

**Structure.** The seven separate pages are now one app: `index.html` plus a router, with a screen module per area under `app/`. The old page addresses (`training.html`, `meals.html` and the rest) redirect to the matching screen, so bookmarks and the installed icon keep working.

**Your data.** The earlier journals are not converted. Training, the private log and your custom store lists are still read and written through the original modules, under the original storage keys, in the original format. Forme adds its own records beside them (`forme.*`). On first run it copies your daily tracker rows into the new body log, carries your calorie and protein targets into Lean gain (flagged as carried, so you can review them) and carries your whey label. Backups are version 3: the old envelope plus a `forme` section. Version 1 and 2 backups still import.

**Design.** This is the third pass, done on 17 Nov 2026 after you said the second still looked AI-made. It replaces the colours, the typefaces and the on-screen writing. Structure, data and features are unchanged.

- **The idea.** Forme is set like a sports daily printed on coloured paper. Pink stock, black ink, one spot red. Dark appearance is the night edition: black page, with the pink kept for the block you act on. Light appearance is a white page with black ink and the same pink blocks (changed on 18 Nov 2026; before that it printed black on a pink page).
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
| Private | The T log from the earlier app, first on the screen, with the same data. Below it, the opt-in "A minute" pause tool. |
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
- **Backup of the second pass:** it is the first of the two commits on the branch, and also saved at `refs/backup/pre-design-pass-3`.

## Final review (17 Nov 2026)

- **Static audit:** no style variable is used without being defined, and every icon named in the code exists in the sprite.
- **Every route, both appearances:** 67 routes with empty data and 44 with data in them, in dark and light. Checked for a crashed screen, console errors, sideways overflow, broken images, missing icons, clipped buttons, stray typefaces and broken text. None found.
- **Flows driven in a real browser with throwaway data:** start a workout, enter and edit a set, leave, resume, finish as partial, find it in History; open tonight's recipe, switch to the lighter version, scale servings, add to groceries, cook mode to the end, log as cooked, rate a leftover; week plan mode switch, swap, portion change; tick, hide and add grocery items; start movement, pause, skip through, rate it, 2-minute version; add and tick a habit and see it on Today; private pause on and discarded; quick add a weight; search; Reset timer and the one thing; side quest, Night Drive, replay, month; every Settings control; Just got home, Pick for me, Edit layout. No errors.
- **Fixed during the review:** the browser bar colour lagged one screen behind a theme or paper change; "1 sets" and "1 weeks"; two fridge chips both reading "Plain Greek yogurt"; the top bar was cramped when the private shortcut showed; a squeezed stepper on the oil meter; an unsized header photo on Habits and Reset; three leftover slogan headings.
- **Looked at as pictures with data in them:** Today, Habits, Reset, Use it first, Progress, Private, the month, the replay and a teaching card, on top of the screens listed above.
- **Still not checked:** the handover from the 3.0 service worker to this one on a real phone (rehearsed since in a desktop browser, see "Update rehearsal" below), your real data going through the first-run copy, backup export and import by hand in this pass (the automated tests cover them), animations by eye, Safari, and a screen reader.

## Follow-up pass (17 Nov 2026): light mode, text, the T log

- **The T log was never removed.** It kept its data and its storage key. It had been moved to the bottom of You, Private, inside a closed fold that only appeared once the log had an entry, which made it look gone on a fresh copy. It is now the first thing on Private, always there, open when it has entries. The eye icon on Today still appears once the log has an entry and opens straight to it.
- **Light mode.** It already existed under Settings but was hard to find. There is now a sun or moon switch in the top bar on tablet and PC widths, and a Dark, Light, Match device control at the top of You on every width. On PC the side rail is paper with an ink rule in light mode instead of black. Dark is still the default on first run.
- **Text faults fixed, PC:** the Train headline split mid-word ("LOWE / R"), because it was sized from the window instead of its own column; reading text ran 105 to 157 characters a line and now stops at about 85; the top bar drifted out of line with the page on wide monitors; the start button in the lead block now sits level with the foot of the photograph.
- **Text faults fixed, phone:** screen names in the top bar were cut off with dots on recipe pages (the bar now shows the name or the date, and Today keeps the date); headings sat flush against the paragraph under them on eleven screens; the Controls rows on Private and Stickers had no space between them; "Start fresh" wrapped onto two lines; one placeholder was too long for its box.
- **Wording faults fixed:** "1 servings", "1 reps", "1 habits", "1 stickers"; "Halal Chicken breast" is now "Halal chicken breast" on the grocery list; a double full stop after the T log reference time.
- **Checked:** `npm test`, 628 passing. All 39 seeded routes measured at 390 and 1280 wide for clipped text, wrapped controls, headings touching paragraphs, over-long lines and anything off the side: none left, apart from two evidence lists that are citations. Looked at as pictures in light mode: Today, Train, Kitchen, a recipe, Week plan, Groceries, Move, the evidence page, Progress, Stickers, You, Settings and Private at phone width, and Today, Train, Kitchen, a recipe, the evidence page and Settings at PC width, plus Today at 1920. The switch and the T log (add an entry, see it listed, open it from the eye icon) were driven in a browser.
- **Not checked:** the Sky, Butter and Grey papers after this pass, tablet widths between 600 and 900 as pictures, and everything in the earlier "not checked" list.

## Fat to protein (17 Nov 2026, version 4.0.1)

You asked for recipes at 1 g of fat to 2 g of protein, ideally 1 to 3, with nothing made up to get there. So no ingredient, quantity or recipe was added or changed. The app now measures the ratio and uses only the lighter versions and portion options that were already written into each recipe.

- **What the app does now.** Every recipe card and recipe page shows its fat-to-protein figure. A recipe opens, and goes into the week plan, cooked the smallest existing way that reaches 1 to 2. Where 1 to 3 is reachable the recipe page says how and offers it; it is not applied for you. Where no existing version reaches 1 to 2 the page says so in plain words and the recipe is left alone. The Kitchen has a "1:2 fat or leaner" filter. The week plan shows the ratio for the week and for each day, names the meals that hold a day over, and no longer suggests a fattier portion or version to close a calorie gap.
- **The 16 recipes, measured from the app's own food data.** Figures are rounded down, so a miss never reads as a pass:

| Recipe | As written | Reaches 1:2 by | Reaches 1:3 by |
|---|---|---|---|
| Store-run plate | 1:4.3 | as written | as written |
| Chicken hummus pita box | 1:3.1 | as written | as written |
| House shake | 1:2.3 | as written | peanut butter: none |
| Big-batch spiced chicken | 1:2.6 | as written | the lighter version |
| Yogurt bark | 1:1.5 | the lighter version (1:5.6) | the lighter version |
| Crispy chicken wrap | 1:1.4 | the lighter version (1:2.7) | lighter, cheese: half |
| Chili garlic noodles | 1:1.4 | the lighter version (1:2.8) | lighter, chicken: extra |
| PB and berry overnight oats | 1:1.8 | whey: full scoop (1:2.5) | peanut butter: none |
| Butter chicken | 1:1.3 | the lighter version (1:2.5) | not reachable |
| Shawarma rice plate | 1:1.3 | the lighter version (1:2.4) | not reachable |
| Cheeseburger pasta | 1:1.6 | the lighter version (1:2.0) | not reachable |
| Hot honey beef bowl | 1:1.5 | **not reachable** (closest 1:1.9, avocado: none) | not reachable |
| Keema matar | 1:0.9 | **not reachable** (closest 1:1.6, lighter) | not reachable |
| Smash burger bowl | 1:1.1 | **not reachable** (closest 1:1.4, lighter, fries: half) | not reachable |
| Breakfast burritos | 1:1.2 | **not reachable** (closest 1:1.3, cheese: none) | not reachable |
| Masala popcorn | 1:0.6 | **not reachable** (4 g protein, 6 g fat a serving) | not reachable |

- **The sample week.** At first the five recipes above were left in it and flagged. You then chose to drop them from the week, so the sample week was rebuilt from the eleven recipes that reach 1 to 2. The five are still in the Kitchen, flagged, and you can still plan them by hand.

| Day | Breakfast | Shift lunch | Snack | Dinner | Evening extra | Fat to protein |
|---|---|---|---|---|---|---|
| Mon | Overnight oats | Pita box | House shake | Crispy chicken wrap | Yogurt bark | 1:2.7 |
| Tue | House shake | Shawarma rice plate | Overnight oats | Chili garlic noodles | Yogurt bark | 1:2.6 |
| Wed | Overnight oats | Pita box | Yogurt bark | Butter chicken | House shake | 1:2.7 |
| Thu | House shake | Butter chicken | Overnight oats | Crispy chicken wrap | Yogurt bark | 1:2.6 |
| Fri | Overnight oats | Store-run plate | House shake | Cheeseburger pasta | Yogurt bark | 1:2.7 |
| Sat | House shake | Cheeseburger pasta | Overnight oats | Shawarma rice plate | Yogurt bark | 1:2.4 |
| Sun | Overnight oats | Shawarma rice plate | House shake | Butter chicken | Yogurt bark | 1:2.5 |

  The old week, as written, averaged 1:1.6 (112 g fat, 185 g protein, 2,890 kcal). The new one averages 1:2.6 (75 g fat, 199 g protein, 2,680 kcal), and every day reaches 1 to 2 in both goal modes. Leftovers follow each recipe's own storage notes: Thursday's wraps use Monday's strips from the freezer, Sunday's butter chicken is the portion frozen on Wednesday.
- **The cost of dropping them.** Less variety. Breakfast and snack are now overnight oats and the house shake every day, the evening extra is yogurt bark six days of seven, and there is no beef dinner except the pasta. That is what the existing recipes allow. More variety needs real, sourced recipes that reach 1 to 2, which have not been added.
- **Two things to know.** The lean-gain week now sits about 430 kcal under your calorie target instead of 220, because the fat that came out carried calories; the week plan offers the starch portions to make it up. And your daily targets were not changed: lean gain is already set at 2 g protein and 1 g fat per kg, which is 1 to 2. Moving the whole day to 1 to 3 would put fat near 55 g, about 16% of your calories, which is below the 20% that sports nutrition guidance usually treats as a floor. That is a choice for you and your clinician, so the app does not make it.
- **Where the recipe numbers come from.** Recipe quantities were set in the 4.0 rebuild from the creators' published recipes, and the nutrition is worked out from the USDA rows in `app/data/foods.js`. None of that was touched in this pass.
- **Checked:** `npm test`, 636 passing, eight of them new: the ratio grading, that a lean version only ever uses a recipe's own options, that the five recipes above are reported as unreachable and left unaltered, that the week plan never suggests a fattier option, and that the sample week plans only recipes that reach 1 to 2 and reaches it on every day. Looked at as pictures: the Kitchen, a recipe that reaches the aim, one that cannot, and Thursday in the week plan before and after the rebuild.
- **Not checked:** the swap sheet and the recomp week as pictures, and PC width for the new lines.

## The eye icon and a white light mode (18 Nov 2026, version 4.0.2)

- **The eye icon is back on Today for good.** The earlier app always had it there. Forme only showed it once the T log had an entry, so on a fresh copy (a newly added home-screen app starts empty) it never appeared. It is now always in the top bar on Today, with no label and nothing that says what is behind it. It opens Private with the T log already open, ready for an entry. It is on Today only, not on other screens.
- **Hiding it.** "Hide the eye icon" is under Controls at the bottom of Private. It used to be reachable only when "A minute" was switched on; it is now always there. With the eye hidden, Private is still under You.
- **What it does not do.** It is not a lock. Anyone holding the unlocked phone who taps the eye sees the log, the same as in the earlier app. Forme has no passcode.
- **Light mode is now white.** The page is white, the ink is black, and the pink is used for the blocks: the lead block on each screen, today in the week strip, the selected day tab, records, and the tab you are on in the bottom bar. Panels carry a faint tint of the pink. Buttons, selected chips and switches are black. The bottom bar is white with a black rule instead of solid black; on PC the side rail matches. Dark mode is unchanged. The Paper choice in Settings now changes the block colour in both appearances.
- **Two older faults found in the review and fixed.** The "Illustrative diagram" caption on movement drawings was too faint in both appearances (2.8 to 1 in light, 3.7 to 1 in dark). The "Emergency: call 911" heading on the Get checked screen was 3.1 to 1 in dark mode. Both now pass 4.5 to 1.
- **Checked:** `npm test`, 636 passing. Contrast measured on 41 routes with data in them, in light and in dark: every piece of text passes except the days of the neighbouring months on the month sheet, which are faded on purpose and hidden from screen readers. Driven in a browser on an empty profile: the eye shows on Today and not on Train, opens the T log, an entry saves and lists, the hide switch removes the eye and brings it back. Looked at as pictures in light: Today, Train, Kitchen, a recipe, a movement card, the month, Private at phone width; Today and Settings at PC width; Today on the Sky paper. Today in dark on an empty profile.
- **Not checked:** an iPhone, Safari, the Butter and Grey papers in the new light mode, tablet widths, and sheets and dialogs as pictures in the new light mode (they were measured for contrast only where a route opens them).

## Forme 5: plans, pictures, popups and a new look (19 Nov 2026, version 5.0.0)

You asked for more workout plans and more to customise, pictures where there were blanks, popups in place of long text, and a dark mode that does not look cheap. This pass does those four things. Your journal, its storage key and its format are unchanged.

**Training**

- **Eight plans instead of one.** Hybrid 5 (the rotation you had), Push Pull Legs (6 days), Upper Lower (4), Legs First (4, hamstrings and glutes lead, 12 direct hamstring sets a week against 8 before), Full Body 3, Express (3 short sessions of four movements), Dumbbells Only (3) and Your Own Week (empty, you fill it). Train, Change plan. Each plan card shows its lifts, days, weekly sets and hamstring sets; the detail sheet lists every session and the sets per muscle.
- **Edit week.** Put any session, from any plan, on any day, or make a day a rest. "Put the plan's week back" undoes it. "Slide the whole week" is the old Shift rotation.
- **Edit sessions.** Change movements, order, sets, rep range and variation, rename the session, add or remove a movement. Your version is used every time that session comes up, and "Put the plan's version back" undoes it.
- **Training settings.** Rest timer (automatic, 1:00, 1:30, 2:00, 3:00 or off), how much one tap of + or minus changes the load, lift demos looping or still, lift photographs in colour or black and white.
- **The logger.** The open movement shows its demo (the two photographs of the lift fading into each other). Every row has its photograph. Progress is a ring. The rest timer is a capsule. Finishing shows a Saved card with the three numbers.
- **How it is stored.** The 19 new sessions are added to `assets/training-program.js` beside the original five, under new versioned ids, so the journal's own validator accepts workouts logged from them. Which plan you use, a rearranged week and edited sessions are in a new Forme section, `forme.train.v1`. It is in backups. An edited session is logged the way an adapted workout already was (`customized`), so the saved format did not change.

**Pictures**

- **Lifts.** Photographs now appear on the Train lead card, the plan cards, session lists, the logger, history, records, the leg view and the lift library (which is a photo grid now). They are the same 76 audited photographs as before, still shown only for the exact variation they picture.
- **The four dishes with no photograph** (smash burger bowl, hot honey beef bowl, cheeseburger pasta, pita box) each have a drawn plate, built in code from the recipe and labelled "Illustration". The last pass could not find a licensed photograph that matched them and I did not download anything in this one, so these are drawings, not photographs.
- **Empty screens** (no history, no records, no workout in progress) show a photograph and one next step.

**Popups in place of text**

- A small "i" opens an explanation in a sheet. The text behind it is the text that used to sit on the page: reps in reserve, what counts as a record, lighter sessions, changing plan, units, the rest timer, the demos, fat to protein, where the numbers come from, maintenance, where your data is kept, how the look is built.
- **Recipe pages** are about a quarter shorter. Reheating and storage, taste and swaps, the creator credit and the ingredient-by-ingredient numbers are four tiles under the method; each opens its own sheet. Nothing was deleted. "Reheating" still has the Health Canada limits inside it.
- **Kitchen.** The craving cards are a short list that opens a sheet. Search is one field. Filters scroll sideways.
- **You, Goal, Progress, Backup, Week plan**: the explanatory paragraphs are behind an "i".
- Researched wording was moved, not rewritten.

**The look**

- **Why dark looked cheap.** The page was near pure black and the largest thing on every screen was a flat pink block. Pink was also mixed into the text. That is the most saturated colour on the largest area at the highest contrast.
- **What changed.** The dark page is graphite in four steps, so cards sit on it. Text is a neutral off-white. The lead card is a soft dark card and the photograph carries the colour. Pink is spent on the one button you press, the tab you are on, progress and today. The quick-add button is pink; it turns red only while a workout is recording, which is what red was meant for.
- **Light mode** keeps what you liked: white page, black ink, pink lead block. It gets the same shapes.
- **Shape.** Rounded corners on a small scale, hairlines instead of 2px ink rules, a glass top bar, a floating glass dock, sheets with a grab handle, pill chips, a segmented control with a raised pill, round checkmarks.
- **Settings, Appearance** is where you change it: 8 accents (Pink, Ember, Butter, Lime, Mint, Sky, Lilac, Grey), 4 dark grounds (Graphite, Midnight, Plum, Black for OLED), lead cards (Automatic, Soft, Colour block), corners (Rounded or Square), and "Back to the default look". Square corners with Colour block is close to the 4.0 look if you want it back.

**Checked**

- **Automated:** `npm test`, 671 tests, all passing. 35 are new: the plan library and its sessions through the unchanged journal, the calendar under each plan and under a shifted week, a journal still on the four-session plan, rearranged weeks, edited sessions (including twelve kinds of bad edit that must be ignored), leg-day detection, the popups (every "i" has its text, every text is used) and the four drawn plates.
- **In a browser, phone width (390 x 844), throwaway data:**
  - 40 routes in dark and in light: no errors, no sideways scroll, nothing off the right edge, no clipped button, chip or tag, no `undefined` or `NaN`.
  - Contrast measured on 26 routes in dark and light, about 2,000 pieces of text each: all pass AA (4.5 to 1, or 3 to 1 for large text). The lowest of the ones I read off by hand was a rest-day label in the plan card at 4.56. Text over photographs was not measured; it sits on a dark gradient.
  - Driven by hand: switch plan, edit the week, reset it, slide it; edit a session (rename, add, swap, reorder, remove, change sets), save, reset; start, enter and tick sets, rest timer, finish as partial, Saved card; lighter session; log a past workout and discard it; rest off and a 2.5 step; a journal on the old four-session plan adopting a plan; recipe tiles, craving sheet, search, lean filter, servings, add to groceries, log as cooked; Today shortcuts; the movement start. No errors.
  - Typing in the lift search keeps the cursor in the field while the grid filters.
  - The offline copy installs as `forme-v5.0.0` with 158 files, including the four new modules.
- **Looked at as pictures:** dark: Today, Train, the logger, the Saved card, plan library, a plan, week editor, session editor, a recipe with a photo, a recipe with a drawing, all four plates at card and thumbnail size, Kitchen, Week plan, Move, Habits, Stickers, Settings, a reheating sheet, an explanation sheet. Light: Today, Train, Kitchen, Search, You. Also Today on Midnight with Mint, Today with square corners and the colour block, cook mode, and Today, Train and quick add at 1280 wide.
- **Fixed during QA:** a focus ring drew down the whole left edge of the screen after a keyboard press and a route change (it was there before this pass); a partial workout listed and counted the movements you never reached; the plan cards all showed the same three lifts.

**Not checked**

- **A real phone, Safari, a screen reader.** Same as every pass before.
- **Glass on older phones.** The top bar, dock, toast and rest timer use `backdrop-filter`. Where it is missing they fall back to a slightly see-through solid, which I did not look at.
- **Animations by eye, mostly.** The window was hidden for most of this work, so the sheet slide, the demo loop and the tap feedback were confirmed running in a few screenshots, not watched.
- **Your real data.** The update adds a section and changes nothing in the journal, and the tests cover that, but I never opened the address your records live on.
- **Tablet widths (600 to 900), Butter, Lime, Lilac, Ember, Sky and Grey accents, Plum and Black grounds, black and white photographs** as pictures. They are token changes and measured the same in code.
- **Going back to 4.0.2 after logging from a new plan.** The old code does not know the new session ids and would report the journal as unreadable. It would not delete anything, and 5.0.0 would read it again. Do not roll back without exporting first.

**Two things I would do next, with your say-so**

- **Real photographs for the four drawn dishes.** That needs me to download licensed images, which I did not do without asking. Or take the photos yourself the next time you cook them.
- **Real demo video.** The loops are two stills. Short clips would be better but need a source with clear rights.

## Two of the drawn plates replaced by photographs (19 Nov 2026, version 5.0.1)

You said yes to downloading licensed photographs for the four drawn dishes. Two were found. Two were not, and those keep their drawings.

- **Smash burger bowl.** "Fast Friday Cheeseburger Bowls-" by jules:stonesoup, CC BY 2.0, from Flickr. The licence was read on the Flickr page itself, not only in the search index. Cropped to the bowl and re-encoded: 675 x 681, 97 KB.
- **Cheeseburger pasta.** "Hamburger Helper" by LWYang, CC BY 2.0, from Wikimedia Commons. Cropped slightly, resized and re-encoded: 960 x 655, 118 KB.
- **Neither is an exact picture of your recipe.** The bowl photograph has beef, cheese, pickle, tomato and a creamy sauce, but no lettuce and no fries. The pasta photograph is the boxed dinner the recipe replaces, made with elbow macaroni instead of shells. Each recipe page has an "About this photo" button that says so. That is the same standard the other twelve photographs were held to. If you would rather have the drawings back for either, it is a one-line change in `app/data/recipes.js`.
- **Not found: the pita box and the hot honey beef bowl.** I searched Openverse (which covers Flickr and Wikimedia Commons) with about forty phrasings and looked at 23 candidates. The closest for the pita box were a child's lunchbox with crackers, strawberries and animal picks, and a hot chicken and hummus plate; neither is a cold packed box with pita, cucumber and tomato. Nothing showed ground beef with sweet potato and cottage cheese. A photo you take the next time you make them would beat anything I can find.
- **What was downloaded.** 23 thumbnails to look at and the two photographs above, all into a temporary folder outside the repository. Only the two processed JPEGs are in the repository. Re-encoding removed the original metadata.
- **Checked:** `npm test`, 671 passing. Both photographs looked at full size as files before use. The burger bowl was looked at as a picture on its recipe page. In the running app, read from the page itself: both photographs load on their recipe pages and Kitchen cards, each "About this photo" button shows its note, both credits are listed under You, Credits and sources, the two drawn plates are still on the pita box and the beef bowl, no image is broken, and the version reads 5.0.1. The offline list includes both files.
- **Not checked:** the cheeseburger pasta photograph as a picture inside the app (the window was minimized and screenshots stopped working, so it was only confirmed as loaded at 960 x 655), the Kitchen cards and thumbnails as pictures, and both photographs on a real phone.

## Update rehearsal, old app to new (17 Nov 2026)

The handover from Form & Fuel 3.0 to Forme had never been run. It has now been rehearsed in a real Chromium browser (headless Edge) with service workers: the old app was installed with a workout and a T log entry in it, the served files were swapped for 4.0.1, and the app was opened again.

- **First open after the update still shows the old app.** That is expected: the old app serves itself from its offline copy first. The new version downloads in the background (3 seconds on this PC; longer on a phone connection) and the old app then shows a "Reload app" banner.
- **After the reload:** Forme 4.0.1, the T log entry present and open at the top of Private, the workout in Train history, the eye icon showing on Today, no error screen.
- **An old bookmark** to `training.html` lands on Train in the new app.
- **Not covered:** Safari on an iPhone, which was not available to test, and a real phone connection.

## Updating your phone

Your phone runs the published copy at https://ibszs.github.io/GTA-Nutrition-Plan/, which GitHub Pages serves from `main`. Nothing changes on the phone until this branch is merged into `main` and pushed.

1. **Before publishing, on the phone:** open the app you have now and export a complete backup. Your data should carry over by itself, but this pass has never been run against your real records.
2. **Publish:** merge `fable/forme-rebuild` into `main` and push. Pages takes a minute or two.
3. **On the phone, online:** open the app from its home-screen icon. The old version shows a "Reload app" banner once the new one has downloaded; tap it. If no banner appears, use its "Check for update" button, or close the app fully and open it again.
4. **Check:** Train, History should list your sessions. Then You, Backup and data, and export a fresh backup.
5. **The icon and name.** You do not need to re-add anything for the app to work: the address is the same, so the data and the icon keep working. On Android, Chrome swaps in the new name and icon by itself, usually within a day. On an iPhone the old "Form & Fuel" name and icon stay until you delete the icon and add it again from Safari (Share, Add to Home Screen). Deleting a home-screen app on an iPhone can delete its data with it, so only do that after step 4, and restore the backup afterwards under You, Backup and data.

## Things you should know

- **The repository is public.** Pushing publishes the code. It does not publish your data, which never leaves your browser.
- **After publishing**, open the app once online and reload so the new offline copy replaces the old one. Change `CACHE_NAME` in `sw.js` for every later release.
- **Four recipes have no photograph** because no properly licensed picture matched the dish. They show a coloured card with the dish's description.
- **Habit reminders** only fire while Forme is open or alive in the background.
- **The private areas are hidden, not protected.** No password, no encryption.
- **Movement content is general practice guidance**, not assessment or treatment. The drawings are diagrams, not anatomy plates.
- **Old documents.** `docs/visual-redesign.md`, `docs/implementation-plan.md`, `docs/exercise-audit-2026.md` and `research/` describe version 3. The exercise audit still applies to the gym photographs.
- **Removed files.** The old page scripts and stylesheets, Three.js, two fonts and three generated images are deleted from the working tree. Git still has them. The four typefaces from the second pass (Archivo, Young Serif, Martian Mono, DSEG7) are also removed; they exist only in the backup ref above.
