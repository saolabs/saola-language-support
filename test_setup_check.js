const assert = require('node:assert/strict');
const { checkSetup, buildVirtual } = require('./out/setupCheck.js');

const sao = (script) => `<template><div>{{ count }}</div></template>\n<script setup lang="ts">\n${script}\n</script>\n`;
const msgs = (src) => checkSetup(src).map(d => `${d.code}:${src.slice(d.start, d.start + d.length)}`);

// Sạch: dùng đủ biến hệ thống, setter, computed, destructuring.
assert.deepEqual(msgs(sao(`
@props({initial = 0, title = 'x'}: {initial: number; title: string})
@let(cardPath: string = __base__ + 'modules.components.statcard')
@importView(cardPath as StatCard)
@asset(logo = 'images/logo.svg')
@state(count: number = initial, status: string = '')
@computed(doubled: number = count * 2)
@const([a, setA] = useState(0))
function increment() { setCount(count + 1); setStatus(title); $view.emit('x', __module__); }
`)), []);

// Sai kiểu default → chỉ vào đúng literal.
assert.deepEqual(msgs(sao(`@props({initial = 'oops'}: {initial: number})`)), ["2322:initial"]);

// Biến chưa khai báo → chỉ vào đúng tên.
assert.deepEqual(msgs(sao(`@state(count: number = 0)\nfunction f() { return cnt + 1; }`)), ["2304:cnt"]);

// Setter nhận đúng kiểu của state.
assert.deepEqual(msgs(sao(`@states({count = 0}: {count: number})\nfunction f() { setCount('a'); }`)), ["2345:'a'"]);

// Dạng cũ {a: 1} — không kiểm kiểu, nhưng vẫn khai tên nên không báo bừa.
assert.deepEqual(msgs(sao(`@props({initial: 0}: {initial: number})\n@states({ rows: [] })\nfunction f() { setRows([initial]); }`)), []);

// Import không resolve được không phải lỗi của người viết.
assert.deepEqual(msgs(sao(`import type { G } from '@web/app/x';\n@state(g: G = null)`)), []);

// Không có <script setup> → im lặng.
assert.deepEqual(checkSetup('<template><div></div></template>'), []);
console.log('setup check: all checks passed');

for (const flag of ['@useAuth','@useAuth()','@useauth','@useauth()']) {
    assert.deepEqual(msgs(sao(`${flag}\n@middleware(['requireLogin', 'profile:complete'])\nfunction clear(){set__auth__(null);return __auth__}`)), []);
}
const examples = sao('const example = `demo\n@useAuth()\n@middleware("example")\n`;\nfunction f(){return __auth__}');
assert.ok(msgs(examples).includes('2304:__auth__'), 'literal @useAuth cannot introduce a real binding');
const metadataTypo = sao('@middleware("requireLogin")\n@useAuth\nfunction f(){return unknownName}');
assert.ok(msgs(metadataTypo).includes('2304:unknownName'), 'diagnostic offsets survive metadata masking');
