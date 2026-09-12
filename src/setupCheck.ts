// =============================================
// <script setup> type check (pure — no vscode API)
// =============================================
// The setup body is rebuilt as one virtual TypeScript module: setup
// declarations become `let`/`const` statements with their text copied
// verbatim, the compiler's closure names are declared up front, and tsserver
// does the rest. Only diagnostics that land on copied text are reported, so
// nothing generated here can produce a squiggle the user cannot see.
//
// `@props({a = 1}: {a: number})` is a TS binding pattern as written, which is
// what makes this possible; the older `{a: 1}` form is not, so it only
// declares its names (as `any`) and is never type checked.

import * as ts from 'typescript';

export interface SetupDiagnostic {
  /** Offset into the .sao source. */
  start: number;
  length: number;
  message: string;
  code: number;
}

/** Names in scope of every compiled view constructor (compiler/resources/templates/view.js). */
export const CLOSURE_NAMES: Record<string, string> = {
  __data__: 'any', systemData: 'any', __STATE__: 'any', __VIEW_ID__: 'string',
  __VIEW_PATH__: 'string', __VIEW_NAMESPACE__: 'string', __VIEW_TYPE__: 'string', __VIEW_CONFIG__: 'any',
  __base__: 'string', __layout__: 'string', __page__: 'string', __component__: 'string',
  __template__: 'string', __module__: 'string', __context__: 'string', __partial__: 'string',
  __system__: 'string', __env: 'any', __helper: 'any',
  App: 'any', $view: 'any', $app: 'any', $controller: 'any',
  useState: 'any', updateRealState: 'any', lockUpdateRealState: 'any', updateStateByKey: 'any',
  View: 'any', ViewController: 'any', app: 'any', Application: 'any',
};

const DECLARATION = /^[ \t]*@(props|vars|states?|let|const|computed|assets?|importView|useState)\s*\(/gm;

/** Diagnostic codes that are noise here: unresolved module paths (aliases live in the bundler). */
const IGNORED = new Set([2307, 2792, 1192, 1259, 1471]);

interface Chunk { virt: number; src: number; length: number }

class Builder {
  text = '';
  readonly chunks: Chunk[] = [];
  gen(s: string): this { this.text += s; return this; }
  copy(s: string, srcOffset: number): this {
    this.chunks.push({ virt: this.text.length, src: srcOffset, length: s.length });
    this.text += s;
    return this;
  }
  toSource(virt: number): number | undefined {
    const c = this.chunks.find(c => virt >= c.virt && virt < c.virt + c.length);
    return c && c.src + (virt - c.virt);
  }
}

/** Index just past the `)` matching the `(` at `open`, or -1. */
function closeParen(s: string, open: number): number {
  let depth = 0, quote = '';
  for (let i = open; i < s.length; i++) {
    const c = s[i];
    if (quote) { if (c === '\\') { i++; } else if (c === quote) { quote = ''; } continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '/' && s[i + 1] === '/') { i = s.indexOf('\n', i); if (i < 0) { return -1; } continue; }
    if (c === '/' && s[i + 1] === '*') { i = s.indexOf('*/', i); if (i < 0) { return -1; } i++; continue; }
    if ('([{'.includes(c)) { depth++; } else if (')]}'.includes(c) && --depth === 0) { return i + 1; }
  }
  return -1;
}

/** Top-level `:` after a leading object literal — splits `{defaults}: {type}`. */
function objectTypeColon(inner: string): number {
  const end = closeParen(inner, inner.indexOf('{'));
  const rest = inner.slice(end).match(/^\s*:/);
  return rest ? end + rest[0].length - 1 : -1;
}

/** Declared names, `=`/`:`/type stripped; used where a declaration cannot be copied verbatim. */
function names(inner: string): string[] {
  const text = inner.trim();
  const object = text.startsWith('{');
  const body = object ? text.slice(1, closeParen(text, 0) - 1) : text;
  const out: string[] = [];
  let depth = 0, quote = '', start = 0, angles = 0, inType = false, inValue = false;
  const add = (end: number) => {
    const m = body.slice(start, end).trim().match(/^\$?([A-Za-z_]\w*)/);
    if (m) { out.push(m[1]); }
  };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) { if (c === '\\') { i++; } else if (c === quote) { quote = ''; } continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if ('([{'.includes(c)) { depth++; continue; }
    if (')]}'.includes(c)) { depth--; continue; }
    if (depth) { continue; }
    if (c === ':' && !object && !inValue) { inType = true; }
    if (inType && c === '<') { angles++; continue; }
    if (inType && c === '>' && angles > 0 && body[i - 1] !== '=') { angles--; continue; }
    if (angles) { continue; }
    if (c === '=' && body[i + 1] !== '>') { inType = false; inValue = true; }
    if (c === ',') { add(i); start = i + 1; inType = inValue = false; }
  }
  add(body.length);
  return out;
}

