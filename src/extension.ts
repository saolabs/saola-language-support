import * as vscode from 'vscode';
import { SaoFormatter } from './formatters/saoFormatter';

const BLADE_DIRECTIVES = [
  // === Laravel Blade - Control Flow ===
  { label: '@if', detail: 'Conditional if statement', insertText: '@if(${1:condition})\n\t$0\n@endif' },
  { label: '@else', detail: 'Else clause' },
  { label: '@elseif', detail: 'Else if clause', insertText: '@elseif(${1:condition})' },
  { label: '@endif', detail: 'End if block' },
  { label: '@unless', detail: 'Unless condition (inverse if)', insertText: '@unless(${1:condition})\n\t$0\n@endunless' },
  { label: '@endunless', detail: 'End unless block' },
  { label: '@switch', detail: 'Switch statement', insertText: '@switch(${1:expression})\n\t@case(${2:value})\n\t\t$0\n\t\t@break\n\t@default\n\t\t\n@endswitch' },
  { label: '@case', detail: 'Case in switch', insertText: '@case(${1:value})' },
  { label: '@default', detail: 'Default case' },
  { label: '@break', detail: 'Break switch case' },
  { label: '@endswitch', detail: 'End switch block' },

  // === Laravel Blade - Loops ===
  { label: '@foreach', detail: 'Loop through items (Modern)', insertText: '@foreach(${1:items} as ${2:item})\n\t$0\n@endforeach' },
  { label: '@endforeach', detail: 'End foreach loop' },
  { label: '@forelse', detail: 'Loop with empty fallback (Modern)', insertText: '@forelse(${1:items} as ${2:item})\n\t$0\n@empty\n\t\n@endforelse' },
  { label: '@endforelse', detail: 'End forelse loop' },
  { label: '@for', detail: 'For loop (Modern)', insertText: '@for(${1:i = 0; i < 10; i++})\n\t$0\n@endfor' },
  { label: '@endfor', detail: 'End for loop' },
  { label: '@while', detail: 'While loop', insertText: '@while(${1:condition})\n\t$0\n@endwhile' },
  { label: '@endwhile', detail: 'End while loop' },
  { label: '@each', detail: 'Render view for each item', insertText: '@each(\'${1:view}\', ${2:\$items}, \'${3:item}\')' },
  { label: '@continue', detail: 'Continue to next iteration' },

  // === Laravel Blade - Auth & Permissions ===
  { label: '@auth', detail: 'Check if authenticated', insertText: '@auth\n\t$0\n@endauth' },
  { label: '@endauth', detail: 'End auth block' },
  { label: '@guest', detail: 'Check if guest', insertText: '@guest\n\t$0\n@endguest' },
  { label: '@endguest', detail: 'End guest block' },
  { label: '@can', detail: 'Check authorization ability', insertText: '@can(\'${1:ability}\')\n\t$0\n@endcan' },
  { label: '@endcan', detail: 'End can block' },
  { label: '@cannot', detail: 'Check cannot (inverse can)', insertText: '@cannot(\'${1:ability}\')\n\t$0\n@endcannot' },
  { label: '@endcannot', detail: 'End cannot block' },
  { label: '@canany', detail: 'Check any of multiple abilities', insertText: '@canany([${1:\'ability1\', \'ability2\'}])\n\t$0\n@endcanany' },
  { label: '@endcanany', detail: 'End canany block' },

  // === Laravel Blade - Layout & Sections ===
  { label: '@section', detail: 'Define section', insertText: '@section(\'${1:name}\')\n\t$0\n@endsection' },
  { label: '@endsection', detail: 'End section' },
  { label: '@yield', detail: 'Output section content', insertText: '@yield(\'${1:name}\')' },
  { label: '@extends', detail: 'Extend parent layout', insertText: '@extends(\'${1:layout}\')' },
  { label: '@include', detail: 'Include partial view', insertText: '@include(\'${1:view}\')' },
  { label: '@includeIf', detail: 'Include if exists', insertText: '@includeIf(\'${1:view}\')' },
  { label: '@includeWhen', detail: 'Include when condition true', insertText: '@includeWhen(${1:condition}, \'${2:view}\')' },
  { label: '@includeUnless', detail: 'Include unless condition true', insertText: '@includeUnless(${1:condition}, \'${2:view}\')' },
  { label: '@includeFirst', detail: 'Include first existing view', insertText: '@includeFirst([${1:\'view1\', \'view2\'}])' },
  { label: '@hasSection', detail: 'Check if section has content', insertText: '@hasSection(\'${1:name}\')' },
  { label: '@sectionMissing', detail: 'Check if section is missing', insertText: '@sectionMissing(\'${1:name}\')' },

  // === Laravel Blade - Components & Slots ===
  { label: '@component', detail: 'Include component', insertText: '@component(\'${1:component}\')\n\t$0\n@endcomponent' },
  { label: '@endcomponent', detail: 'End component block' },
  { label: '@slot', detail: 'Define component slot', insertText: '@slot(\'${1:name}\')\n\t$0\n@endslot' },
  { label: '@endslot', detail: 'End slot block' },
  { label: '@aware', detail: 'Access parent component variables' },

  // === Laravel Blade - Stacks ===
  { label: '@push', detail: 'Push content to stack', insertText: '@push(\'${1:name}\')\n\t$0\n@endpush' },
  { label: '@endpush', detail: 'End push block' },
  { label: '@pushOnce', detail: 'Push content to stack once', insertText: '@pushOnce(\'${1:name}\')\n\t$0\n@endPushOnce' },
  { label: '@endPushOnce', detail: 'End pushOnce block' },
  { label: '@pushIf', detail: 'Push to stack if condition', insertText: '@pushIf(${1:condition}, \'${2:name}\')\n\t$0\n@endPushIf' },
  { label: '@endPushIf', detail: 'End pushIf block' },
  { label: '@prepend', detail: 'Prepend content to stack', insertText: '@prepend(\'${1:name}\')\n\t$0\n@endprepend' },
  { label: '@endprepend', detail: 'End prepend block' },
  { label: '@prependOnce', detail: 'Prepend to stack once', insertText: '@prependOnce(\'${1:name}\')\n\t$0\n@endPrependOnce' },
  { label: '@endPrependOnce', detail: 'End prependOnce block' },
  { label: '@stack', detail: 'Render stack content', insertText: '@stack(\'${1:name}\')' },

  // === Laravel Blade - Conditional Classes & Attributes ===
  { label: '@class', detail: 'Conditionally apply classes', insertText: '@class([${1:\'class\' => condition}])' },
  { label: '@style', detail: 'Conditionally apply styles', insertText: '@style([${1:\'property: value\' => condition}])' },
  { label: '@checked', detail: 'Bind checked attribute', insertText: '@checked(${1:condition})' },
  { label: '@selected', detail: 'Bind selected attribute', insertText: '@selected(${1:condition})' },
  { label: '@disabled', detail: 'Bind disabled attribute', insertText: '@disabled(${1:condition})' },
  { label: '@readonly', detail: 'Bind readonly attribute', insertText: '@readonly(${1:condition})' },
  { label: '@required', detail: 'Bind required attribute', insertText: '@required(${1:condition})' },

  // === Laravel Blade - Forms & Security ===
  { label: '@csrf', detail: 'CSRF token field' },
  { label: '@method', detail: 'HTTP method spoofing', insertText: '@method(\'${1:PUT}\')' },
  { label: '@error', detail: 'Show validation error', insertText: '@error(\'${1:field}\')\n\t$0\n@enderror' },
  { label: '@enderror', detail: 'End error block' },

  // === Laravel Blade - Conditions ===
  { label: '@isset', detail: 'Check if variable set', insertText: '@isset(${1:\$variable})\n\t$0\n@endisset' },
  { label: '@endisset', detail: 'End isset block' },
  { label: '@empty', detail: 'Check if empty', insertText: '@empty(${1:\$variable})\n\t$0\n@endempty' },
  { label: '@endempty', detail: 'End empty block' },
  { label: '@env', detail: 'Check environment', insertText: '@env(\'${1:local}\')\n\t$0\n@endenv' },
  { label: '@endenv', detail: 'End env block' },
  { label: '@production', detail: 'Check if production', insertText: '@production\n\t$0\n@endproduction' },
  { label: '@endproduction', detail: 'End production block' },

  // === Laravel Blade - Rendering ===
  { label: '@once', detail: 'Render block once', insertText: '@once\n\t$0\n@endonce' },
  { label: '@endonce', detail: 'End once block' },
  { label: '@verbatim', detail: 'Display raw Blade syntax', insertText: '@verbatim\n\t$0\n@endverbatim' },
  { label: '@endverbatim', detail: 'End verbatim block' },
  { label: '@comment', detail: 'Blade comment block', insertText: '@comment\n\t$0\n@endcomment' },
  { label: '@endcomment', detail: 'End comment block' },

  // === Laravel Blade - PHP & Data ===
  { label: '@php', detail: 'Inline PHP code', insertText: '@php\n\t$0\n@endphp' },
  { label: '@endphp', detail: 'End PHP block' },
  { label: '@json', detail: 'JSON encode output', insertText: '@json(${1:\$data})' },
  { label: '@js', detail: 'JS encode output', insertText: '@js(${1:\$data})' },
  { label: '@dump', detail: 'Dump variable for debugging', insertText: '@dump(${1:variable})' },
  { label: '@dd', detail: 'Dump and die for debugging', insertText: '@dd(${1:variable})' },
  { label: '@use', detail: 'Use PHP class in template', insertText: '@use(\'${1:App\\Models\\User}\')' },
  { label: '@session', detail: 'Access session data', insertText: '@session(\'${1:key}\')' },
  { label: '@lang', detail: 'Translate language string', insertText: '@lang(\'${1:messages.key}\')' },

  // ======================================
  // ======================================
  // Saola Custom Directives (Modern Syntax)
  // ======================================

  // --- Data & Variables ---
  { label: '@import', detail: 'Import template/component', insertText: '@import(${1:__template__ + \'path\'} as ${2:Name})' },
  { label: '@props', detail: 'Declare component properties', insertText: '@props(${1:title, theme=\'dark\'})' },
  { label: '@vars', detail: 'Declare non-reactive variables', insertText: '@vars(${1:users, posts})' },
  { label: '@let', detail: 'Declare mutable local variable', insertText: '@let(${1:varName = value})' },
  { label: '@const', detail: 'Declare immutable constant', insertText: '@const(${1:NAME = value})' },

  // --- Reactive State ---
  { label: '@states', detail: 'Declare reactive state (JS Object)', insertText: '@states({\n\t${1:count: 0}\n})' },
  { label: '@state', detail: 'Declare reactive state (assignment)', insertText: '@state(\n\t${1:varName = value}\n)' },
  { label: '@useState', detail: 'Declare reactive state (Legacy)', insertText: '@useState(${1:\$state}, ${2:initialValue})' },

  // --- Utility ---
  { label: '@exec', detail: 'Execute expression silently', insertText: '@exec(${1:varName = value})' },
  { label: '@out', detail: 'Output variable (unescaped)', insertText: '@out(${1:variable})' },

  // --- Attribute Binding ---
  { label: '@bind', detail: 'Two-way data binding (v-model)', insertText: '@bind(${1:variable})' },
  { label: '@val', detail: 'Bind value attribute', insertText: '@val(${1:variable})' },
  { label: '@attr', detail: 'Dynamic attributes', insertText: '@attr({${1:name: value}})' },
  { label: '@class', detail: 'Dynamic CSS classes', insertText: '@class([${1:\'class\': condition}])' },
  { label: '@style', detail: 'Dynamic inline styles', insertText: '@style({${1:\'property\': value}})' },
  { label: '@show', detail: 'Toggle visibility (display: none)', insertText: '@show(${1:condition})' },
  { label: '@hide', detail: 'Hide element (display: none)', insertText: '@hide(${1:condition})' },

  // --- Event Handling ---
  { label: '@click', detail: 'Click events', insertText: '@click(${1:handler()})' },
  { label: '@input', detail: 'Input events', insertText: '@input(${1:handler()})' },
  { label: '@change', detail: 'Change events', insertText: '@change(${1:handler()})' },
  { label: '@submit', detail: 'Form submit events', insertText: '@submit(${1:handler()})' },
  { label: '@keyup', detail: 'Key up events', insertText: '@keyup(${1:handler(event)})' },
  { label: '@keydown', detail: 'Key down events', insertText: '@keydown(${1:handler(event)})' },
  { label: '@keypress', detail: 'Key press events', insertText: '@keypress(${1:handler(event)})' },
  { label: '@focus', detail: 'Focus events', insertText: '@focus(${1:handler()})' },
  { label: '@blur', detail: 'Blur events', insertText: '@blur(${1:handler()})' },
  { label: '@mouseenter', detail: 'Mouse enter events', insertText: '@mouseenter(${1:handler()})' },
  { label: '@mouseleave', detail: 'Mouse leave events', insertText: '@mouseleave(${1:handler()})' },
  { label: '@mouseover', detail: 'Mouse over events', insertText: '@mouseover(${1:handler()})' },
  { label: '@mouseout', detail: 'Mouse out events', insertText: '@mouseout(${1:handler()})' },
  { label: '@dblclick', detail: 'Double click events', insertText: '@dblclick(${1:handler()})' },
  { label: '@contextmenu', detail: 'Context menu (right-click)', insertText: '@contextmenu(${1:handler()})' },
  { label: '@wheel', detail: 'Mouse wheel events', insertText: '@wheel(${1:handler()})' },
  { label: '@scroll', detail: 'Scroll events', insertText: '@scroll(${1:handler()})' },
  { label: '@resize', detail: 'Resize events', insertText: '@resize(${1:handler()})' },
  { label: '@load', detail: 'Load events', insertText: '@load(${1:handler()})' },

  // --- View Structure ---
  { label: '@view', detail: 'Configure view/component', insertText: '@view(${1::subscribe})' },
  { label: '@wrapper', detail: 'Wrap content in component', insertText: '@wrapper(\'${1:component}\')' },
  { label: '@block', detail: 'Define content block', insertText: '@block(\'${1:name}\')\n\t$0\n@endblock' },
  { label: '@endblock', detail: 'End block' },
  { label: '@useBlock', detail: 'Render block content', insertText: '@useBlock(\'${1:name}\')' },
  { label: '@mountBlock', detail: 'Mount block (alias)', insertText: '@mountBlock(\'${1:name}\')' },

  // --- Async ---
  { label: '@fetch', detail: 'Fetch data from API', insertText: '@fetch(\'${1:/api/endpoint}\')' },
  { label: '@await', detail: 'Mark component as async', insertText: '@await' },

  // --- Lifecycle & Scripts ---
  { label: '@register', detail: 'Register component lifecycle', insertText: '@register\n\t$0\n@endregister' },
  { label: '@endregister', detail: 'End register block' },
  { label: '@script', detail: 'Inline component script', insertText: '@script\n\t$0\n@endscript' },
  { label: '@endscript', detail: 'End script block' },
  { label: '@setup', detail: 'Setup component initialization', insertText: '@setup\n\t$0\n@endsetup' },
  { label: '@endsetup', detail: 'End setup block' },
];

