# Exercise library accuracy audit (2026-09-07)

This is the research package for the original 35-exercise movement library in `dd8aec2` (`assets/training-data.js` and `assets/exercise-visuals.js`). It covers the 70 JPEGs already in that revision. The working-tree additions for pull-ups, the rear-foot-elevated split squat, and the flat-barbell pair are tracked separately; they are not included in the 35-row / 70-file receipt below.

## Result

- **Asset provenance:** 35 mapped source pairs, 70 local JPEGs, and 70/70 matching Git blob SHA-1 values against Free Exercise DB revision `a859101d633a01c4a1a920d6a8ce41dabba0705f`. No local recompression, substitution, or missing source file was found.
- **Movement identity:** Every original pair depicts the intended broad movement and has a usable start and end position. The photos are still references; they are not continuous video and cannot establish a user's form or required range of motion.
- **Presentation accuracy:** Three equipment mismatches matter for the intended use: `row` starts as a machine choice but its pair shows dumbbells; `lateral` starts as a cable choice but its pair shows dumbbells; and the five-day program's Upper flat press uses a barbell while the existing pair shows dumbbells. `split` has a semantic mismatch: the pair is a rear-foot-elevated split squat, while the row is named and coached as a supported, ground-foot split squat.
- **Variant coverage:** A single id-only photo is not evidence for every equipment substitution. Unmatched variants need a variant-specific pair or a text-only guide. Cues and load notes must follow the selected setup.
- **Progression:** The progression calculation is conservative and structurally sound. It keys history by exercise, variant, unit and setup, and requires the full prescription, clean reps, target RIR and top-of-range reps before suggesting an increase. The accuracy risk is the selected visual/cue mapping, not the progression arithmetic.

## Implemented corrections

The current default is the seven-day sequence Upper / Lower / Rest / Chest + Back / Legs / Shoulders + Arms / Rest. `getExerciseGuide` resolves the selected variant, current rep prescription, cues and load convention. Photos appear only for audited exact matches, including explicit aliases for equivalent movements. Other variants have text guidance; the guide variation selector previews alternatives without changing the workout.

The final library has 37 exercises. New `bulgarian` keeps the rear-foot-elevated movement separate from legacy supported ground-foot `split` records and reuses the original split photos. New `pullup` offers bodyweight and weighted overhand choices. Six additional JPEGs from the same pinned source were visually checked: `flat-barbell-0/1.jpg`, `pullup-0/1.jpg` and `pullup-weighted-0/1.jpg`. There are now 76 movement JPEGs; the original audit receipt below still covers exactly 35 exercises and 70 files. See [asset sources](asset-sources.md) for the additions. Existing exercise IDs, variant order and numeric prescriptions remain available for saved records.

## Scope and method

The audit inspected the exercise definitions, visual map, guide loading path, state creation and progression code, plus every local exercise image. The relevant paths are:

- `assets/training-data.js`
- `assets/exercise-visuals.js`
- `assets/experience.js`
- `assets/training-state.js`
- `assets/images/exercises/<id>-0.jpg` and `<id>-1.jpg`

