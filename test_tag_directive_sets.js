const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Snippets cover the compiler built-ins. The grammar accepts any quoted
// directive name in attribute position and explicitly lists valueless built-ins.
function fromCompiler() {
    const src = fs.readFileSync(path.join(__dirname, '../compiler/src/Support/Html.php'), 'utf8');
    const block = /private const TAG_DIRECTIVES = \[(.*?)\];/s.exec(src);
    assert.ok(block, 'không tìm thấy TAG_DIRECTIVES trong Html.php');
    return new Map([...block[1].matchAll(/'([a-z]+)'\s*=>\s*(true|false)/g)].map(m => [m[1], m[2] === 'true']));
}

function fromGrammar() {
    const g = JSON.parse(fs.readFileSync(path.join(__dirname, 'syntaxes/sao.tmLanguage.json'), 'utf8'));
    const names = new Set();
    for (const p of g.repository['tag-directives'].patterns) {
        const rx = p.match || '';
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

const valueless = [...compiler].filter(([, takesValue]) => !takesValue).map(([name]) => name);
assert.deepEqual(sorted(grammar), sorted(valueless), 'grammar lệch compiler với directive không có giá trị');
assert.deepEqual(sorted(snippets), sorted(compiler.keys()), 'snippets lệch compiler');

// Prefix trùng nhau thì cái sau che cái trước, im lặng.
const all = Object.values(JSON.parse(fs.readFileSync(path.join(__dirname, 'snippets/sao.json'), 'utf8')))
    .flatMap(v => (Array.isArray(v.prefix) ? v.prefix : [v.prefix]));
const dup = all.filter((p, i) => all.indexOf(p) !== i);
assert.deepEqual(dup, [], `prefix snippet trùng: ${dup.join(', ')}`);

console.log(`tag directives: compiler và snippets khớp nhau (${sorted(compiler.keys()).join(' ')}), grammar nhận ${sorted(valueless).join(' ')} không giá trị`);
console.log(`snippets: ${all.length} prefix, không trùng`);
