const Module = require('module');
const origResolve = Module._resolveFilename;
Module._resolveFilename = function(request, parent) {
  if (request === 'vscode') return request;
  return origResolve.apply(this, arguments);
};
require.cache['vscode'] = { id: 'vscode', filename: 'vscode', loaded: true, exports: {} };

// Test with DIST bundle (what the extension actually uses)
const distCode = require('fs').readFileSync('./dist/extension.js', 'utf8');
console.log('dist bundle size:', distCode.length);
console.log('dist has countParensOutsideStrings:', distCode.includes('countParensOutsideStrings') || distCode.includes('countParens'));
console.log('dist has {{-- skip:', distCode.includes('{{--'));
console.log('');

// Test with OUT (compiled TS)
const { OneFormatter } = require('./out/formatters/oneFormatter');
const formatter = new OneFormatter();

const fs = require('fs');
const testInput = fs.readFileSync('./examples/demo-ast.one', 'utf8');

const result = OneFormatter.prototype.formatDocument.call(formatter, testInput, '    ');
console.log('=== FORMATTED OUTPUT ===');
console.log(result);
console.log('=== END ===');

// Verify specific lines
const lines = result.split('\n');
console.log('\n=== LINE CHECK ===');
lines.forEach((line, i) => {
  const indent = line.match(/^(\s*)/)[1].length;
  const trimmed = line.trim();
  if (trimmed) {
    console.log(`Line ${i+1}: indent=${indent} | ${trimmed.substring(0, 80)}`);
  } else {
    console.log(`Line ${i+1}: (empty)`);
  }
});
