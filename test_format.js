const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const { formatSaola } = require('./out/formatters/templateFormat');
const spaces = { tabSize: 4, insertSpaces: true };
const noCancel = { isCancellationRequested: false };

class Position { constructor(line, character) { this.line = line; this.character = character; } }
class Range { constructor(start, end) { this.start = start; this.end = end; } }
class TextEdit {
  constructor(range, newText) { this.range = range; this.newText = newText; }
  static replace(range, newText) { return new TextEdit(range, newText); }
}
const fullProviders = new Map();
const rangeProviders = new Map();
const onTypeProviders = new Map();
const directiveProviders = new Map();
const disposable = () => ({ dispose() {} });
const vscode = {
  Position, Range, TextEdit,
  CompletionItem: class { constructor(label) { this.label = label; } },
  SnippetString: class { constructor(value) { this.value = value; } },
  workspace: {
    textDocuments: [], getConfiguration: () => ({ get: () => undefined, update: () => Promise.resolve() }),
    onDidOpenTextDocument: disposable, onDidChangeTextDocument: disposable, onDidCloseTextDocument: disposable,
  },
  languages: {
    registerDocumentFormattingEditProvider: (id, provider) => { fullProviders.set(id, provider); return disposable(); },
    registerDocumentRangeFormattingEditProvider: (id, provider) => { rangeProviders.set(id, provider); return disposable(); },
    registerOnTypeFormattingEditProvider: (id, provider) => { onTypeProviders.set(id, provider); return disposable(); },
    registerCompletionItemProvider: (id, provider, ...triggers) => {
      if (triggers.includes('@') && !triggers.includes('<')) directiveProviders.set(id, provider);
      return disposable();
    },
    registerDefinitionProvider: disposable, registerHoverProvider: disposable,
    createDiagnosticCollection: () => ({ ...disposable(), delete() {} }),
  },
  window: { onDidChangeActiveTextEditor: disposable },
  commands: { registerCommand: disposable }, ConfigurationTarget: { Global: 1 },
  CompletionItemKind: {},
};
const origLoad = Module._load;
Module._load = function(request) {
  if (request === 'vscode') { return vscode; }
  return origLoad.apply(this, arguments);
};
function doc(content) {
  const lines = content.split('\n');
  const offsetAt = p => lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character;
  return {
    getText: range => range ? content.slice(offsetAt(range.start), offsetAt(range.end)) : content,
    lineAt: position => {
      const line = typeof position === 'number' ? position : position.line;
      return { text: lines[line], range: new Range(new Position(line, 0), new Position(line, lines[line].length)) };
    },
    positionAt: offset => {
      const before = content.slice(0, offset).split('\n');
      return new Position(before.length - 1, before[before.length - 1].length);
    },
  };
}