class OneDirectiveCompletionProvider implements vscode.CompletionItemProvider {
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
    context: vscode.CompletionContext
  ): vscode.ProviderResult<vscode.CompletionItem[] | vscode.CompletionList> {
    const line = document.lineAt(position).text;
    const beforeCursor = line.substring(0, position.character);

    // Only suggest if @ is typed
    if (!beforeCursor.includes('@')) {
      return [];
    }

    const lastAtIndex = beforeCursor.lastIndexOf('@');
    const afterAt = beforeCursor.substring(lastAtIndex + 1);

    // Don't suggest if we're inside a string or already past valid directive characters
    if (/[^a-zA-Z]/.test(afterAt) && afterAt.length > 0) {
      return [];
    }

    return BLADE_DIRECTIVES
      .filter(d => d.label.substring(1).toLowerCase().startsWith(afterAt.toLowerCase()))
      .map(directive => {
        const item = new vscode.CompletionItem(
          directive.label,
          vscode.CompletionItemKind.Keyword
        );
        item.detail = directive.detail;
        item.range = new vscode.Range(
          new vscode.Position(position.line, lastAtIndex),
          position
        );
        // Add snippet insert text if available
        if ((directive as any).insertText) {
          item.insertText = new vscode.SnippetString((directive as any).insertText);
        }
        return item;
      });
  }
}