const setterOf = (name: string) => 'set' + name.charAt(0).toUpperCase() + name.slice(1);

/** `{a: 1}` (old form) has a `:` directly inside the outer braces; nested `{a = {x: 1}}` does not. */
function usesColonDefaults(object: string): boolean {
  let depth = 0, quote = '';
  for (let i = 0; i < object.length; i++) {
    const c = object[i];
    if (quote) { if (c === '\\') { i++; } else if (c === quote) { quote = ''; } continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if ('([{'.includes(c)) { depth++; } else if (')]}'.includes(c)) { depth--; }
    else if (c === ':' && depth === 1) { return true; }
  }
  return false;
}

const blank = (s: string) => s.replace(/[^\n]/g, ' ');

/** `{{-- --}}` and `@verbatim` blocks are text, not code — a `<script setup>` printed in one must not match. */
export function maskComments(source: string): string {
  return source.replace(/\{\{--[\s\S]*?--\}\}|@verbatim\b[\s\S]*?@endverbatim\b/g, blank);
}

/** Everything but the view-level declaration region: wrappers, scripts and styles blanked, offsets kept. */
function outsideRegion(masked: string): string {
  return masked.replace(/<(script|style|template|blade|sao:blade)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank);
}

/** Locate `<script setup>`; returns the body and its offset in `source`. */
export function setupBlock(source: string): { body: string; offset: number } | undefined {
  const m = /<script\b[^>]*\bsetup\b[^>]*>/i.exec(source);
  if (!m) { return undefined; }
  const end = source.indexOf('</script>', m.index + m[0].length);
  if (end < 0) { return undefined; }
  const offset = m.index + m[0].length;
  return { body: source.slice(offset, end), offset };
}

/** Rebuild the view as one TypeScript module with a source map back to `source` offsets. */
export function buildVirtual(source: string): Builder {
  const masked = maskComments(source);
  const block = setupBlock(masked) ?? { body: '', offset: 0 };
  const b = new Builder();
  for (const [name, type] of Object.entries(CLOSURE_NAMES)) { b.gen(`declare const ${name}: ${type};\n`); }
  const anyNames = new Set<string>();
  const states: string[] = [];
  const computed: string[] = [];

  const emit = (text: string, offset: number, declarationsOnly: boolean) => {
    let pos = 0;
    DECLARATION.lastIndex = 0;
    for (let m = DECLARATION.exec(text); m; m = DECLARATION.exec(text)) {
      const open = m.index + m[0].length - 1;
      const end = closeParen(text, open);
      if (end < 0) { break; }
      if (!declarationsOnly) { b.copy(text.slice(pos, m.index), offset + pos); }
      const innerStart = open + 1;
      const inner = text.slice(innerStart, end - 1);
      const kind = m[1];
      const trimmed = inner.trim();
      if (kind === 'importView') {
        const alias = /\bas\s+([A-Za-z_]\w*)\s*$/.exec(trimmed);
        if (alias) { anyNames.add(alias[1]); }
      } else if (kind === 'useState' || kind === 'assets') {
        names(inner).forEach(n => anyNames.add(n));
      } else if (trimmed.startsWith('{') && (kind === 'props' || kind === 'vars' || kind === 'state' || kind === 'states')) {
        // `{a = 1, b}` — TS binding pattern, copied as is. `{a: 1}` is not: names only.
        const colon = objectTypeColon(inner);
        const defaults = colon < 0 ? inner : inner.slice(0, colon);
        if (usesColonDefaults(defaults)) {
          names(defaults).forEach(n => anyNames.add(n));
          if (kind.startsWith('state')) { names(defaults).forEach(n => anyNames.add(setterOf(n))); }
        } else {
          b.gen('let ').copy(defaults, offset + innerStart);
          if (colon >= 0) { b.gen(': Partial<').copy(inner.slice(colon + 1), offset + innerStart + colon + 1).gen('>'); }
          b.gen(' = __data__;');
          if (kind.startsWith('state')) { states.push(...names(defaults)); }
        }
      } else if (kind === 'computed') {
        // ponytail: only `get$name()` exists at runtime; the bare name is left visible so a
        // computed can read an earlier one the way the compiler allows. Bare reads in setup
        // functions therefore pass here although they throw at runtime.
        b.gen('const ').copy(inner, offset + innerStart).gen(';');
        computed.push(...names(inner));
      } else if (kind === 'const' || kind === 'asset') {
        b.gen('const ').copy(inner, offset + innerStart).gen(';');
      } else {
        b.gen('let ').copy(inner, offset + innerStart).gen(';');
        if (kind.startsWith('state')) { states.push(...names(inner)); }
      }
      b.gen('\n');
      pos = end;
    }
    if (!declarationsOnly) { b.copy(text.slice(pos), offset + pos); }
  };

  // Declarations outside the script share the view scope and are hoisted before it.
  emit(outsideRegion(masked), 0, true);
  emit(block.body, block.offset, false);
  // Module scope: top-level names must not collide with lib.dom globals (`status`, `name`…).
  b.gen('\nexport {};\n');
  for (const n of anyNames) { b.gen(`declare let ${n}: any;\n`); }
  for (const n of states) { b.gen(`declare function ${setterOf(n)}(value: typeof ${n}): void;\n`); }
  for (const n of computed) { b.gen(`declare function get$${n}(): typeof ${n};\n`); }
  return b;
}

export function checkSetup(source: string): SetupDiagnostic[] {
  const virtual = buildVirtual(source);
  const fileName = '/__setup__.ts';
  const options: ts.CompilerOptions = {
    target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.ESNext, strict: false, noEmit: true,
    skipLibCheck: true, allowUnusedLabels: true, types: [],
  };
  const host = ts.createCompilerHost(options, true);
  const readFile = host.readFile;
  host.readFile = f => f === fileName ? virtual.text : readFile.call(host, f);
  const fileExists = host.fileExists;
  host.fileExists = f => f === fileName || fileExists.call(host, f);
  host.getSourceFile = (f, lang) => {
    const text = host.readFile(f);
    return text === undefined ? undefined : ts.createSourceFile(f, text, lang, true);
  };
  const program = ts.createProgram([fileName], options, host);
  const out: SetupDiagnostic[] = [];
  for (const d of ts.getPreEmitDiagnostics(program)) {
    if (d.category !== ts.DiagnosticCategory.Error || d.file?.fileName !== fileName || d.start === undefined || IGNORED.has(d.code)) { continue; }
    const start = virtual.toSource(d.start);
    if (start === undefined) { continue; }
    out.push({ start, length: d.length || 1, message: ts.flattenDiagnosticMessageText(d.messageText, '\n'), code: d.code });
  }
  return out;
}

// =============================================
// Template: undeclared names in {{ }}, @directive(...), #directive(...), :attr="..."
// =============================================
// Heuristic, not a type check: every identifier read as a value must be a
// view-scope name, a template-local declaration, a loop variable or a known
// global. Calls are never flagged (unknown callees route to App.Helper).

/** Usable in any template expression without a declaration. */
const TEMPLATE_GLOBALS = [
  // handler argument, forward-as-is handler (`<Card @edit(emit)>`), JS globals read as values
  'event', 'emit', 'undefined', 'NaN', 'Infinity', 'Math', 'JSON', 'Date', 'String', 'Number', 'Boolean',
  'Array', 'Object', 'console', 'window', 'document', 'globalThis',
  // Blade / Laravel
  'loop', 'slot', 'errors', 'attributes', 'message', 'request', 'auth', 'session', 'user', 'app', 'config',
];

const TEMPLATE_DECLARATIONS = /^(props|vars|states?|let|const|computed|assets?|useState|import|importView)$/;

/** Every name a template can reference from the view scope (compiled closure + declarations + setup). */
export function viewScope(source: string): Set<string> {
  const scope = new Set<string>();
  for (const g of TEMPLATE_GLOBALS) { scope.add(g); scope.add('$' + g); }
  const file = ts.createSourceFile('/__scope__.ts', buildVirtual(source).text, ts.ScriptTarget.Latest, true);
  const bind = (name: ts.BindingName | ts.Identifier | ts.PropertyName | undefined) => {
    if (!name) { return; }
    if (ts.isIdentifier(name) || ts.isPrivateIdentifier(name) || ts.isStringLiteral(name)) { scope.add(name.text); }
    else if (ts.isObjectBindingPattern(name) || ts.isArrayBindingPattern(name)) {
      for (const e of name.elements) { if (ts.isBindingElement(e)) { bind(e.name); } }
    }
  };
  for (const st of file.statements) {
    if (ts.isVariableStatement(st)) { st.declarationList.declarations.forEach(d => bind(d.name)); }
    else if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isEnumDeclaration(st)) { bind(st.name); }
    else if (ts.isImportDeclaration(st) && st.importClause) {
      bind(st.importClause.name);
      const nb = st.importClause.namedBindings;
      if (nb) { ts.isNamespaceImport(nb) ? bind(nb.name) : nb.elements.forEach(e => bind(e.name)); }
    } else if (ts.isExportAssignment(st) && ts.isObjectLiteralExpression(st.expression)) {
      // legacy `export default { method() {} }` — methods are reachable from the template
      st.expression.properties.forEach(p => bind(p.name));
    }
  }
  return scope;
}

