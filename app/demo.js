// Lift demos. Every audited lift has two photographs, start and finish. Shown one over the other
// and crossfaded, they read as a short loop. A lift with no audited photo gets a plain tile, never a
// picture of a different setup.

import { html, icon } from './ui.js';
import { getExerciseGuide } from '../assets/exercise-visuals.js';

const PATH = 'assets/images/exercises';

/** The photo id for a movement and variation, or null when there is no audited match. */
export const photoId = (exerciseId, variantId) => getExerciseGuide(exerciseId, variantId)?.visual?.imageId ?? null;

/**
 * A demo tile. `still` shows the start position only (lists and thumbnails); otherwise the two
 * photographs loop. Decorative: the movement's name is always printed beside it.
 */
export function demo(exerciseId, variantId, { cls = '', still = false, badge = false, eager = false } = {}) {
  const id = photoId(exerciseId, variantId);
  if (!id) return html`<span class="demo demo--blank ${cls}" aria-hidden="true">${icon('dumbbell')}</span>`;
  const load = eager ? 'eager' : 'lazy';
  return html`<span class="demo ${still ? 'demo--still' : ''} ${cls}" aria-hidden="true"><img src="${PATH}/${id}-0.jpg" alt="" loading="${load}" decoding="async">${still ? '' : html`<img src="${PATH}/${id}-1.jpg" alt="" loading="${load}" decoding="async">`}${badge && !still ? html`<span class="demo__badge"><i></i>Demo</span>` : ''}</span>`;
}

/** Up to `count` start photographs side by side, for a plan or session card. */
export function collage(rows, count = 3) {
  const ids = [];
  for (const row of rows) {
    const id = photoId(row.exerciseId, row.variantId);
    if (id && !ids.includes(id)) ids.push(id);
    if (ids.length === count) break;
  }
  return ids.map(id => html`<img src="${PATH}/${id}-0.jpg" alt="" loading="lazy" decoding="async">`);
}