// =============================================
// ONE Variable Diagnostic Provider
// =============================================

// Variables always implicitly available in OneJS templates
const _IMPLICIT_VARS = new Set([
  // OneJS system variables
  '__base__', '__layout__', '__page__', '__component__',
  '__template__', '__context__', '__partial__', '__system__',
  '__env', '__helper',
  // Common Blade/Laravel implicit variables
  'loop', 'this', 'errors', 'message', 'slot',
  'app', 'request', 'auth', 'session', 'user',
]);
// PHP superglobals: $_GET, $_POST, $_SESSION, $_COOKIE, $_SERVER, $_FILES, $_ENV, $GLOBALS
const _IS_PHP_SUPERGLOBAL = (v: string) => /^_[A-Z]/.test(v) || v === 'GLOBALS';

function _isSaoDocument(doc: vscode.TextDocument): boolean {
  return doc.languageId === 'saola' || doc.languageId === 'sao' || doc.fileName.endsWith('.sao');
}

type SaoMode = 'modern' | 'legacy';

function _detectSaoMode(text: string): { mode: SaoMode, firstWrapperLine: number } {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.match(/^<(template|sao:blade)\b/i)) {
      return { mode: 'modern', firstWrapperLine: i };
    }
    if (line.match(/^<blade\b/i)) {
      return { mode: 'legacy', firstWrapperLine: i };
    }
  }
  // If no wrapper found, it's modern by default
  return { mode: 'modern', firstWrapperLine: -1 };
}