interface Token { kind: ts.SyntaxKind; text: string; pos: number }

/** Tokens of one expression; template literals are rescanned so `${x}` yields `x`. */
function tokenize(expr: string): Token[] {
  const sc = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, expr);
  const out: Token[] = [];
  const templates: number[] = [];
  let braces = 0;
  for (let kind = sc.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = sc.scan()) {
    if (kind === ts.SyntaxKind.OpenBraceToken) { braces++; }
    if (kind === ts.SyntaxKind.CloseBraceToken) {
      if (templates.length && templates[templates.length - 1] === braces) {
        templates.pop();
        kind = sc.reScanTemplateToken(false);
      } else { braces--; }
    }
    if (kind === ts.SyntaxKind.TemplateHead || kind === ts.SyntaxKind.TemplateMiddle) { templates.push(braces); }
    out.push({ kind, text: sc.getTokenText(), pos: sc.getTokenStart() });
  }
  return out;
}

/** Parameters of every arrow function in the expression: `(id, {tag}) => …`, `id => …`, `(...args) => …`. */
function arrowParams(tokens: Token[]): Set<string> {
  const K = ts.SyntaxKind;
  const params = new Set<string>();
  tokens.forEach((t, j) => {
    if (t.kind !== K.EqualsGreaterThanToken || j === 0) { return; }
    const before = tokens[j - 1];
    if (before.kind === K.Identifier) { params.add(before.text); return; }
    if (before.kind !== K.CloseParenToken) { return; }
    let depth = 0;
    for (let i = j - 1; i >= 0; i--) {
      if (tokens[i].kind === K.CloseParenToken) { depth++; }
      else if (tokens[i].kind === K.OpenParenToken && --depth === 0) { break; }
      else if (tokens[i].kind === K.Identifier) { params.add(tokens[i].text); }
    }
  });
  return params;
}

