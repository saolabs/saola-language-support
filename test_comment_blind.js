// Self-check: mã trong comment KHÔNG được coi là mã thật.
//   node test_comment_blind.js   (chạy `npm run compile` trước)
//
// Trang tài liệu dính nặng nhất — nó tồn tại để in ra cú pháp Saola. Cùng lớp
// lỗi đã sửa bên compiler (compiler/docs/05-roadmap.md §16).
const assert = require('assert');
const fs = require('fs');

// _detectSaoMode / _blankBladeComments là hàm nội bộ của extension.ts (không
// export vì chỉ dùng trong tiến trình VS Code). Bóc thân hàm từ bản đã compile
// để kiểm được mà không phải nới public API chỉ vì test.
const src = fs.readFileSync(require.resolve('./out/extension.js'), 'utf8');
function grab(name) {
  const i = src.indexOf('function ' + name + '(');
  assert.notStrictEqual(i, -1, 'không thấy hàm ' + name);
  let depth = 0;
  for (let k = src.indexOf('{', i); k < src.length; k++) {
    if (src[k] === '{') { depth++; }
    else if (src[k] === '}' && --depth === 0) { return src.slice(i, k + 1); }
  }
  throw new Error('không đóng ngoặc: ' + name);
}
eval(grab('_blankBladeComments') + '\n' + grab('_detectSaoMode'));

// ── làm trắng phải GIỮ độ dài và số dòng ────────────────────────────
// Bất biến cốt lõi: _extractDirectiveContent(lines, i) dùng CHỈ SỐ DÒNG,
// lệch một dòng là đọc nhầm khai báo.
{
  const s = 'a{{-- <style>x</style> --}}b\n@verbatim\n@props({g:1})\n@endverbatim\nc';
  const b = _blankBladeComments(s);
  assert.strictEqual(b.length, s.length, 'độ dài phải giữ nguyên');
  assert.strictEqual(b.split('\n').length, s.split('\n').length, 'số dòng phải giữ nguyên');
  assert.ok(!b.includes('style'), 'nội dung comment phải bị làm trắng');
}

// văn bản ngoài comment không được đụng tới
assert.strictEqual(_blankBladeComments('<template><p>a</p></template>'),
                   '<template><p>a</p></template>');

// ── <template> trong comment KHÔNG được lật chế độ ──────────────────
// Trước khi sửa: trả 'modern' cho file thật ra là legacy, kéo theo mọi chẩn
// đoán biến chưa khai báo chạy sai đường.
{
  const legacyFile = [
    '{{--', '  ví dụ tài liệu:', '  <template>', '    <p>demo</p>',
    '  </template>', '--}}', '@states({x:1})', '<blade>', '  <p>{{ $x }}</p>', '</blade>',
  ].join('\n');
  assert.strictEqual(_detectSaoMode(legacyFile).mode, 'legacy',
    '<template> trong comment không được lật sang modern');
}

// đối chứng: thẻ bọc THẬT vẫn phải nhận đúng, kèm đúng số dòng
{
  const modernFile = '@states({x:1})\n<template><p>a</p></template>';
  const got = _detectSaoMode(modernFile);
  assert.strictEqual(got.mode, 'modern');
  assert.strictEqual(got.firstWrapperLine, 1, 'chỉ số dòng phải giữ nguyên sau khi làm trắng');
}

// @verbatim cũng là văn bản nguyên văn
assert.strictEqual(
  _detectSaoMode('@verbatim\n<template>\n@endverbatim\n<blade><p>a</p></blade>').mode,
  'legacy', '<template> trong @verbatim không được lật chế độ');

console.log('✅ comment-blind: tất cả kiểm tra đều qua');