function _addAssignedVars(expr: string, vars: Set<string>, mode: SaoMode): void {
  if (mode === 'legacy') {
    const destructM = expr.match(/^\s*\[([^\]]+)\]\s*=/);
    if (destructM) {
      for (const m of destructM[1].matchAll(/\$(\w+)/g)) { vars.add(m[1]); }
      return;
    }
    for (const m of expr.matchAll(/\$(\w+)\s*=/g)) { vars.add(m[1]); }
  } else {
    // Modern: let x = 1, const [y, setY] = useState(0)
    const destructM = expr.match(/^\s*\[([^\]]+)\]\s*=/);
    if (destructM) {
       for (const m of destructM[1].matchAll(/\w+/g)) { vars.add(m[0]); }
       return;
    }
    for (const m of expr.matchAll(/(\w+)\s*=/g)) { vars.add(m[1]); }
  }
}

function _addDeclarationVars(content: string, vars: Set<string>, mode: SaoMode): void {
  if (mode === 'legacy') {
    const arrayM = content.match(/^\s*\[([\s\S]*)\]\s*$/);
    if (arrayM) {
      _collectArrayKeys(arrayM[1], vars);
      return;
    }
    for (const m of content.matchAll(/\$(\w+)/g)) { vars.add(m[1]); }
  } else {
    // Modern: @props(a, b = 1) or @vars(x, y)
    for (const m of content.matchAll(/(\w+)/g)) {
      vars.add(m[1]);
    }
  }
}

