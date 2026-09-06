const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function functions(file, names, scope = {}) {
    const source = fs.readFileSync(file, 'utf8');
    const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
    const body = names.map(name => {
        const node = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === name);
        assert.ok(node, name);
        return node.getText(ast);
    }).join('\n');
    return new Function(...Object.keys(scope), `${body}; return {${names.join(',')}};`)(...Object.values(scope));
}

const { _collectImportedComponents } = functions('./out/extension.js', ['_collectImportedComponents']);
assert.deepEqual(_collectImportedComponents("<script setup>\n@importView(__component__ + 'statcard' as Card)\n</script>"), [{ name: 'Card', original: 'statcard' }]);
assert.deepEqual(_collectImportedComponents("@import('web.card' as Card)"), [{ name: 'Card', original: 'web.card' }]);

const { _importForTag } = functions('./out/navigation.js', ['_normalizeTag', '_importForTag'], { viewPath_1: require('./out/viewPath.js') });
assert.equal(_importForTag("@importView('web.card' as Card)", 'Card').path, 'web.card');
assert.equal(_importForTag("@import('web.card' as Card)", 'Card').path, 'web.card');

const grammar = JSON.parse(fs.readFileSync('./syntaxes/sao.tmLanguage.json', 'utf8'));
const script = new RegExp(grammar.repository['setup-script'].begin);
assert.ok(script.test('<script setup lang="ts">'));
assert.ok(script.test('<script lang="ts" setup>'));
assert.ok(!script.test('<script lang="ts">'));
const directive = new RegExp(grammar.repository['setup-declaration'].begin);
assert.ok(directive.test('@importView(__component__ + "card" as Card)'));
assert.ok(directive.test('@state(count: number = 0)'));
assert.ok(!directive.test('import type { GridRow } from "./GridData"'));
console.log('setup declarations: completion, navigation and grammar checks passed');