(async () => {
  const input = '<template>\n<div>\n@if(active)\n<button @click(run(x => x > 1)) :class="active ? \'x\' : \'y\'">{{ label }}</button>\n@else\n<img src="x">\n@endif\n</div>\n</template>\n';
  const expected = '<template>\n    <div>\n        @if(active)\n            <button @click(run(x => x > 1)) :class="active ? \'x\' : \'y\'">{{ label }}</button>\n        @else\n            <img src="x">\n        @endif\n    </div>\n</template>\n';
  assert.equal(await formatSaola(input, spaces), expected);
  assert.equal(await formatSaola(expected, spaces), expected, 'idempotent template');
  assert.equal(await formatSaola(input.replaceAll('\n', '\r\n'), spaces), expected.replaceAll('\n', '\r\n'), 'CRLF');
  assert.equal(await formatSaola('<blade>\n@foreach($items as $item)\n<li>{{ $item->name }}</li>\n@endforeach\n</blade>', { tabSize: 2, insertSpaces: false }), '<blade>\n\t@foreach($items as $item)\n\t\t<li>{{ $item->name }}</li>\n\t@endforeach\n</blade>');
  const multiline = '@props({\ntitle: "Hello",\noptions: {\nx: 1\n}\n})\n<template>\n<Card\n:label="title"\n@click(run())\n/>\n@if(\nactive\n)\n<br>\n@endif\n</template>';
  assert.equal(await formatSaola(multiline, spaces), '@props({\n    title: "Hello",\n    options: {\n        x: 1\n    }\n})\n<template>\n    <Card\n        :label="title"\n        @click(run())\n    />\n    @if(\n        active\n    )\n        <br>\n    @endif\n</template>');
  const nested = '<template>\n<div><span>\n<b>Text</b>\n</span></div>\n<p>Next</p>\n</template>';
  assert.equal(await formatSaola(nested, spaces), '<template>\n    <div><span>\n            <b>Text</b>\n        </span></div>\n    <p>Next</p>\n</template>');
  const branches = '<blade>\n@switch($x)\n@case(1)\n<p>One</p>\n@break\n@default\n<p>Other</p>\n@endswitch\n@forelse($rows as $row)\n<p>{{ $row }}</p>\n@empty\n<p>Empty</p>\n@endforelse\n@section("title", { a: 1, b: 2 })\n<p>After inline section</p>\n</blade>';
  const branched = await formatSaola(branches, spaces);
  assert.ok(branched.includes('    @switch($x)\n        @case(1)\n            <p>One</p>\n            @break\n        @default\n            <p>Other</p>\n    @endswitch'));
  assert.ok(branched.includes('    @empty\n        <p>Empty</p>\n    @endforelse'));
  assert.ok(branched.includes('    <p>After inline section</p>'));
  for (const [open, close] of [['<pre>', '</pre>'], ['<textarea>', '</textarea>'], ['@verbatim', '@endverbatim'], ['@php', '@endphp'], ['{{--', '--}}'], ['<!--', '-->']]) {
    const raw = `${open}\n  literal  \n\n\n<div>\n@if(x)\n${close}\n<p>After</p>\n`;
    assert.equal(await formatSaola(raw, spaces), raw, `raw ${open}`);
  }
  const sensitive = '<template>\n<pre>\n  literal  \n   </pre>\n<textarea>\n  literal  \n   </textarea>\n</template>';
  const sensitiveResult = await formatSaola(sensitive, spaces);
  assert.equal(sensitiveResult.match(/<pre>([\s\S]*?)<\/pre>/)[1], sensitive.match(/<pre>([\s\S]*?)<\/pre>/)[1]);
  assert.equal(sensitiveResult.match(/<textarea>([\s\S]*?)<\/textarea>/)[1], sensitive.match(/<textarea>([\s\S]*?)<\/textarea>/)[1]);
  const embedded = '<script setup lang="ts">\nconst count:number=1;function add(x:number){return x+count}\n</script>\n<style>\n.box{color:red;padding:0  4px}\n</style>\n';
  const formatted = await formatSaola(embedded, { tabSize: 2, insertSpaces: true });
  assert.ok(formatted.includes('  const count: number = 1;\n  function add(x: number) {\n    return x + count;\n  }'));
  assert.ok(formatted.includes('  .box {\n    color: red;\n    padding: 0 4px;\n  }'));
  assert.equal(await formatSaola(formatted, { tabSize: 2, insertSpaces: true }), formatted, 'idempotent embedded');
  for (const attrs of ['type="application/ld+json"', 'lang="unknown"']) {
    const original = `<script ${attrs}>\n  {"unchanged":1}\n</script>`;
    assert.equal(await formatSaola(original, spaces), original);
  }
  const broken = '<script setup>\nconst unfinished = (\n</script>\n<template>\n<p>Still formats</p>\n</template>';
  assert.equal(await formatSaola(broken, spaces), broken.replace('<p>Still formats', '    <p>Still formats'));
  const literal = '<script>\nconst value=`hello\n  keep this whitespace\nend`;\n</script>';
  const literalResult = await formatSaola(literal, spaces);
  assert.equal(literalResult.match(/`[\s\S]*`/)[0], literal.match(/`[\s\S]*`/)[0], 'multiline string value');
  assert.equal(await formatSaola(literalResult, spaces), literalResult);

  const setup = '<script setup lang="ts">\nimport { Client } from "@web/client";\n@state(vm: any = { temporary: false })\n@state(prompt: string = "")\nfunction mounted() { client = new Client(); }\nconst message = `hello\n  keep literal whitespace\nend`;\n</script>\n@await\n    <template>\n@section("meta:title", "Chat")\n@block("content")\n<p>{{ prompt }}</p>\n@endblock\n    </template>';
  const setupResult = await formatSaola(setup, spaces);
  assert.ok(setupResult.includes('    import { Client }'));
  assert.ok(setupResult.includes('    @state(vm: any = { temporary: false })\n    @state(prompt: string = "")'));
  assert.ok(setupResult.includes('    function mounted()'));
  assert.ok(setupResult.includes('</script>\n@await\n<template>\n    @section'));
  assert.equal(setupResult.match(/`[\s\S]*`/)[0], setup.match(/`[\s\S]*`/)[0]);
  assert.equal(await formatSaola(setupResult, spaces), setupResult, 'idempotent setup declarations');
  const setupTabs = await formatSaola(setup, { tabSize: 4, insertSpaces: false });
  assert.ok(setupTabs.includes('\n\t@state(prompt: string = "")'));
  assert.equal(await formatSaola(setupTabs, { tabSize: 4, insertSpaces: false }), setupTabs);
  assert.equal(await formatSaola(setup.replaceAll('\n', '\r\n'), spaces), setupResult.replaceAll('\n', '\r\n'));

  const policySetup = '<script setup lang="ts">\n@middleware([\n"requireLogin",\n"profile:complete"\n])\n@useAuth()\n@state(count: number = 0)\nfunction reset(){setCount(0);set__auth__(null)}\nconst literal=`keep\n@useAuth()\n@middleware("example")\nend`;\n/*\n@middleware("comment")\n*/\n</script>';
  const policyResult = await formatSaola(policySetup, spaces);
  assert.ok(policyResult.includes('    @middleware([\n        "requireLogin",\n        "profile:complete"\n    ])'));
  assert.ok(policyResult.includes('    @useAuth()\n    @state(count: number = 0)'));
  assert.ok(policyResult.includes('    function reset() {\n        setCount(0);\n        set__auth__(null);\n    }'), 'JS formats despite setup directives');
  assert.equal(policyResult.match(/`[\s\S]*`/)[0], policySetup.match(/`[\s\S]*`/)[0], 'directive examples inside template literal stay literal');
  assert.equal(await formatSaola(policyResult, spaces), policyResult, 'metadata format is idempotent');
  assert.equal(await formatSaola(policySetup.replaceAll('\n','\r\n'), spaces), policyResult.replaceAll('\n','\r\n'));
  for (const flag of ['@useAuth','@useAuth()','@useauth','@useauth()']) {
    const formatted = await formatSaola(`<script setup>\n${flag}\nfunction f(){return __auth__}\n</script>`, spaces);
    assert.ok(formatted.includes(`    ${flag}\n    function f() {\n        return __auth__;\n    }`));
  }
  const oneLine = await formatSaola('<script setup lang="ts">const n:number=1;function f(){return n+1}</script>\n<style>.x{color:red}</style>', spaces);
  assert.ok(oneLine.includes('<script setup lang="ts">\n    const n: number = 1;\n    function f() {'));
  assert.ok(oneLine.includes('<style>\n    .x {\n        color: red;\n    }\n</style>'));
  assert.equal(await formatSaola(oneLine, spaces), oneLine);
  const unquotedLang = '<script data-lang="ignored" lang=ts>const x:number=1</script>';
  assert.ok((await formatSaola(unquotedLang, spaces)).includes('    const x: number = 1;'));

  const mixed = [
    '<template>',
    '@serverside',
    `@section('meta:title', text("@endsection"))`,
    '<p>Server only</p>',
    '@endSSR',
    '@csr<div #if="ready">',
    '@if(active)<button @click.stop(run(x => x > 1))',
    ':title="title">',
    '{{ { value: `<div>` }.value }}',
    '</button>@endif',
    '</div>@endclientside',
    '<pre>before',
    '  <div>literal',
    '</pre><section>',
    '<span>Still nested</span>',
    '</section>',
    '</template>',
  ].join('\n');
  const mixedExpected = [
    '<template>',
    '    @serverside',
    `        @section('meta:title', text("@endsection"))`,
    '        <p>Server only</p>',
    '    @endSSR',
    '    @csr<div #if="ready">',
    '            @if(active)<button @click.stop(run(x => x > 1))',
    '                    :title="title">',
    '                    {{ { value: `<div>` }.value }}',
    '                </button>@endif',
    '        </div>@endclientside',
    '    <pre>before',
    '  <div>literal',
    '</pre><section>',
    '        <span>Still nested</span>',
    '    </section>',
    '</template>',
  ].join('\n');
  assert.equal(await formatSaola(mixed, spaces), mixedExpected, 'inline tags, directives and server/client aliases');
  assert.equal(await formatSaola(mixedExpected, spaces), mixedExpected);
  assert.equal(await formatSaola(mixed, spaces, 6, 8), mixedExpected.split('\n').slice(6, 9).join('\n'));

  const comments = '<script setup lang="ts">\n@useAuth(); // sync\n@state(n: number = 0) /* keep */\nfunction f(){return n}\n</script>';
  const formattedComments = await formatSaola(comments, spaces);
  assert.ok(formattedComments.includes('    @useAuth(); // sync\n    @state(n: number = 0) /* keep */'));
  assert.ok(formattedComments.includes('    function f() {\n        return n;'));
  assert.equal(await formatSaola(formattedComments, spaces), formattedComments);

  // Exercise the same providers users receive from the actual packaged entry point.
  require(process.env.SAOLA_EXTENSION_ENTRY || './dist/extension').activate({ subscriptions: [] });
  for (const id of ['sao', 'saola']) {
    const complete = (text) => directiveProviders.get(id).provideCompletionItems(doc(text), new Position(0, text.length), noCancel, {});
    for (const label of ['@cache', '@asset', '@children', '@viewtype', '@serverside', '@clientside']) {
      assert.ok(complete(label.slice(0, -1)).some(item => item.label === label), `${id} completion for ${label}`);
    }
    assert.ok(complete('@click.st').some(item => item.label === '@click.stop'));
    const provider = fullProviders.get(id);
    assert.ok(provider, `document formatter registered for ${id}`);
    assert.ok(rangeProviders.get(id), `selection formatter registered for ${id}`);
    const edits = await provider.provideDocumentFormattingEdits(doc(input), spaces, noCancel);
    assert.equal(edits[0].newText, expected, 'packaged formatter matches source');
    const selected = await rangeProviders.get(id).provideDocumentRangeFormattingEdits(doc(input), new Range(new Position(3, 2), new Position(4, 0)), spaces, noCancel);
    assert.deepEqual(selected[0].range, new Range(new Position(3, 0), new Position(3, input.split('\n')[3].length)));
    assert.equal(selected[0].newText, expected.split('\n')[3], 'selection uses outer context');
    assert.deepEqual(await provider.provideDocumentFormattingEdits(doc(expected), spaces, noCancel), [], 'no unnecessary edit');
    assert.deepEqual(await provider.provideDocumentFormattingEdits(doc(input), spaces, { isCancellationRequested: true }), []);
    const setupEdits = await provider.provideDocumentFormattingEdits(doc(setup), spaces, noCancel);
    assert.equal(setupEdits[0].newText, setupResult);
    const policyEdits = await provider.provideDocumentFormattingEdits(doc(policySetup), spaces, noCancel);
    assert.equal(policyEdits[0].newText, policyResult, 'packaged metadata formatter matches source');
    const enter = onTypeProviders.get(id).provideOnTypeFormattingEdits(doc('@await\n    <template>'), new Position(1, 4), '\n', spaces, noCancel);
    assert.equal(enter[0].newText, '', 'Enter after @await does not indent');
    const onType = onTypeProviders.get(id);
    const branchEnter = onType.provideOnTypeFormattingEdits(doc('<template>\n    @serverside\n'), new Position(2, 0), '\n', spaces, noCancel);
    assert.equal(branchEnter[0].newText, '        ', 'Enter indents inside @serverside');
    const rawEnter = onType.provideOnTypeFormattingEdits(doc('<pre>\n  '), new Position(1, 2), '\n', spaces, noCancel);
    assert.deepEqual(rawEnter, [], 'Enter preserves raw text');
    const inlineSection = onType.provideOnTypeFormattingEdits(doc("<template>\n    @section('title', 'Title')\n        "), new Position(2, 8), '\n', spaces, noCancel);
    assert.equal(inlineSection[0].newText, '    ', 'Enter does not open a two-argument section');
  }
  assert.equal(await formatSaola(embedded, spaces, 1, 1), '    const count: number = 1;\n    function add(x: number) {\n        return x + count;\n    }', 'complete selected script body');
  const partial = '<script>\nfunction f(){\nreturn 1;\n}\n</script>';
  assert.equal(await formatSaola(partial, spaces, 2, 2), 'return 1;', 'partial script kept intact');
  assert.equal(await formatSaola(input, spaces, 3, 3), expected.split('\n')[3]);

  const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const languageConfig = fs.readFileSync('language-configurations/sao.language-configuration.json', 'utf8');
  assert.ok(!languageConfig.includes('|await|'), '@await is not an indentation/folding block');
  assert.equal(manifest.contributes.languages.filter(l => l.extensions?.includes('.sao')).length, 1, 'one canonical language association');
  for (const language of manifest.contributes.languages) {
    for (const icon of Object.values(language.icon)) { assert.ok(fs.existsSync(path.join(__dirname, icon)), icon); }
  }
  console.log('format: template, legacy, embedded, raw text, tabs, CRLF, cancellation, selection, bundle and icons OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
