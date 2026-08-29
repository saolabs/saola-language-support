// Self-check for view path resolution: node test_viewpath.js  (run `npm run compile` first)
const assert = require('assert');
const { splitViewPath, pickBestCandidate } = require('./out/viewPath');

const files = [
  '/app/resources/saola/web/views/layouts/base.sao',
  '/app/resources/saola/web/views/modules/demo/base.sao',
  '/app/resources/saola/web/views/modules/demo/featurecard.sao',
  '/app/resources/saola/web/views/modules/home/parts/hero.sao',
  '/app/resources/saola/admin/views/modules/home/parts/hero.sao',
];

// @import('web.modules.demo.featurecard') — dotted path, base prefix not on disk
let v = splitViewPath('web.modules.demo.featurecard');
assert.deepStrictEqual(v, { dirs: ['web', 'modules', 'demo'], name: 'featurecard' });
assert.strictEqual(
  pickBestCandidate(files.filter(f => f.endsWith('featurecard.sao')), v.dirs, ''),
  '/app/resources/saola/web/views/modules/demo/featurecard.sao'
);

// @extends(__layout__ + 'base') — alias breaks the tie between two base.sao
v = splitViewPath('base');
assert.strictEqual(
  pickBestCandidate(files.filter(f => f.endsWith('base.sao')), v.dirs, 'layouts'),
  '/app/resources/saola/web/views/layouts/base.sao'
);

// @include('web.modules.home.parts.hero') — the `web` root prefix beats the admin twin
// (both share the same trailing run, so the reversed order must not change the pick)
v = splitViewPath('web.modules.home.parts.hero');
const heroes = files.filter(f => f.endsWith('hero.sao'));
assert.strictEqual(
  pickBestCandidate(heroes, v.dirs, ''),
  '/app/resources/saola/web/views/modules/home/parts/hero.sao'
);
assert.strictEqual(
  pickBestCandidate([...heroes].reverse(), v.dirs, ''),
  '/app/resources/saola/web/views/modules/home/parts/hero.sao'
);

// Nothing matches → still returns a candidate rather than nothing
assert.strictEqual(pickBestCandidate([], ['a'], ''), undefined);

console.log('viewPath OK');