The source is [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) at the pinned tree [a859101d633a01c4a1a920d6a8ce41dabba0705f](https://github.com/yuhonas/free-exercise-db/tree/a859101d633a01c4a1a920d6a8ce41dabba0705f). The repository's [Unlicense notice](licenses/free-exercise-db.txt) is retained locally. For each row, both source paths `exercises/<sourceId>/0.jpg` and `exercises/<sourceId>/1.jpg` were resolved from the upstream tree. For each local file, the Git blob digest was calculated as `SHA1("blob <byte-count>" + NUL byte + file-bytes)` and compared to the upstream tree's blob SHA-1. The complete receipt is at the end of this document.

The visual review used paired contact sheets followed by selected original frames. It checked exercise identity, equipment, body position, and whether positions 0 and 1 form a useful start/end reference. The review found no wrong exercise pair; the issues below are about equipment or semantic naming and not image corruption.

The technique review was cross-checked against the [ACSM 2026 resistance-training guidance](https://acsm.org/resistance-training-guidelines-update-2026/), [ACE seated-row guidance](https://www.acefitness.org/resources/everyone/exercise-library/168/seated-row/), and [HSS split-squat guidance](https://www.hss.edu/health-library/move-better/anterior-chain-exercises). These sources support controlled ranges, individualized equipment choices, stable setups, and keeping a ground-foot split squat distinct from a rear-foot-elevated variation.

## Full 35-row matrix

`A` means the pair is movement-correct for the named pictured variation. `V` means the pair is valid but only for that pictured variant. `M` means the selected/default equipment can differ from the pair. `S` means the exercise meaning or setup differs. The first variant in each row is bold because `createDraft` initializes new entries with `variants[0]`.

| ID | Range; defined variants (first is default) | Pinned pair | Accuracy review | Required handling |
|---|---|---|---|---|
| `seated-row` | 8-12; **close neutral-grip cable row**, wide cable row | `Seated_Cable_Rows`; `seated-row-0/1.jpg` | A/V. Seated cable row is correctly represented; handle width is a setup choice. | Keep handle and seat in setup; do not imply the pair proves both grips. |
| `one-arm-row` | 8-15; **bench-supported dumbbell row** | `One-Arm_Dumbbell_Row`; `one-arm-row-0/1.jpg` | A. Hand/knee-supported, one-dumbbell row matches. | Keep one-dumbbell and per-arm logging. |
| `straight-arm` | 10-15; **straight-bar pulldown**, rope straight-arm pulldown | `Straight-Arm_Pulldown`; `straight-arm-0/1.jpg` | A/V. The pair is a straight-arm pulley movement; attachment alternatives are not identical. | Preserve attachment in setup and show a text guide or exact rope pair for the rope choice. |
| `shoulder-press` | 6-12; **seated dumbbell press**, shoulder-press machine | `Seated_Dumbbell_Press`; `shoulder-press-0/1.jpg` | A/V. Dumbbell default is pictured; machine is a different device. | Use a machine-specific cue and load convention or text-only guide. |
| `face-pull` | 12-20; **rope face pull** | `Face_Pull`; `face-pull-0/1.jpg` | A. Rope face pull and pulley height are represented. | Keep pulley height and rope setup in the guide. |
| `hammer` | 10-15; **dumbbell hammer curl**, rope cable hammer curl | `Hammer_Curls`; `hammer-0/1.jpg` | A/V. Dumbbell hammer curl is pictured; rope cable is a load/setup substitution. | Use a cable cue and stack load note for the rope variant. |
| `preacher` | 10-15; **EZ-bar preacher curl**, preacher-curl machine | `Preacher_Curl`; `preacher-0/1.jpg` | A/V. Preacher setup is correct; bar and machine are not interchangeable. | Preserve the chosen device and its load convention. |
| `pushdown` | 10-15; **rope pushdown**, straight-bar pushdown | `Triceps_Pushdown_-_Rope_Attachment`; `pushdown-0/1.jpg` | A/V. Rope attachment is pictured. | Use attachment-specific cueing and retain the stack load. |
| `lying-triceps` | 10-15; **lying EZ-bar extension**, lying dumbbell extension | `Lying_Triceps_Press`; `lying-triceps-0/1.jpg` | A/V. Bar version is pictured; dumbbells need separate handling. | Keep bar versus one-dumbbell load semantics. |
| `goblet` | 8-15; **kettlebell goblet squat**, dumbbell goblet squat | `Goblet_Squat`; `goblet-0/1.jpg` | A/V. Kettlebell is pictured; dumbbell is a close substitution. | Label the pictured kettlebell variation and log one held load. |
| `reverse-lunge` | 8-12; **dumbbell reverse lunge**, bodyweight reverse lunge | `Dumbbell_Rear_Lunge`; `reverse-lunge-0/1.jpg` | A/V. Rear-step lunge with dumbbells matches. | Keep reps per leg and one-dumbbell/bodyweight logging. |
| `hip-thrust` | 8-12; **barbell hip thrust**, hip-thrust machine | `Barbell_Hip_Thrust`; `hip-thrust-0/1.jpg` | A/V. Barbell hip thrust is pictured. | Use a machine-specific pad/belt cue and indicated-load note. |
| `lying-legcurl` | 10-15; **lying leg-curl machine** | `Lying_Leg_Curls`; `lying-legcurl-0/1.jpg` | A. Lying machine curl is represented. | Keep knee-pivot, roller and hip-pad setup cues. |
| `db-calves` | 10-20; **standing dumbbell calf raise**, standing bodyweight calf raise | `Standing_Dumbbell_Calf_Raise`; `db-calves-0/1.jpg` | A/V. Standing dumbbells are pictured. | Record one dumbbell or zero and note floor/step height. |
| `deadbug` | 8-15; **dead bug, arms held up** | `Dead_Bug`; `deadbug-0/1.jpg` | A. The leg-extension dead-bug variation is represented. | Keep the leg-only variation label and per-side rep convention. |
| `hanging-raise` | 8-15; **hanging knee raise**, hanging straight-leg raise | `Hanging_Leg_Raise`; `hanging-raise-0/1.jpg` | A/V. The pair shows the bent-knee variation; straight legs change the lever. | Use a separate straight-leg cue and do not let the photo imply both choices. |
| `flat` | 6-12; **flat dumbbell press**, barbell bench press, chest-press machine, flat Smith press | `Dumbbell_Bench_Press`; `flat-0/1.jpg` | A for dumbbells. M for the barbell choice used by the current five-day program; the pair does not show a bar. Machine and Smith are also distinct. | Map `barbell` to `Barbell_Bench_Press_-_Medium_Grip`; leave machine/Smith text-only until exact pairs are reviewed. |
| `fly` | 10-20; **cable chest fly**, pec deck, dumbbell fly | `Cable_Crossover`; `fly-0/1.jpg` | A/V. Cable crossover is pictured; pec deck and dumbbell fly use different setups. | Keep pulley height/bench angle or use variant-specific guidance. |
| `dips` | 6-15; **bodyweight dips**, weighted dips, assisted dip machine | `Dips_-_Chest_Version`; `dips-0/1.jpg` | A/V. Bodyweight chest-biased dip is pictured. | Explain added load versus assistance; do not compare assistance numbers as load. |
| `pushup` | 8-25; **floor push-up**, weighted, hands-elevated, feet-elevated | `Pushups`; `pushup-0/1.jpg` | A/V. Floor push-up is pictured; elevation changes difficulty and setup. | Keep hand/foot height in setup and show a text guide for alternatives. |
| `incline` | 6-10; **incline dumbbell press**, incline chest-press machine, low-incline Smith press | `Incline_Dumbbell_Press`; `incline-0/1.jpg` | A/V. Low-incline dumbbells are pictured. | Use machine/Smith bench-angle cues and indicated-load semantics. |
| `row` | 8-12; **chest-supported row machine**, chest-supported dumbbell row, seated cable row | `Dumbbell_Incline_Row`; `row-0/1.jpg` | M. The pair clearly shows an incline-bench dumbbell row, while `variants[0]` is a machine. The cable variant is seated and not chest-supported. | Make the DB mapping exact; use text-only or a machine pair for `machine`; use seated-row cues/source for `cable`, not chest-on-pad cues. |
| `pulldown` | 8-12; **neutral-grip lat pulldown**, medium overhand pulldown, single-arm cable pulldown | `V-Bar_Pulldown`; `pulldown-0/1.jpg` | A/V. V-bar/neutral pulldown is pictured; overhand and single-arm are substitutions. | Add single-arm setup and per-arm cueing; keep attachment in setup. |
| `lateral` | 12-20; **single-arm cable lateral raise**, dumbbell lateral raise, lateral-raise machine | `Side_Lateral_Raise`; `lateral-0/1.jpg` | M. The pair shows dumbbell side raises, while `variants[0]` is single-arm cable. | Keep `Side_Lateral_Raise` for DB; map cable to `Bent_Over_Low-Pulley_Side_Lateral` after the exact pair review; make machine load stack-based. |
| `rear` | 12-20; **reverse pec deck**, cable rear-delt fly, chest-supported rear-delt raise | `Reverse_Machine_Flyes`; `rear-0/1.jpg` | A/V. Reverse machine fly is pictured. | Keep the machine as the pictured default; use separate cable/DB cues. |
| `triceps` | 10-15; **overhead cable triceps extension**, rope pushdown | `Triceps_Overhead_Extension_with_Rope`; `triceps-0/1.jpg` | A/V. Overhead rope extension is pictured. | Do not show it for a pushdown choice; use pushdown guidance for that variant. |
| `curl` | 10-15; **dumbbell curl**, cable curl, preacher-curl machine | `Dumbbell_Bicep_Curl`; `curl-0/1.jpg` | A/V. Dumbbell curl is pictured. | Keep one-dumbbell semantics and separate cable/preacher setup. |
| `squat` | 6-10; **hack-squat machine**, Smith squat, high-bar squat | `Hack_Squat`; `squat-0/1.jpg` | A/V. Hack-squat machine is pictured. | Keep machine/barbell loads distinct and do not present this as a leg press. |
| `extension` | 10-15; **leg-extension machine**, single-leg extension | `Leg_Extensions`; `extension-0/1.jpg` | A/V. Machine leg extension is pictured; single-leg changes logging. | Preserve per-leg load/reps for the single-leg choice. |
| `rdl` | 6-10; **barbell Romanian deadlift**, dumbbell Romanian deadlift, Smith Romanian deadlift | `Romanian_Deadlift`; `rdl-0/1.jpg` | A/V. Romanian deadlift pattern is correct; bar/DB/Smith loads differ. | Add a Smith load convention before enabling that variant; keep one-dumbbell logging for DB. |
| `legcurl` | 10-15; **seated leg curl**, lying leg curl | `Seated_Leg_Curl`; `legcurl-0/1.jpg` | A for seated. Lying is a distinct pad orientation and is not represented by this pair. | Use the existing lying-legcurl pair or a text-only lying guide; cue thigh restraint versus lying hip contact. |
| `legpress` | 8-12; **45-degree leg press**, horizontal leg press, hack-squat machine | `Leg_Press`; `legpress-0/1.jpg` | A/V for the 45-degree sled. `hack` is a different exercise/machine from leg press. | Remove or split the hack choice; keep sled, horizontal and hack histories separate. |
| `split` | 8-12; **supported dumbbell split squat**, Smith split squat, dumbbell reverse lunge | `Split_Squat_with_Dumbbells`; `split-0/1.jpg` | S. Both positions are rear-foot-elevated/Bulgarian split squat, not the named supported ground-foot split squat. The lunge variant is also a different movement. | Rename/rehome the pair as rear-foot-elevated; keep the supported split row ground-foot; separate reverse-lunge cues and history. No exact supported pair was found in the pinned set. |
| `calves` | 10-15; **standing calf-raise machine**, seated calf raise, leg-press calf raise | `Standing_Calf_Raises`; `calves-0/1.jpg` | A/V for standing machine; seated and press choices have different joint/setup cues. | Keep machine/seat/platform in setup and show text or exact variants for alternatives. |
| `abs` | 10-15; **kneeling cable crunch**, ab-crunch machine, controlled reverse crunch | `Cable_Crunch`; `abs-0/1.jpg` | A/V for cable crunch. Machine and reverse crunch are different apparatus/movement constraints. | Use a machine cue and a pelvic-curl cue for reverse crunch; do not display the cable pair for them. |

## Findings that should govern implementation

1. **Resolve the chosen variant before selecting a photo.** The baseline guide call receives only an exercise id, while the logger stores `variantId`. A guide must receive the selected variant and prescription, then either select an exact pair or present a text guide. A default photo must never silently stand in for a different cable, machine, barbell or body-position choice.
2. **Keep legacy data identifiers and prescription bounds stable.** `findLastEntry` already separates history by `exerciseId`, `variantId`, unit and setup. Preserve existing variant IDs and rep ranges when correcting visuals or cues so saved backups continue to validate. If a semantic split is renamed, migrate the meaning deliberately rather than silently changing an old record.
3. **Fix load semantics with the visual.** The machine lateral raise should use an indicated stack or plate load, not the per-arm dumbbell note. Smith RDL needs an explicit bar/plate convention. One-dumbbell rows, curls, calf raises and unilateral work need their existing one-side/per-leg wording preserved.
4. **Separate movements that are not substitutions.** `legpress:hack` is a hack squat, `split:lunge` is a reverse lunge, and `split`'s current pair is Bulgarian/rear-foot-elevated. These should not share names, photos or comparison history with the base movement.
5. **Use exact mappings only where reviewed.** The reviewed exact set is intentionally small. An available Free Exercise DB image is not proof that it demonstrates every listed variation. Unreviewed variants should get text-only guidance until both equipment and movement meaning are confirmed.

## Candidate sources and decision status

All candidate IDs below are from the same pinned upstream tree. The SHA-1 values are upstream Git blob values for positions 0 and 1; they are source candidates, not permission to use an unreviewed visual.

| Candidate source | Intended use | Evidence / decision |
|---|---|---|
| `Barbell_Bench_Press_-_Medium_Grip` | `flat:barbell` for the current five-day program barbell bench press | Exact barbell bench pair. Upstream positions: `49a8dba6ec14ce69e0e389d8b958be81c0cdcb73` / `a110861372a2ad345f0fca23be4fd10023c7682f`. Approved candidate after the pair review; preserve the existing DB pair for `flat:db`. |
| `Bent_Over_Low-Pulley_Side_Lateral` | `lateral:cable` | Exact one-arm low-pulley side-lateral setup. Upstream positions: `fbbae3a390bcae24d84646c787b4a52421df4362` / `dd96033739c2a23ae3e39255f66e4c6c2d51545b`. Approved candidate after the pair review; keep `Side_Lateral_Raise` for DB. |
| `Split_Squats` | Possible ground-foot split-squat replacement | Candidate only. It requires a fresh frame review against the supported ground-foot definition; do not call it an exact match from the name alone. |
| `Smith_Single-Leg_Split_Squat` | `split:smith` only | Smith-specific candidate; it cannot repair the supported dumbbell row or stand in for a reverse lunge. |
| `Machine_Bench_Press` / `Leverage_Chest_Press` | Possible `flat:machine` | Candidates only. Machine geometry, seat and handle path require a separate visual review before mapping. |

## Progression and safety notes

The current progression rule is suitable for a conservative journal: it holds the load until the full prescribed set count is complete, every set is marked clean, every set meets the target RIR, and every set reaches the top of the rep range. Lighter sessions and assisted dips are handled as hold conditions. This audit does not recommend changing that math. It recommends ensuring that the selected variant, cue, load note and photo all describe the same movement before the logger compares performance.

The movement guidance should continue to emphasize a controlled, tolerable range, stable equipment and a qualified coach for an unfamiliar variation. The sources above are technique references for the audit; they do not replace individualized medical or coaching advice.

## 70/70 provenance receipt

The table lists the local pair as `<id>-0.jpg` / `<id>-1.jpg`. Each listed digest is both the local Git blob SHA-1 and the matching upstream tree SHA-1. `bytes` is the upstream file size. Result `PASS` means both positions matched; 35 rows therefore account for all 70 checked files.

| Local id | Upstream source ID | SHA-1 position 0 / position 1 | Bytes 0 / 1 | Result |
|---|---|---|---:|---|
| `abs-0.jpg` / `abs-1.jpg` | `Cable_Crunch` | `427160f42537c132aa54e1c9fbaef800d09c8938` / `3aff24f5c8b5e3f03fe8afae43ea8b2248489494` | 67271 / 65445 | PASS |
| `calves-0.jpg` / `calves-1.jpg` | `Standing_Calf_Raises` | `d5754c190ff1d941701ae467b1f2ea71156e753c` / `3382bf7ebf8a7bbd442c939fbf543372dd338665` | 60966 / 59984 | PASS |
| `curl-0.jpg` / `curl-1.jpg` | `Dumbbell_Bicep_Curl` | `fb8ffe28ad37e4c428c6ee16800b1b0b1b563582` / `6dd842f6d5986f384c1e56bf5df2c625ff2c19c5` | 57223 / 58066 | PASS |
| `db-calves-0.jpg` / `db-calves-1.jpg` | `Standing_Dumbbell_Calf_Raise` | `1d35a604467e79868422695df237684457df19ef` / `f44e24bde109196cdbf7a91f65732c9ca3ab36ac` | 54681 / 54554 | PASS |
| `deadbug-0.jpg` / `deadbug-1.jpg` | `Dead_Bug` | `7394c06f0c5d1ce95e0b17c76fd860be7d650cf9` / `378267444da26264a8c92cc1276ff8d158df4934` | 45381 / 46759 | PASS |
| `dips-0.jpg` / `dips-1.jpg` | `Dips_-_Chest_Version` | `5c0818b478ca5d227671e35d5736e2c0284f5509` / `5ed9378ddaec0588964beafc81595d41cef33476` | 73206 / 72525 | PASS |
| `extension-0.jpg` / `extension-1.jpg` | `Leg_Extensions` | `08fe62d76944e92da001c50db410beca8c8436e1` / `4569c4bb672b61341818b19a6626371a8a64be19` | 81219 / 82758 | PASS |
| `face-pull-0.jpg` / `face-pull-1.jpg` | `Face_Pull` | `cae681107b80b353eb942530383cd992806b7ff5` / `776eda013dd18ef2e9e5f38c13666a265a34b0fc` | 40188 / 46451 | PASS |
| `flat-0.jpg` / `flat-1.jpg` | `Dumbbell_Bench_Press` | `0bfa9b9d36e0e8e19e18a00b2fba79a28ddcf170` / `82acccb8087c0ad688787433cb2c145fa5e00008` | 63319 / 64120 | PASS |
| `fly-0.jpg` / `fly-1.jpg` | `Cable_Crossover` | `44766411bce0584db4d5e7c999415d3a420af669` / `b1083f1a206c665355a9b7e0ee8c4ef2ed143afd` | 74524 / 76451 | PASS |
| `goblet-0.jpg` / `goblet-1.jpg` | `Goblet_Squat` | `ac8710fb817b650ee1093cccbf7f28b76cb5d80c` / `7c310cb6b6490f03fc6527db72b69a119cac621a` | 34299 / 34362 | PASS |
| `hammer-0.jpg` / `hammer-1.jpg` | `Hammer_Curls` | `2342fe677a49e0f1226ad62c0c079b31e265fc69` / `93c1b13a0a747b3bb135ec883df144da6a781848` | 51669 / 52323 | PASS |
| `hanging-raise-0.jpg` / `hanging-raise-1.jpg` | `Hanging_Leg_Raise` | `8cca3bfde2b68fe2392caccdf9266329fddd6abc` / `2eaba2aa15aa11e1f9e9b9bd4be1b0d496e27425` | 51687 / 56061 | PASS |
| `hip-thrust-0.jpg` / `hip-thrust-1.jpg` | `Barbell_Hip_Thrust` | `a78947412c7af5ad293c59a730eda7edd3cf7f7f` / `ac7959c1c8d58fc4b41755701a7746a44d1de42c` | 53764 / 52252 | PASS |
| `incline-0.jpg` / `incline-1.jpg` | `Incline_Dumbbell_Press` | `0db3b900ab085df25a872bbaf01cb464970b9986` / `df2a40967b97ead4a379a4ec07f7a81070d5c394` | 61978 / 61629 | PASS |
| `lateral-0.jpg` / `lateral-1.jpg` | `Side_Lateral_Raise` | `117bd50e4f097bf151707a432b1f8ec73e3dce4a` / `7a14f69e2183af894ca8932da52a85f97813c179` | 57101 / 56355 | PASS |
| `legcurl-0.jpg` / `legcurl-1.jpg` | `Seated_Leg_Curl` | `9edb5e2e2fccdb00545da1f709abc0f6848ca4d6` / `12ce8cbb4d89e7fcc6bab9cee7dc63a559555ec2` | 91213 / 91286 | PASS |
| `legpress-0.jpg` / `legpress-1.jpg` | `Leg_Press` | `14ae77c48fa89f82d2771e828e6804ec86c2aeb3` / `d08f6de4cafbfe760490d18e295ef14cf5497941` | 84753 / 83900 | PASS |
| `lying-legcurl-0.jpg` / `lying-legcurl-1.jpg` | `Lying_Leg_Curls` | `7d2666805ddcbfd266cd6cf40e2932abb7931979` / `cf22292deb0bbb6274f0fb038dc7b32badab210e` | 77402 / 87755 | PASS |
| `lying-triceps-0.jpg` / `lying-triceps-1.jpg` | `Lying_Triceps_Press` | `3711f2b4872e6cc4afd446445395a14e33b16dea` / `11df289d469d5a6013fddd4cd03da689439f82da` | 52086 / 50140 | PASS |
| `one-arm-row-0.jpg` / `one-arm-row-1.jpg` | `One-Arm_Dumbbell_Row` | `0223e8e7bc327218763997cad177e011f4199aa2` / `6b1655d9dc0f12c368e01e45a9cc92a9d8bc4274` | 70752 / 71407 | PASS |
| `preacher-0.jpg` / `preacher-1.jpg` | `Preacher_Curl` | `ceb89f0e7112f2258b0499e370403ff1267bb297` / `8e0085fa1dbc931553bac0fdbdf1af0465a4e8f0` | 59261 / 59522 | PASS |
| `pulldown-0.jpg` / `pulldown-1.jpg` | `V-Bar_Pulldown` | `5db2049ff91ca4f6fb58919eb67b19fdd461b668` / `4dd15e573207543c73b8d1eac283b553d3d5fdf4` | 65637 / 66946 | PASS |
| `pushdown-0.jpg` / `pushdown-1.jpg` | `Triceps_Pushdown_-_Rope_Attachment` | `90da34b809bf09030216672343ba916983ec675c` / `df42e5afd6e62d7f2581a6c9850ec14c12aae3a9` | 88082 / 86992 | PASS |
| `pushup-0.jpg` / `pushup-1.jpg` | `Pushups` | `c14d9239f6fae36347e7dd98cd0e33a05cd649ee` / `7f486a987af7176be698a18f55ce3c01495f6b9b` | 66786 / 64283 | PASS |
| `rdl-0.jpg` / `rdl-1.jpg` | `Romanian_Deadlift` | `cf754aaf92ba67cd8c71b4f94691e807dd04d736` / `6fb4934322ae0bcf79df5b730eea16ba90928621` | 59859 / 57367 | PASS |
| `rear-0.jpg` / `rear-1.jpg` | `Reverse_Machine_Flyes` | `e8957703c777248bbf4b6dafc8ffdc129490eb32` / `46a569d47560ea5b7d0b10443bae3c703883694b` | 77240 / 77689 | PASS |
| `reverse-lunge-0.jpg` / `reverse-lunge-1.jpg` | `Dumbbell_Rear_Lunge` | `4e7b4664d232a3546849edc928d6d3938d655d63` / `4cbf7fffadec0798e050b6188188324efcc9be0a` | 51169 / 49129 | PASS |
| `row-0.jpg` / `row-1.jpg` | `Dumbbell_Incline_Row` | `b63f077c9d77a3d44929fa7f53e88c3fda5d3b7c` / `d905c7dd7489d0965909dd5beab9036f3ec37c7b` | 98338 / 99049 | PASS |
| `seated-row-0.jpg` / `seated-row-1.jpg` | `Seated_Cable_Rows` | `9ff5efa95822d8a2e296b95745e478ddf58ea7bb` / `ec94cdb0133e281e7b73d184e1368af5dfef19f8` | 65319 / 65659 | PASS |
| `shoulder-press-0.jpg` / `shoulder-press-1.jpg` | `Seated_Dumbbell_Press` | `8d041f4e07e08f1e80d0ae203598b83353022239` / `e19c74b99306be4b9a5ec8290c809338f1fe5493` | 60972 / 61379 | PASS |
| `split-0.jpg` / `split-1.jpg` | `Split_Squat_with_Dumbbells` | `eb80a62fe9c4e96a17e809a7bb9224db7c727ae6` / `7479f146273fbd301f7c4b5591f0853788c1003b` | 136429 / 143547 | PASS |
| `squat-0.jpg` / `squat-1.jpg` | `Hack_Squat` | `e34a8af3ef66057c4a79e57843d92b289c755da9` / `84d47439bb86eec43368eb105e84ff85dbe0b325` | 114305 / 106734 | PASS |
| `straight-arm-0.jpg` / `straight-arm-1.jpg` | `Straight-Arm_Pulldown` | `decf71160764ded7228bb2d998e478437f6e9815` / `893ed0700284ee026b2c22dd3f97626e9b2a0b2a` | 66022 / 67261 | PASS |
| `triceps-0.jpg` / `triceps-1.jpg` | `Triceps_Overhead_Extension_with_Rope` | `41d82e5c05103e771061bff3641f8b383ed65411` / `32f7602b2d5099aaa15972624bb654ce0c3e09ec` | 65236 / 66144 | PASS |

Verification command used for the receipt: fetch the pinned GitHub tree, resolve each `exercises/<sourceId>/<0|1>.jpg` blob, calculate the local Git blob SHA-1 with the byte-count header, and compare the two values. The resulting counts were `checked=70 mismatches=0`; no file was changed by this audit.
