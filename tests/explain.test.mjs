import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { EXPLAIN } from '../app/explain.js';
import { why } from '../app/ui.js';
import { plate, hasPlate } from '../app/plates.js';
import { RECIPES } from '../app/data/recipes.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const walk = dir => readdirSync(join(root, dir)).flatMap(name => { const path = `${dir}/${name}`; return statSync(join(root, path)).isDirectory() ? walk(path) : [path]; });
const appJs = walk('app').filter(file => file.endsWith('.js'));

test('every "i" button names an explanation that exists', () => {
  const missing = [];
  for (const file of appJs) {
    for (const match of readFileSync(join(root, file), 'utf8').matchAll(/\bwhy\(\s*'([\w-]+)'/g)) {
      if (match[1] !== 'text' && !Object.hasOwn(EXPLAIN, match[1])) missing.push(`${file}: ${match[1]}`);
    }
  }
  assert.deepEqual(missing, []);
});

test('every explanation is used, has a title and says something', () => {
  const used = new Set(appJs.flatMap(file => [...readFileSync(join(root, file), 'utf8').matchAll(/\bwhy\(\s*'([\w-]+)'/g)].map(match => match[1])));
  for (const [id, entry] of Object.entries(EXPLAIN)) {
    assert.ok(used.has(id), `${id}: never opened from a screen`);
    assert.ok(typeof entry.title === 'string' && entry.title.length > 2, `${id}: title`);
    assert.ok(Array.isArray(entry.blocks) && entry.blocks.length >= 1, `${id}: blocks`);
    for (const block of entry.blocks) {
      const text = Array.isArray(block) ? block.join(' ') : block;
      assert.ok(typeof text === 'string' && text.length > 20, `${id}: an empty block`);
      assert.ok(!text.includes('—'), `${id}: em dash`);
    }
    if (entry.pic) assert.ok(statSync(join(root, entry.pic)).isFile(), `${id}: missing picture ${entry.pic}`);
  }
});

test('an "i" button carries its text safely and always has an accessible name', () => {
  const plain = String(why('rir'));
  assert.match(plain, /data-explain="rir"/);
  assert.match(plain, /aria-label="What this means"/);
  const adhoc = String(why('text', 'Log as: "one" <b>', { title: 'A "quoted" title', body: 'Line one.\nLine <two> & "three".' }));
  assert.match(adhoc, /data-explain="text"/);
  assert.ok(!/<b>|<two>/.test(adhoc), 'markup in labels and bodies is escaped');
  assert.match(adhoc, /data-body="Line one\.\nLine &lt;two&gt; &amp; &quot;three&quot;\."/);
  assert.match(adhoc, /aria-label="Log as: &quot;one&quot; &lt;b&gt;"/);
});

test('each dish without a photograph has a drawn plate, and no other recipe does', () => {
  const unpictured = RECIPES.filter(recipe => !recipe.photo).map(recipe => recipe.id).sort();
  assert.deepEqual(unpictured, ['beef-sweet-potato-bowl', 'pita-box']);
  for (const recipe of RECIPES) assert.equal(hasPlate(recipe.id), !recipe.photo, recipe.id);
  for (const id of unpictured) {
    const svg = plate(id);
    assert.match(svg, /^<svg viewBox="0 0 240 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true"/, id);
    assert.ok(svg.length > 2000, `${id}: drawing looks empty`);
    assert.ok(!/NaN|undefined|Infinity/.test(svg), `${id}: bad number in the drawing`);
    assert.equal(plate(id), svg, `${id}: the same drawing every time`);
  }
  assert.equal(plate('butter-chicken'), '');
});
