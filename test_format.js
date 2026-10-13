const assert = require('node:assert/strict');
const Module = require('node:module');
const fs = require('node:fs');
const path = require('node:path');
const { formatSaola } = require('./out/formatters/templateFormat');
const spaces = { tabSize: 4, insertSpaces: true };
const noCancel = { isCancellationRequested: false };

class Position { constructor(line, character) { this.line = line; this.character = character; } }
class Range { constructor(start, end) { this.start = start; this.end = end; } }
const fullProviders = new Map();
const rangeProviders = new Map();
const disposable = () => ({ dispose() {} });
const vscode = {
  Position, Range, TextEdit: { replace: (range, newText) => ({ range, newText }) },
  workspace: {
    textDocuments: [], getConfiguration: () => ({ get: () => undefined, update: () => Promise.resolve() }),
    onDidOpenTextDocument: disposable, onDidChangeTextDocument: disposable, onDidCloseTextDocument: disposable,
  },
  languages: {
    registerDocumentFormattingEditProvider: (id, provider) => { fullProviders.set(id, provider); return disposable(); },
    registerDocumentRangeFormattingEditProvider: (id, provider) => { rangeProviders.set(id, provider); return disposable(); },
    registerOnTypeFormattingEditProvider: disposable, registerCompletionItemProvider: disposable,
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
    lineAt: line => ({ text: lines[line], range: new Range(new Position(line, 0), new Position(line, lines[line].length)) }),
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

  // Exercise the same providers users receive from the actual packaged entry point.
  require(process.env.SAOLA_EXTENSION_ENTRY || './dist/extension').activate({ subscriptions: [] });
  for (const id of ['sao', 'saola']) {
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
  }
  assert.equal(await formatSaola(embedded, spaces, 1, 1), '    const count: number = 1;\n    function add(x: number) {\n        return x + count;\n    }', 'complete selected script body');
  const partial = '<script>\nfunction f(){\nreturn 1;\n}\n</script>';
  assert.equal(await formatSaola(partial, spaces, 2, 2), 'return 1;', 'partial script kept intact');
  assert.equal(await formatSaola(input, spaces, 3, 3), expected.split('\n')[3]);

  const manifest = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  assert.equal(manifest.contributes.languages.filter(l => l.extensions?.includes('.sao')).length, 1, 'one canonical language association');
  for (const language of manifest.contributes.languages) {
    for (const icon of Object.values(language.icon)) { assert.ok(fs.existsSync(path.join(__dirname, icon)), icon); }
  }
  console.log('format: template, legacy, embedded, raw text, tabs, CRLF, cancellation, selection, bundle and icons OK');
})().catch(error => { console.error(error); process.exitCode = 1; });
