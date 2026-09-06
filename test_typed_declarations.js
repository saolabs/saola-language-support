const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

const source = fs.readFileSync(require.resolve('./out/extension.js'), 'utf8');
const ast = ts.createSourceFile('extension.js', source, ts.ScriptTarget.Latest, true);
const declaration = ast.statements.find(n => ts.isFunctionDeclaration(n) && n.name.text === '_declarationNames');
const names = new Function(`${declaration.getText(ast)}; return _declarationNames;`)();

assert.deepEqual(names('count: number = 0, title: string = "hi"'), ['count', 'title']);
assert.deepEqual(names('map: Record<string, Array<number>> = {}, next = 2'), ['map', 'next']);
assert.deepEqual(names('{count: 0, user: {name: "Sao"}}: {count: number; user: {name: string}}'), ['count', 'user']);
assert.deepEqual(names('caption: string = ")", valid: boolean = 1 < 2'), ['caption', 'valid']);
assert.deepEqual(names('read: (n: number) => number = (n) => n, total: number = 0'), ['read', 'total']);
assert.deepEqual(names('$count = 0, $message = "hello"'), ['count', 'message']);
console.log('typed declarations: all checks passed');