/** Identifiers read as values: not members, not callees, not object keys, not arrow parameters. */
function reads(tokens: Token[]): Token[] {
  const K = ts.SyntaxKind;
  const out: Token[] = [];
  const params = arrowParams(tokens);
  let braces = 0;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i], prev = tokens[i - 1], next = tokens[i + 1];
    if (t.kind === K.OpenBraceToken) { braces++; } else if (t.kind === K.CloseBraceToken) { braces--; }
    if (t.kind !== K.Identifier || params.has(t.text)) { continue; }
    if (prev && (prev.kind === K.DotToken || prev.kind === K.QuestionDotToken)) { continue; }
    if (next && next.kind === K.OpenParenToken) { continue; }
    if (braces > 0 && next && next.kind === K.ColonToken && prev && (prev.kind === K.OpenBraceToken || prev.kind === K.CommaToken)) { continue; }
    out.push(t);
  }
  return out;
}

/** `list as row` / `list as key => value` / `'x' as Card`: check the left, declare the right. */
function splitAs(tokens: Token[]): { check: Token[]; declare: Token[] } {
  const i = tokens.findIndex(t => t.kind === ts.SyntaxKind.AsKeyword);
  if (i < 0) { return { check: tokens, declare: [] }; }
  return { check: tokens.slice(0, i), declare: tokens.slice(i + 1).filter(t => t.kind === ts.SyntaxKind.Identifier) };
}

