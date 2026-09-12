const assert = require('node:assert/strict');
const { checkTemplate, viewScope } = require('./out/setupCheck.js');

const hits = (src) => checkTemplate(src).map(d => src.slice(d.start, d.start + d.length));

const view = `
@props({ title: 'x', items: [] })
<script setup lang="ts">
@state(count: number = 0)
@computed(doubled: number = count * 2)
function bump(step: number) { setCount(count + step); }
export default { legacy() {} };
</script>
<template>
    @extends(__layout__ + 'lab')
    @let(local = items.length)
    <h1 :title="title" @click(bump(1))>{{ title }} {{ doubled }} {{ local }}</h1>
    @foreach(items as row)
        <Card :row="row" @edit((id, {tag}) => bump(id)) @pick(emit) @on('x', $view.emit) />
        @include(__component__ + 'x', {row, label: row['name'], n: loop.index})
        <p @class({'on': row.active, 'off'})>{{ \`n=\${row.n}\` }} {{ Math.max(count, 1) }}</p>
    @endforeach
    @for(i = 0; i < count; i++)<i>{{ i }}</i>@endfor
    <button @click(legacy) @dblclick(setCount(event.target.value))>x</button>
</template>`;
assert.deepEqual(hits(view), []);

// Từng vị trí: {{ }}, @if, :attr, đối số handler, @include value, {!! !!}
assert.deepEqual(hits(view.replace('{{ title }}', '{{ nope1 }}').replace('@click(bump(1))', '@click(bump(nope2))')
  .replace(':title="title"', ':title="nope3"').replace("label: row['name']", 'label: nope4')
  .replace('{{ local }}', '@if(nope5 > 1){!! nope6 !!}@endif')).sort(), ['nope1', 'nope2', 'nope3', 'nope4', 'nope5', 'nope6']);

// Không báo: khoá object, thuộc tính, tên hàm gọi (helper), chuỗi, comment Blade, @verbatim, <script> thường
assert.deepEqual(hits(`@vars(x)<template>{{ fmt(x.y.z) }}{{ {k: 1}.k }}{{-- {{ ghost }} --}}@verbatim{{ ghost2 }}@endverbatim<script>ghost3</script>{{ 'ghost4' }}</template>`), []);

// Scope gộp đủ: closure, khai báo ngoài/trong script, setter, get$, method legacy
const scope = viewScope(view);
for (const n of ['__layout__', '$view', 'title', 'items', 'count', 'setCount', 'doubled', 'get$doubled', 'bump', 'legacy']) { assert.ok(scope.has(n), n); }
console.log('template check: all checks passed');
