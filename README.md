# Forme

A personal app for training, food, a short movement practice and daily habits. It runs in the browser, works offline once installed, and keeps everything on the device. No account, no server, no analytics.

Forme 4.0 is a rebuild of Form & Fuel 3.0. Earlier journals, drafts, backups and the private log keep working unchanged. See [the handoff](docs/FORME-HANDOFF.md) for what changed, what was checked and what was not.

Published copy: https://ibszs.github.io/GTA-Nutrition-Plan/

## Run it locally

From this folder in PowerShell:

```powershell
python -m http.server 4191 --bind 127.0.0.1
```

Open http://127.0.0.1:4191/ and leave the terminal running. There is no install or build step: plain HTML, CSS and JavaScript modules.

A browser keeps separate data for each address. Use the same address you used before, or your earlier records will not appear there.

## What is in it

- **Today.** Start or resume a workout, tonight's dinner, the short movement session, habits, morning weight and sleep. Pin, hide and reorder the modules. "Just got home" and "Pick for me" answer a tired evening in one sheet.
- **Train.** The five-day rotation and every earlier session. Logging shows the last load and reps beside each set; tick, undo, swap, resume. Quick log for a workout you forgot to track, a leg and hamstring focus view, and a quiet replay when a set is a new best.
- **Eat.** Sixteen recipes with every calorie traced to an ingredient, measured oil, a lighter version side by side, metric and household measures, a serving scaler and a hands-busy cook mode. Two sample weeks (lean gain and recomp) built on mostly the same groceries, a combined grocery list with a pantry check, Prep Once Eat Twice, a Use It First shelf with date labels, and a "what can I make" finder.
- **Move.** A guided posture and movement practice: 7 days, then an explicit choice to repeat, change focus, opt into 30 days or stop. Eighteen drills, each with a teaching card, a start and finish drawing, named targets, an easier version and what to do if it bothers something. Evidence and its limits are listed per claim.
- **Habits, Reset, Private, Play.** Editable habits with skips and no pressure from streaks. Reset for an afternoon that got away. An opt-in private pause tool and the earlier private log, both kept off the main screens. Stickers, a side quest, Night Drive and a weekly replay, all optional.
- **You.** Goal mode and targets, weekly trends, appearance (dark, light or match the device), motion, sound, backup and import, and every credit and source.

The red button in the dock is quick add: type `181.4`, `sleep 7.5`, a habit or a dish.

## Your data

- Everything is stored in this browser's local storage on this device. Clearing browser data deletes it, so export a backup now and then: **You, Backup and data, Export everything**.
- One backup file holds everything, including the private areas. Keep it somewhere only you can reach.
- Backups from Form & Fuel (versions 1 and 2) still import. An import is checked before anything is written and rolled back if a write fails.
- The earlier journals are read and written in their original format under their original keys. Forme adds its own records beside them and never rewrites them into a new shape.
- The private areas are not encrypted or password protected. They are only kept out of sight.

## Install and offline use

Open the published link in Safari and use Share, Add to Home Screen, or use Chrome's Install option. The first online visit saves the app for offline use; the gym guide photos follow in the background. Outside links (creator recipes, studies, demo videos) need a connection. Nothing else does.

Habit reminders can only fire while Forme is open or kept alive in the background, because there is no server to send them.

## Check it

Node.js 22 or newer:

```powershell
npm test
```

The suite covers the nutrition maths, the sample weeks and grocery list, the movement plan, habits, quick add parsing, lift records, the content (recipes, drills, sources, photo credits), storage and migration, backup and restore, the offline file list, and a render of every screen in three data states.

When publishing an update, change `CACHE_NAME` in `sw.js`.

## Layout

- `index.html`, `app/main.js`: the shell and the router.
- `app/views/`: one module per area. `app/logic/`: pure logic, no page access. `app/data/`: recipes, foods, drills, evidence, credits.
- `app/css/`: `base.css` is the design system, `rooms.css` the area-specific pieces.
- `assets/`: the earlier state modules (still the source of truth for training, backup and the private log), icons, fonts and photographs.
- `docs/`: the handoff, the asset register and licences. `docs/visual-redesign.md`, `docs/implementation-plan.md` and `research/` describe version 3 and are kept as history.

This is a personal planning tool, not medical or dietetic advice. The long-term weight marker is an ambition, not a forecast.