function _addStates(content: string, vars: Set<string>): void {
  // Parse simple JS object literal keys: { count: 0, user: {} }
  for (const m of content.matchAll(/(\w+)\s*:/g)) {
    const key = m[1];
    vars.add(key);
    // Add setter: setKey
    vars.add('set' + key.charAt(0).toUpperCase() + key.slice(1));
  }
}

function _addUseStateVars(content: string, vars: Set<string>): void {
  const arrayM = content.match(/^\s*\[([\s\S]*)\]\s*$/);
  if (arrayM) {
    _collectArrayKeys(arrayM[1], vars);
    // Also add setter functions for each state variable
    const keys = new Set<string>();
    _collectArrayKeys(arrayM[1], keys);
    for (const key of keys) {
      vars.add('set' + key.charAt(0).toUpperCase() + key.slice(1));
    }
  } else {
    // Single variable case: @useState($state)
    const assignM = content.match(/^\s*\$(\w+)/);
    if (assignM) {
      vars.add(assignM[1]);
      vars.add('set' + assignM[1].charAt(0).toUpperCase() + assignM[1].slice(1));
    }
  }
}

function _collectArrayKeys(content: string, vars: Set<string>): void {
  // Check if this is an associative array (contains =>)
  const isAssociative = content.includes('=>');

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  let quoteStart = -1;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }

    if (inSingle || inDouble) {
      const closeQuote = inSingle ? "'" : '"';
      if (ch === closeQuote) {
        const key = content.slice(quoteStart + 1, i);
        const remainder = content.slice(i + 1).trimStart();
        if (isAssociative) {
          // For associative arrays: only add keys (before =>)
          if (depth === 0 && remainder.startsWith('=>')) {
            vars.add(key);
          }
        } else {
          // For simple arrays: add all quoted values
          if (depth === 0 && (remainder.startsWith(',') || remainder.startsWith(']') || remainder === '')) {
            vars.add(key);
          }
        }
        inSingle = false;
        inDouble = false;
        quoteStart = -1;
      }
      continue;
    }

    if (ch === "'") {
      inSingle = true;
      quoteStart = i;
      continue;
    }
    if (ch === '"') {
      inDouble = true;
      quoteStart = i;
      continue;
    }

    if (ch === '[') {
      depth += 1;
      continue;
    }
    if (ch === ']') {
      depth = Math.max(0, depth - 1);
      continue;
    }
  }
}

function _extractDirectiveContent(lines: string[], startIndex: number): string {
  const firstLine = lines[startIndex];
  const openParenIndex = firstLine.indexOf('(');
  if (openParenIndex < 0) { return ''; }

  let depth = 0;
  let inSingle = false;
  let inDouble = false;
  let escaped = false;
  let content = '';

  for (let lineIndex = startIndex; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const startPos = lineIndex === startIndex ? openParenIndex + 1 : 0;

    for (let charIndex = startPos; charIndex < line.length; charIndex++) {
      const ch = line[charIndex];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        if (lineIndex === startIndex || charIndex > startPos) {
          content += ch;
        }
        continue;
      }

      if (inSingle || inDouble) {
        content += ch;
        const closeQuote = inSingle ? "'" : '"';
        if (ch === closeQuote) {
          inSingle = false;
          inDouble = false;
        }
        continue;
      }

      if (ch === "'") {
        inSingle = true;
        content += ch;
        continue;
      }
      if (ch === '"') {
        inDouble = true;
        content += ch;
        continue;
      }

      if (ch === '(') {
        depth += 1;
        content += ch;
        continue;
      }
      if (ch === ')') {
        if (depth === 0) {
          return content;
        }
        depth -= 1;
        content += ch;
        continue;
      }

      content += ch;
    }

    if (lineIndex > startIndex) {
      content += '\n';
    }
  }

  return content;
}

