# Visual assets

## Interface icons and component references

`assets/icons.svg` contains 41 Lucide symbols from revision `94e4cb9d9db5907053ebf3636a97c45529cf776b` of [lucide-icons/lucide](https://github.com/lucide-icons/lucide). Original path geometry is combined into a local sprite; the upstream ISC and Feather MIT notices are retained in [licenses/lucide.txt](licenses/lucide.txt). No icon service or external font is requested at runtime.

Component inspiration: [Aceternity floating dock](https://ui.aceternity.com/components/floating-dock), [card hover effect](https://ui.aceternity.com/components/card-hover-effect), [bento grid](https://ui.aceternity.com/components/bento-grid), [Magic UI border beam](https://magicui.design/docs/components/border-beam), and [shadcn calendar](https://ui.shadcn.com/docs/components/base/calendar). These informed navigation depth, card feedback and date selection. The application uses its own CSS and native JavaScript implementations; no component-library code, framework or runtime dependency was added.

The app ships all artwork locally. No third-party image requests are made while using it.

## Original editorial artwork

Created with the built-in GPT image-generation tool on September 6, 2026. Final PNG outputs were encoded as JPEGs for delivery; the originals remain outside the repository. Food photos are serving inspiration, not exact portion or ingredient references. The SVG viewports in `meal-visuals.js` crop the contact sheets without stretching the photographs.

- `assets/images/training-editorial.jpg`: athletic adult in a cobalt training shirt preparing a dumbbell in a sunlit gym; wide composition with ink-blue negative space for the workout action.
- `assets/images/meal-editorial.jpg`: six photographs covering a breakfast shake, yogurt bowl, chicken rice bowl, chicken pasta, chicken with potatoes, and chicken wrap. The unused pasta tile is not presented as a recipe.
- `assets/images/snack-editorial.jpg`: six photographs covering milk/eggs/raisins, egg/raisins/honey, banana yogurt/milk, overnight oats, banana oat pancakes, and peanut butter/raisins/honey.

### Final prompts

Training: “Use case: photorealistic-natural. Create an editorial fitness photograph for a premium personal strength-training and meal app called Form & Fuel. Landscape 3:2. Close side view of an athletic adult man in a muted cobalt blue training shirt, preparing a heavy dumbbell on a bench in a bright architect-designed gym. Head may be cropped above mouth, focus on hands gripping ONE anatomically believable dumbbell and upper torso, purposeful quiet real workout moment, natural muscle proportions. Subject occupies right two thirds, left third shows deep ink-blue shadowed empty gym for white interface typography to be added later. Sunlit steel, cool periwinkle blue and warm skin, rich shadows, slight film grain, premium sports editorial, realistic tactile materials. No text, no logos, no UI, no watermarks. Composition should work cropped to landscape 2:1 or square.”

Meals: “Use case: photorealistic-natural. Asset: six-tile food photography contact sheet for a nutrition app; exact 3 columns by 2 rows with six equally sized rectangular photographs and NO GAPS, NO borders, NO text. Landscape 1536x1024 overall. Every tile composed overhead with entire meal contained within its own tile, neutral pale stone table. Top left: creamy oat banana protein smoothie in clear glass with oats and banana beside it. Top middle: bowl of Greek yogurt with blueberries, strawberries and granola. Top right: appetizing grilled chicken rice bowl with broccoli and colourful peppers. Bottom left: glossy tomato chicken pasta in shallow white bowl. Bottom middle: golden roast potato wedges, chicken breast pieces and green vegetables on a ceramic plate. Bottom right: rolled chicken flatbread wrap with crisp lettuce and tomato cut in two, next to hummus. Cohesive premium cookbook photography, bright soft window light, detailed natural food texture, understated styling, realistic food, delicious but practical everyday meals, no branding. The six images must have straight shared boundaries at exactly one third and two thirds width and half height. All meals centered in their respective tile.”

Snacks: “Use case photorealistic-natural. Asset: six-tile food photography contact sheet for a personal nutrition app. Exact 3 columns by 2 rows with six equally sized rectangular photographs and NO GAPS, NO borders, NO text. Landscape 1536x1024 overall. Every tile composed overhead with whole meal inside its own tile, soft pale stone table, dishes fully within each tile. Top left: clear glass of milk beside three peeled hard boiled eggs and small pile of dark raisins in a white dish. Top middle: one boiled egg halved beside raisins and a small dish of honey. Top right: plain Greek yogurt in ceramic bowl topped with banana slices, glass of milk beside it. Bottom left: overnight rolled oats with banana slices and a spoonful of peanut butter in a small glass jar. Bottom middle: golden banana oat pancakes in a small stack, banana slices beside them, no berries or extras. Bottom right: creamy peanut butter, dark raisins and drizzle of honey in a small white snack bowl. Cohesive premium cookbook photography, bright soft window light, realistic tactile food texture, understated styling, practical meals. No branding, no labels. Straight shared boundaries at exactly thirds of width and half height. All meals centered within their tile.”

## Movement demonstrations

Thirty-eight unmodified JPEGs under `assets/images/exercises/` come from [Free Exercise DB](https://github.com/yuhonas/free-exercise-db), which describes its data and imagery as public domain. The upstream [Unlicense](https://github.com/yuhonas/free-exercise-db/blob/a859101d633a01c4a1a920d6a8ce41dabba0705f/LICENSE.md) is retained in `docs/licenses/free-exercise-db.txt`.

Pinned source revision: `a859101d633a01c4a1a920d6a8ce41dabba0705f`.

`assets/exercise-visuals.js` maps each app exercise to its exact upstream exercise ID and name. Source paths are `exercises/<sourceId>/0.jpg` and `exercises/<sourceId>/1.jpg`. The guide names the variation pictured; chest-supported rows and lateral raises use dumbbell variations. Two-position playback alternates the original photos; it is not continuous video. Existing app coaching and programming remain authoritative for this plan.

The double-f app icon was generated with GPT image generation and resized to 192 and 512 pixels. The layout and rep demonstration use local HTML/CSS/SVG. System fonts avoid external requests and font downloads.

Icon final edit prompt: “Preserve the elegant overlapping white and lavender double-f symbol. Replace the background with solid ink navy #202941 to the square edges. Keep the symbol fully visible and centered with 15% safe margins. Flat clean vector-like edges. No text, extra border, rounded outer corners, shadow or grain. Opaque background.”
