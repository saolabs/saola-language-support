const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const oniguruma = require('vscode-oniguruma');
const textmate = require('vscode-textmate');

async function main() {
    const wasm = fs.readFileSync(require.resolve('vscode-oniguruma/release/onig.wasm'));
    await oniguruma.loadWASM(wasm.buffer.slice(wasm.byteOffset, wasm.byteOffset + wasm.byteLength));

    const grammarSource = fs.readFileSync(path.join(__dirname, 'syntaxes/sao.tmLanguage.json'), 'utf8');
    const registry = new textmate.Registry({
        onigLib: Promise.resolve({
            createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
            createOnigString: value => new oniguruma.OnigString(value),
        }),
        loadGrammar: async scopeName => scopeName === 'text.html.saola'
            ? textmate.parseRawGrammar(grammarSource, 'sao.tmLanguage.json')
            : null,
    });
    const grammar = await registry.loadGrammar('text.html.saola');
    assert.ok(grammar);

    const scopesAt = (line, needle, stack = textmate.INITIAL) => {
        const result = grammar.tokenizeLine(line, stack);
        const index = line.indexOf(needle);
        assert.notEqual(index, -1, needle);
        const token = result.tokens.find(item => item.startIndex <= index && item.endIndex > index);
        assert.ok(token, `No token for ${needle}`);
        return { scopes: token.scopes, ruleStack: result.ruleStack };
    };

    // 1. Script tag with setup and lang="ts"
    const tag = '<script setup lang="ts">';
    const tagSetup = scopesAt(tag, 'setup');
    assert.ok(tagSetup.scopes.includes('entity.other.attribute-name.html'), 'tag setup attr');
    assert.ok(scopesAt(tag, 'lang').scopes.includes('entity.other.attribute-name.html'), 'tag lang attr');
    assert.ok(scopesAt(tag, '=').scopes.includes('punctuation.separator.key-value.html'), 'tag key-value separator');
    assert.ok(scopesAt(tag, 'ts').scopes.some(scope => scope.startsWith('string.quoted.double')), 'tag ts string');

    // 2. Directives inside <script setup lang="ts">
    const scriptStack = tagSetup.ruleStack;

    const propDecl = "    @props({initial: 0, title: 'Khai báo trong setup'}: {initial: number; title: string})";
    assert.ok(scopesAt(propDecl, 'number', scriptStack).scopes.includes('support.type.primitive.ts'), 'prop number type');
    assert.ok(scopesAt(propDecl, 'string', scriptStack).scopes.includes('support.type.primitive.ts'), 'prop string type');

    const letDecl = "    @let(cardPath: string = __base__ + 'modules.components.statcard')";
    assert.ok(scopesAt(letDecl, 'cardPath', scriptStack).scopes.includes('variable.other.readwrite.ts'), 'let var name');
    assert.ok(scopesAt(letDecl, 'string', scriptStack).scopes.includes('support.type.primitive.ts'), 'let string type');

    const importViewDecl = "    @importView(cardPath as StatCard)";
    assert.ok(scopesAt(importViewDecl, 'as', scriptStack).scopes.includes('keyword.control.as.ts'), 'importView as keyword');
    assert.ok(scopesAt(importViewDecl, 'StatCard', scriptStack).scopes.includes('entity.name.type.ts'), 'importView StatCard type');

    const stateDecl = "    @state(count: number = initial, status: GridStatusFilter = '')";
    assert.ok(scopesAt(stateDecl, 'count', scriptStack).scopes.includes('variable.other.readwrite.ts'), 'state count var');
    assert.ok(scopesAt(stateDecl, 'number', scriptStack).scopes.includes('support.type.primitive.ts'), 'state number type');
    assert.ok(scopesAt(stateDecl, 'status', scriptStack).scopes.includes('variable.other.readwrite.ts'), 'state status var');
    assert.ok(scopesAt(stateDecl, 'GridStatusFilter', scriptStack).scopes.includes('entity.name.type.ts'), 'state GridStatusFilter type');

    const computedDecl = "    @computed(doubled: number = count * 2)";
    assert.ok(scopesAt(computedDecl, 'doubled', scriptStack).scopes.includes('variable.other.readwrite.ts'), 'computed doubled var');
    assert.ok(scopesAt(computedDecl, 'number', scriptStack).scopes.includes('support.type.primitive.ts'), 'computed number type');

    // 3. Declarations outside <script>
    const constDecl = "@const(step: number = 1)";
    assert.ok(scopesAt(constDecl, 'step').scopes.includes('variable.other.readwrite.ts'), 'const step var');
    assert.ok(scopesAt(constDecl, 'number').scopes.includes('support.type.primitive.ts'), 'const number type');

    const varsDecl = "@vars(rows: GridRow[] = [], total: number = 0, status: GridStatusFilter = '')";
    assert.ok(scopesAt(varsDecl, 'rows').scopes.includes('variable.other.readwrite.ts'), 'vars rows var');
    assert.ok(scopesAt(varsDecl, 'GridRow').scopes.includes('entity.name.type.ts'), 'vars GridRow type');
    assert.ok(scopesAt(varsDecl, 'number').scopes.includes('support.type.primitive.ts'), 'vars number type');
    assert.ok(scopesAt(varsDecl, 'GridStatusFilter').scopes.includes('entity.name.type.ts'), 'vars GridStatusFilter type');

    const multiStatesLine1 = "@states({";
    const multiStatesLine2 = "}: {rows: DemoRow[]; nextId: number; log: string[]})";
    const multiStack = grammar.tokenizeLine(multiStatesLine1, textmate.INITIAL).ruleStack;
    assert.ok(scopesAt(multiStatesLine2, 'DemoRow', multiStack).scopes.includes('entity.name.type.ts'), 'states DemoRow type');
    assert.ok(scopesAt(multiStatesLine2, 'number', multiStack).scopes.includes('support.type.primitive.ts'), 'states number type');
    assert.ok(scopesAt(multiStatesLine2, 'string', multiStack).scopes.includes('support.type.primitive.ts'), 'states string type');

    const singleState = '@states({ items: rows }: { items: GridRow[]; busy: boolean })';
    assert.ok(scopesAt(singleState, 'GridRow').scopes.includes('entity.name.type.ts'), 'states GridRow type');
    assert.ok(scopesAt(singleState, 'boolean').scopes.includes('support.type.primitive.ts'), 'states boolean type');

    // 4. <script setup> body must report the TypeScript embedded language id.
    //    VS Code picks the comment syntax (// vs {{-- --}}) from the language at
    //    the cursor, and that id comes from `contentName` matching a key in
    //    package.json `embeddedLanguages`. Without it the whole .sao file stays
    //    `saola` and Cmd+/ inside <script> emits a Blade comment.
    const SAOLA = 1;
    const TYPESCRIPT = 2;
    const embeddedRegistry = new textmate.Registry({
        onigLib: Promise.resolve({
            createOnigScanner: patterns => new oniguruma.OnigScanner(patterns),
            createOnigString: value => new oniguruma.OnigString(value),
        }),
        loadGrammar: async scopeName => {
            if (scopeName === 'text.html.saola') {
                return textmate.parseRawGrammar(grammarSource, 'sao.tmLanguage.json');
            }
            // Stand-in for the real TypeScript grammar, which ships with VS Code.
            if (scopeName === 'source.ts') {
                return {scopeName: 'source.ts', patterns: [{match: '\\S+', name: 'source.ts.word'}]};
            }
            return null;
        },
    });
    const embedded = await embeddedRegistry.loadGrammarWithEmbeddedLanguages(
        'text.html.saola',
        SAOLA,
        {'meta.embedded.inline.js': 3, 'source.css': 4, 'source.js': 3, 'source.ts': TYPESCRIPT},
    );
    assert.ok(embedded);

    const languagesOf = (line, stack) => {
        const result = embedded.tokenizeLine2(line, stack);
        const languages = [];
        for (let index = 0; index < result.tokens.length; index += 2) {
            languages.push(result.tokens[index + 1] & 0xff);
        }
        return {languages, ruleStack: result.ruleStack};
    };

    let embeddedStack = textmate.INITIAL;
    const expectations = [
        ['<script setup lang="ts">', SAOLA],
        ['    @props({count: 0}: {count: number})', TYPESCRIPT],
        ['    function increment() {', TYPESCRIPT],
        ['        setCount(count + 1);', TYPESCRIPT],
        ['    }', TYPESCRIPT],
        ['</script>', SAOLA],
        ['<template>', SAOLA],
        ['    <p>{{ count }}</p>', SAOLA],
        ['</template>', SAOLA],
    ];
    for (const [line, expected] of expectations) {
        const {languages, ruleStack} = languagesOf(line, embeddedStack);
        embeddedStack = ruleStack;
        // The first token is the line's indentation, and that is exactly where
        // Cmd+/ resolves the language from.
        assert.equal(languages[0], expected, `language id for ${JSON.stringify(line)}`);
    }

    console.log('highlighting: TextMate tag, declaration and TypeScript scopes passed');
    console.log('highlighting: <script setup> body reports the typescript embedded language');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