function _collectDeclaredVars(text: string): Set<string> {
  const vars = new Set<string>(_IMPLICIT_VARS);
  const { mode } = _detectSaoMode(text);
  const lines = text.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    if (t.match(/^@states\((.+)/)) { _addStates(_extractDirectiveContent(lines, i), vars); continue; }
    if (t.match(/^@let\((.+)/))    { _addAssignedVars(_extractDirectiveContent(lines, i), vars, mode); continue; }
    if (t.match(/^@const\((.+)/))  { _addAssignedVars(_extractDirectiveContent(lines, i), vars, mode); continue; }
    if (t.startsWith('@useState(')) {
      const content = _extractDirectiveContent(lines, i);
      _addUseStateVars(content, vars);
      continue;
    }
    if (t.match(/^@vars\((.+)/))   { _addDeclarationVars(_extractDirectiveContent(lines, i), vars, mode); continue; }
    if (t.match(/^@props\((.+)/))  { _addDeclarationVars(_extractDirectiveContent(lines, i), vars, mode); continue; }
    
    // Scoped loop vars
    if (mode === 'legacy') {
      let m: RegExpMatchArray | null;
      if ((m = t.match(/^@fo(?:reach|relse)\(.+\bas\b\s+\$(\w+)\s*=>\s*\$(\w+)/))) {
        vars.add(m[1]); vars.add(m[2]); continue;
      }
      if ((m = t.match(/^@fo(?:reach|relse)\(.+\bas\b\s+\$(\w+)/))) { vars.add(m[1]); continue; }
      if ((m = t.match(/^@for\(\s*\$(\w+)\s*=/))) { vars.add(m[1]); continue; }
    } else {
      let m: RegExpMatchArray | null;
      if ((m = t.match(/^@fo(?:reach|relse)\(.+\bas\b\s+(\w+)\s*,\s*(\w+)/))) {
        vars.add(m[1]); vars.add(m[2]); continue;
      }
      if ((m = t.match(/^@fo(?:reach|relse)\(.+\bas\b\s+(\w+)/))) { vars.add(m[1]); continue; }
      if ((m = t.match(/^@for\(\s*(\w+)\s*=/))) { vars.add(m[1]); continue; }
    }
  }
  return vars;
}

function _runAnalysis(document: vscode.TextDocument, collection: vscode.DiagnosticCollection): vscode.Diagnostic[] {
  if (!_isSaoDocument(document)) { return []; }

  const text = document.getText();
  const diagnostics: vscode.Diagnostic[] = [];
  
  const { mode, firstWrapperLine } = _detectSaoMode(text);

  // Check for priority rule violations (multiple level-0 wrappers)
  const lines = text.split('\n');
  let wrapperCount = 0;
  let firstWrapperType = '';
  for (let i = 0; i < lines.length; i++) {
    const t = lines[i].trim();
    const mw = t.match(/^<(template|sao:blade|blade)\b/i);
    if (mw) {
      wrapperCount++;
      if (wrapperCount === 1) firstWrapperType = mw[1].toLowerCase();
      if (wrapperCount > 1) {
        diagnostics.push(new vscode.Diagnostic(
          new vscode.Range(i, 0, i, lines[i].length),
          `Multiple level-0 wrappers detected. Only the first wrapper (<${firstWrapperType}>) will be processed.`,
          vscode.DiagnosticSeverity.Warning
        ));
      }
    }
  }

  // Variable undeclared checks only work reliably in legacy mode (PHP $variable syntax).
  // In modern mode, identifiers have no $ prefix so we cannot distinguish
  // variables from function names, HTML attributes, CSS properties, etc.
  if (mode === 'legacy') {
    const globalVars = _collectDeclaredVars(text);
    const scopeStack: Set<string>[] = [new Set(globalVars)];
    const isVarDeclared = (v: string) => scopeStack.some(s => s.has(v));
    const declareInCurrentScope = (v: string) => scopeStack[scopeStack.length - 1].add(v);

    const LOOP_CLOSE_RE    = /^@end(foreach|forelse|for|while)\b/i;
    const LOOP_OPEN_RE     = /^@(foreach|forelse|for|while)\b/i;
    const IF_ASSIGN_RE     = /@(?:if|elseif)\([^\n]*?\(\s*\$(\w+)\s*=[^=]/i;
    const SCRIPT_OPEN_RE   = /^<script\b/i;
    const SCRIPT_CLOSE_RE  = /^<\/script>/i;
    const STYLE_OPEN_RE    = /^<style\b/i;
    const STYLE_CLOSE_RE   = /^<\/style>/i;

    let lineStart = 0;
    let inScriptOrStyle = false;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const t = line.trim();

      if (SCRIPT_OPEN_RE.test(t) || STYLE_OPEN_RE.test(t)) {
        inScriptOrStyle = true;
      }

      if (inScriptOrStyle) {
        if (SCRIPT_CLOSE_RE.test(t) || STYLE_CLOSE_RE.test(t)) inScriptOrStyle = false;
        lineStart += line.length + 1;
        continue;
      }

      if (LOOP_CLOSE_RE.test(t) && scopeStack.length > 1) {
        scopeStack.pop();
      }

      if (LOOP_OPEN_RE.test(t)) {
        const newScope = new Set<string>();
        const kvM = t.match(/\bas\b\s+\$(\w+)\s*=>\s*\$(\w+)/i);
        if (kvM) { newScope.add(kvM[1]); newScope.add(kvM[2]); }
        else {
          const asM = t.match(/\bas\b\s+\$(\w+)/i);
          if (asM) { newScope.add(asM[1]); }
        }
        const forM = t.match(/^@for\(\s*\$(\w+)\s*=/i);
        if (forM) { newScope.add(forM[1]); }
        scopeStack.push(newScope);
      }

      // Global declarations in directives
      let declMatch: RegExpMatchArray | null;
      if ((declMatch = t.match(/^@let\((.+)/))) { _addAssignedVars(_extractDirectiveContent(lines, i), scopeStack[0], mode); }
      if ((declMatch = t.match(/^@const\((.+)/))) { _addAssignedVars(_extractDirectiveContent(lines, i), scopeStack[0], mode); }
      if (t.startsWith('@useState(')) {
        _addUseStateVars(_extractDirectiveContent(lines, i), scopeStack[0]);
      }
      if ((declMatch = t.match(/^@vars\((.+)/))) { _addDeclarationVars(_extractDirectiveContent(lines, i), scopeStack[0], mode); }
      if ((declMatch = t.match(/^@props\((.+)/))) { _addDeclarationVars(_extractDirectiveContent(lines, i), scopeStack[0], mode); }

      // @exec assignments
      if (/^@exec\(/i.test(t)) {
        for (const am of t.matchAll(/\$(\w+)\s*=[^=]/g)) {
          declareInCurrentScope(am[1]);
        }
      }

      const ifAsgM = IF_ASSIGN_RE.exec(t);
      if (ifAsgM) { declareInCurrentScope(ifAsgM[1]); }

      // Check every $var usage in this line
      const VAR_RE = /\$(\w+)/g;
      let m: RegExpExecArray | null;
      while ((m = VAR_RE.exec(line)) !== null) {
        const varName = m[1];
        if (isVarDeclared(varName)) { continue; }
        if (_IS_PHP_SUPERGLOBAL(varName)) { continue; }

        const absOffset = lineStart + m.index;
        const diag = new vscode.Diagnostic(
          new vscode.Range(document.positionAt(absOffset), document.positionAt(absOffset + m[0].length)),
          `'$${varName}' is not declared. Use @let, @const, @useState, @vars, or @props.`,
          vscode.DiagnosticSeverity.Warning
        );
        diag.source = 'SAO Template';
        diagnostics.push(diag);
      }

      lineStart += line.length + 1;
    }
  }

  collection.set(document.uri, diagnostics);
  return diagnostics;
}

export function activate(context: vscode.ExtensionContext) {
  console.log('Template Languages extension is now active!');

  const saoFormatter = new SaoFormatter();

  // Register document formatter (Format Document)
  context.subscriptions.push(
    vscode.languages.registerDocumentFormattingEditProvider('sao', saoFormatter)
  );

  // Register range formatter (Format Selection)
  context.subscriptions.push(
    vscode.languages.registerDocumentRangeFormattingEditProvider('sao', {
      provideDocumentRangeFormattingEdits(
        document: vscode.TextDocument,
        range: vscode.Range,
        options: vscode.FormattingOptions,
        _token: vscode.CancellationToken
      ): vscode.TextEdit[] {
        // For range formatting, delegate to full document formatter
        // since Blade/HTML context requires full document awareness
        return [];
      }
    })
  );

  // Register onType formatting for Enter key (proper indentation on new line)
  context.subscriptions.push(
    vscode.languages.registerOnTypeFormattingEditProvider('sao', {
      provideOnTypeFormattingEdits(
        document: vscode.TextDocument,
        position: vscode.Position,
        ch: string,
        options: vscode.FormattingOptions,
        _token: vscode.CancellationToken
      ): vscode.TextEdit[] {
        if (ch !== '\n') { return []; }

        const tabSize = options.tabSize || 4;
        const insertSpaces = options.insertSpaces !== false;
        const indent = insertSpaces ? ' '.repeat(tabSize) : '\t';

        // Get the previous line (the line before where Enter was pressed)
        const prevLineNum = position.line - 1;
        if (prevLineNum < 0) { return []; }

        const prevLine = document.lineAt(prevLineNum).text;
        const prevTrimmed = prevLine.trim();
        const currentLine = document.lineAt(position.line).text;
        const currentTrimmed = currentLine.trim();

        // Calculate previous line's indent level
        let prevIndent = 0;
        for (const char of prevLine) {
          if (char === ' ') { prevIndent++; }
          else if (char === '\t') { prevIndent += tabSize; }
          else { break; }
        }
        const prevIndentLevel = Math.floor(prevIndent / tabSize);

        // Blade opening directives
        const openDirectives = /^@(if|unless|foreach|forelse|for|while|switch|auth|guest|can|cannot|canany|section|component|slot|push|prepend|once|php|isset|empty|env|production|verbatim|error|setup|register|script|await|block|comment|states)\b/;
        // HTML opening tag (not void, not self-closing, support custom tags)
        const htmlOpenTag = /^<(?!area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)([a-zA-Z0-9:-]+)\b[^/>]*>\s*$/;
        // Opening brace/bracket
        const openBrace = /[\{\[]\s*$/;

        let targetIndentLevel = prevIndentLevel;

        if (openDirectives.test(prevTrimmed)) {
          targetIndentLevel = prevIndentLevel + 1;
        } else if (htmlOpenTag.test(prevTrimmed)) {
          targetIndentLevel = prevIndentLevel + 1;
        } else if (openBrace.test(prevTrimmed)) {
          targetIndentLevel = prevIndentLevel + 1;
        }

        // If next line is a closing tag, don't increase indent
        const closingDirective = /^@(endif|endunless|endforeach|endforelse|endfor|endwhile|endswitch|endauth|endguest|endcan|endcannot|endcanany|endsection|endcomponent|endslot|endpush|endprepend|endonce|endphp|endisset|endempty|endenv|endproduction|endverbatim|enderror|endsetup|endregister|endscript|endblock|endcomment)\b/;

        if (closingDirective.test(currentTrimmed) || /^<\//.test(currentTrimmed)) {
          // Don't change - let the language config handle it
          return [];
        }

        const targetIndentStr = indent.repeat(targetIndentLevel);
        const currentLineRange = new vscode.Range(
          new vscode.Position(position.line, 0),
          new vscode.Position(position.line, currentLine.length - currentTrimmed.length)
        );

        return [new vscode.TextEdit(currentLineRange, targetIndentStr)];
      }
    }, '\n')
  );

  // Register autocomplete for directives (Blade + SAO)
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      'sao',
      new OneDirectiveCompletionProvider(),
      '@'
    )
  );

  // ── Variable Diagnostics ──────────────────────────────────────────────────
  const varDiagnostics = vscode.languages.createDiagnosticCollection('sao-variables');
  context.subscriptions.push(varDiagnostics);

  const analyzeDoc = (doc: vscode.TextDocument) => _runAnalysis(doc, varDiagnostics);

  // Analyze all already-open documents immediately
  vscode.workspace.textDocuments.forEach(analyzeDoc);

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument(analyzeDoc),
    vscode.workspace.onDidChangeTextDocument(e => analyzeDoc(e.document)),
    vscode.window.onDidChangeActiveTextEditor(ed => { if (ed) { analyzeDoc(ed.document); } }),
    vscode.workspace.onDidCloseTextDocument(doc => varDiagnostics.delete(doc.uri))
  );

  // Debug command: run analysis on active file and report result
  context.subscriptions.push(
    vscode.commands.registerCommand('sao.checkVariables', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (!doc) { vscode.window.showErrorMessage('No active editor.'); return; }
      const text = doc.getText();
      const bladeOpen = /<blade\b[^>]*>/i.exec(text);
      const preBladeText = bladeOpen ? text.substring(0, bladeOpen.index) : '';
      const diags = _runAnalysis(doc, varDiagnostics);
      const declared = _collectDeclaredVars(preBladeText);
      vscode.window.showInformationMessage(
        `SAO Check — languageId: "${doc.languageId}" | declared: [${[...declared].filter(v => !_IMPLICIT_VARS.has(v)).join(', ')}] | warnings: ${diags.length}`
      );
    })
  );
}

export function deactivate() {}
