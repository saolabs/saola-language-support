const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

/**
 * Ba nguồn khai tên directive viết trên thẻ phải khớp nhau TUYỆT ĐỐI:
 *
 *   1. compiler  — `Html::TAG_DIRECTIVES` (nguồn sự thật)
 *   2. grammar   — tập tên trong `sao-injection.tmLanguage.json`
 *   3. snippets  — các snippet có prefix `#…`
 *
 * Lệch một tên là hỏng câm theo ba kiểu khác nhau: grammar thiếu thì directive
 * hợp lệ không được tô; grammar dư thì `#fff` trong `style="color: #fff"` sáng
 * lên như directive; snippet dư thì người dùng được gợi ý một thứ mà compiler
 * từ chối biên dịch.
 *
 * Cùng lớp lỗi với bảng shortcut marker giữa client và server — thứ mà repo
 * này đã phải học bằng cách trả giá.
 */
function fromCompiler() {
    const src = fs.readFileSync(path.join(__dirname, '../compiler/src/Support/Html.php'), 'utf8');
    const block = /private const TAG_DIRECTIVES = \[(.*?)\];/s.exec(src);
    assert.ok(block, 'không tìm thấy TAG_DIRECTIVES trong Html.php');
    return new Set([...block[1].matchAll(/'([a-z]+)'\s*=>/g)].map(m => m[1]));
}

function fromGrammar() {
    const g = JSON.parse(fs.readFileSync(path.join(__dirname, 'syntaxes/sao-injection.tmLanguage.json'), 'utf8'));
    const names = new Set();
    for (const p of g.patterns) {
        const rx = p.begin || p.match || '';
        const group = /\(#\(\?:([a-z|]+)\)\)/.exec(rx);
        if (group) group[1].split('|').forEach(n => names.add(n));
    }
    assert.ok(names.size > 0, 'grammar không khai tên directive nào');
    return names;
}

function fromSnippets() {
    const s = JSON.parse(fs.readFileSync(path.join(__dirname, 'snippets/sao.json'), 'utf8'));
    const names = new Set();
    for (const v of Object.values(s)) {
        const p = v.prefix;
        if (typeof p === 'string' && p.startsWith('#')) names.add(p.slice(1));
    }
    assert.ok(names.size > 0, 'không có snippet nào cho directive trên thẻ');
    return names;
}

const sorted = set => [...set].sort();
const compiler = fromCompiler();
const grammar = fromGrammar();
const snippets = fromSnippets();

assert.deepEqual(sorted(grammar), sorted(compiler), 'grammar lệch compiler');
assert.deepEqual(sorted(snippets), sorted(compiler), 'snippets lệch compiler');

// Prefix trùng nhau thì cái sau che cái trước, im lặng.
const all = Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, 'snippets/sao.json'), 'utf8')))
    .flatMap(v => (Array.isArray(v.prefix) ? v.prefix : [v.prefix]));
const dup = all.filter((p, i) => all.indexOf(p) !== i);
assert.deepEqual(dup, [], `prefix snippet trùng: ${dup.join(', ')}`);

console.log(`tag directives: compiler/grammar/snippets khớp nhau (${sorted(compiler).join(' ')})`);
console.log(`snippets: ${all.length} prefix, không trùng`);