export function checkTemplate(source: string): SetupDiagnostic[] {
  const masked = maskComments(source);
  const scope = viewScope(masked);
  const region = masked
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, blank)
    .replace(/@php\b[\s\S]*?@endphp\b/g, blank);
  const expressions: { text: string; offset: number }[] = [];

  // @name(args) and #name(args)
  const directive = /(?<![\w&])[@#]([A-Za-z_]\w*)\s*\(/g;
  for (let m = directive.exec(region); m; m = directive.exec(region)) {
    const open = m.index + m[0].length - 1;
    const end = closeParen(region, open);
    if (end < 0) { continue; }
    const inner = region.slice(open + 1, end - 1);
    if (TEMPLATE_DECLARATIONS.test(m[1])) {
      // ponytail: template-local declarations are visible file-wide, values not checked
      names(inner).forEach(n => { scope.add(n); if (/^states?$/.test(m![1])) { scope.add(setterOf(n)); } });
      const alias = /\bas\s+([A-Za-z_]\w*)\s*$/.exec(inner);
      if (alias) { scope.add(alias[1]); }
    } else if (m[1] === 'for') {
      const v = /^\s*(?:let|const|var)?\s*([A-Za-z_]\w*)/.exec(inner);
      if (v) { scope.add(v[1]); }
      expressions.push({ text: inner, offset: open + 1 });
    } else {
      expressions.push({ text: inner, offset: open + 1 });
    }
    directive.lastIndex = end;
  }
  // {{ expr }} / {!! expr !!}
  const output = /\{\{(?!--)([\s\S]*?)\}\}|\{!!([\s\S]*?)!!\}/g;
  for (let m = output.exec(region); m; m = output.exec(region)) {
    const text = m[1] ?? m[2];
    expressions.push({ text, offset: m.index + (m[1] !== undefined ? 2 : 3) });
  }
  // :attr="expr"
  const binding = /(?<=\s):[A-Za-z_][\w-]*\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  for (let m = binding.exec(region); m; m = binding.exec(region)) {
    const text = m[1] ?? m[2];
    expressions.push({ text, offset: m.index + m[0].length - text.length - 1 });
  }

  // Loop variables first: they are visible to everything after, and order of discovery is not source order.
  const tokenized = expressions.map(e => ({ ...e, tokens: tokenize(e.text) }));
  for (const e of tokenized) {
    const { declare } = splitAs(e.tokens);
    declare.forEach(t => scope.add(t.text));
  }
  const out: SetupDiagnostic[] = [];
  for (const e of tokenized) {
    for (const t of reads(splitAs(e.tokens).check)) {
      if (scope.has(t.text)) { continue; }
      out.push({ start: e.offset + t.pos, length: t.text.length, code: 2304,
        message: `'${t.text}' is not declared. Use @let, @const, @computed, @state, @vars, or @props.` });
    }
  }
  return out;
}
