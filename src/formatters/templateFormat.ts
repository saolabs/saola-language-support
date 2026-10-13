import { format } from 'prettier/standalone';
import * as babel from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import * as typescript from 'prettier/plugins/typescript';
import * as postcss from 'prettier/plugins/postcss';
import * as ts from 'typescript';

const VOID = new Set(
  'area base br col embed hr img input link meta param source track wbr'.split(' '),
);
const BLOCKS = new Set(
  (
    'if unless foreach forelse for while switch auth guest can cannot canany section component slot ' +
    'push prepend once isset empty env production error await block comment'
  ).split(' '),
);
const MIDDLE = new Set(['else', 'elseif', 'empty']);
type Frame = { name: string; kind: 'tag' | 'directive' | 'case' };
type Embedded = { start: number; end: number; indent: number; parser: string };
type Options = { tabSize: number; insertSpaces: boolean };

/** Ignore quoted strings and comments when tracking a multi-line directive expression. */
class Expression {
  depth = 0;
  quote = '';
  comment = false;
  scan(text: string): number {
    let leadingClosers = 0;
    let leading = true;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (this.comment) {
        if (text.startsWith('*/', i)) {
          this.comment = false;
          i++;
        }
        continue;
      }
      if (this.quote) {
        if (ch === '\\') {
          i++;
        } else if (ch === this.quote) {
          this.quote = '';
        }
        continue;
      }
      if (text.startsWith('//', i)) {
        break;
      }
      if (text.startsWith('/*', i)) {
        this.comment = true;
        i++;
        continue;
      }
      if ('\'"`'.includes(ch)) {
        this.quote = ch;
        leading = false;
        continue;
      }
      if ('([{'.includes(ch)) {
        this.depth++;
      }
      if (')]}'.includes(ch)) {
        this.depth--;
        if (leading) {
          leadingClosers++;
        }
      } else if (!/\s/.test(ch)) {
        leading = false;
      }
    }
    return leadingClosers;
  }
}

/** A tag ends at an unquoted >, never at an arrow/comparison inside a binding. */
function tagEnd(text: string, quote = ''): { end: number; quote: string } {
  let echo = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quote) {
      if (ch === '\\') {
        i++;
      } else if (ch === quote) {
        quote = '';
      }
    } else if (echo) {
      if (text.startsWith(echo, i)) {
        i += echo.length - 1;
        echo = '';
      }
    } else if (text.startsWith('{{', i) || text.startsWith('{!!', i)) {
      echo = text.startsWith('{{', i) ? '}}' : '!!}';
      i += echo === '}}' ? 1 : 2;
    } else if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === '>') {
      return { end: i, quote: '' };
    }
  }
  return { end: -1, quote };
}

function parserFor(tag: string, attrs: string): string | undefined {
  const lang = /\blang\s*=\s*['"]([^'"]+)['"]/i.exec(attrs)?.[1].toLowerCase();
  const type = /\btype\s*=\s*['"]([^'"]+)['"]/i.exec(attrs)?.[1].toLowerCase();
  if (tag === 'style') {
    if (!lang || ['css', 'scss', 'less'].includes(lang)) {
      return lang || 'css';
    }
  } else if (tag === 'script') {
    if (
      type &&
      !['module', 'text/javascript', 'application/javascript', 'text/typescript'].includes(type)
    ) {
      return undefined;
    }
    if (!lang || ['js', 'javascript', 'ts', 'typescript'].includes(lang)) {
      return lang === 'ts' || lang === 'typescript' || type === 'text/typescript'
        ? 'typescript'
        : 'babel';
    }
  }
  return undefined;
}

function indentEmbedded(source: string, prefix: string, parser: string): string[] {
  const literals: { start: number; end: number }[] = [];
  if (parser === 'babel' || parser === 'typescript') {
    const file = ts.createSourceFile(
      'format.tsx',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );
    const visit = (node: ts.Node) => {
      if (
        ts.isStringLiteralLike(node) ||
        node.kind === ts.SyntaxKind.TemplateHead ||
        node.kind === ts.SyntaxKind.TemplateMiddle ||
        node.kind === ts.SyntaxKind.TemplateTail
      ) {
        literals.push({ start: node.getStart(file), end: node.end });
      }
      ts.forEachChild(node, visit);
    };
    visit(file);
  }
  const expression = new Expression();
  let offset = 0;
  return source.split('\n').map((line) => {
    // Prefixing a raw template/string continuation changes the literal value.
    const insideLiteral =
      parser === 'babel' || parser === 'typescript'
        ? literals.some((span) => offset > span.start && offset < span.end)
        : !!expression.quote;
    const output = line && !insideLiteral ? prefix + line : line;
    expression.scan(line);
    offset += line.length + 1;
    return output;
  });
}

/**
 * Keep template text and expressions verbatim; format structural indentation and
 * complete JS/TS/CSS bodies. Selection boundaries refer to the ORIGINAL lines.
 */
export async function formatSaola(
  content: string,
  options: Options,
  start = 0,
  end?: number,
): Promise<string> {
  const eol = content.includes('\r\n') ? '\r\n' : '\n';
  const lines = content.split(/\r?\n/);
  end ??= lines.length - 1;
  const indent = options.insertSpaces === false ? '\t' : ' '.repeat(options.tabSize || 4);
  const output = [...lines];
  const stack: Frame[] = [];
  const embedded: Embedded[] = [];
  let raw:
    | { close: string; start: number; indent: number; parser?: string; preserveClose?: boolean }
    | undefined;
  let comment = '';
  let pendingTag: { name: string; text: string; quote: string; indent: number } | undefined;
  let pendingDirective:
    | { name: string; expression: Expression; indent: number; text: string }
    | undefined;

  const close = (name: string, kind: Frame['kind']) => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].name === name && stack[i].kind === kind) {
        stack.length = i;
        break;
      }
    }
  };
  const openDirective = (name: string, text: string) => {
    if (!BLOCKS.has(name)) {
      return;
    }
    // @section(name, value) is inline. Count ONLY top-level commas.
    if (name === 'section') {
      const expr = new Expression();
      const args = text.slice(text.indexOf('(') + 1);
      // Mask literals first so escaped quotes do not look like argument separators.
      const masked = args.replace(/(['"`])(?:\\.|(?!\1)[^\\])*?\1/g, '""');
      for (const ch of masked) {
        if (ch === ',' && expr.depth === 0 && !expr.quote) {
          return;
        }
        expr.scan(ch);
      }
    }
    if (!new RegExp(`@end${name}\\b`).test(text)) {
      stack.push({ name, kind: 'directive' });
    }
  };
  const finishTag = (name: string, text: string, line: number, base: number) => {
    const lower = name.toLowerCase();
    if (/\/\s*>$/.test(text) || VOID.has(lower)) {
      return;
    }
    if (['pre', 'textarea', 'script', 'style'].includes(lower)) {
      if (!new RegExp(`</${lower}\\s*>`, 'i').test(text)) {
        raw = {
          close: `</${lower}>`,
          start: line + 1,
          indent: base + 1,
          parser: parserFor(lower, text),
          preserveClose: lower === 'pre' || lower === 'textarea',
        };
      }
    } else {
      stack.push({ name: lower, kind: 'tag' });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line.trim();
    if (raw) {
      const closing = raw.close.startsWith('</')
        ? new RegExp(`^${raw.close.replace('>', '\\s*>')}$`, 'i').test(text)
        : text === raw.close;
      if (closing) {
        if (!raw.preserveClose) {
          output[i] = indent.repeat(raw.indent - 1) + text;
        }
        if (raw.parser) {
          embedded.push({ start: raw.start, end: i - 1, indent: raw.indent, parser: raw.parser });
        }
        raw = undefined;
      }
      continue;
    }
    if (comment) {
      if (text.includes(comment)) {
        comment = '';
      }
      continue;
    }
    if (pendingDirective) {
      const p = pendingDirective;
      // Never reindent inside a multi-line string literal: whitespace is data.
      const preserve = !!p.expression.quote;
      const oldDepth = p.expression.depth;
      const closers = p.expression.scan(text);
      const level =
        p.indent + (closers > 0 ? Math.max(0, oldDepth - closers - 1) : Math.max(1, oldDepth - 1));
      if (!preserve && text) {
        output[i] = indent.repeat(level) + text;
      }
      p.text += '\n' + text;
      if (p.expression.depth <= 0) {
        openDirective(p.name, p.text);
        pendingDirective = undefined;
      }
      continue;
    }
    if (pendingTag) {
      const p = pendingTag;
      const result = tagEnd(text, p.quote);
      if (!p.quote && text) {
        output[i] = indent.repeat(p.indent + (/^\/?\s*>/.test(text) ? 0 : 1)) + text;
      }
      p.text += '\n' + text;
      p.quote = result.quote;
      if (result.end >= 0) {
        finishTag(p.name, p.text, i, p.indent);
        pendingTag = undefined;
      }
      continue;
    }
    if (!text) {
      continue;
    }
    if (text.startsWith('{{--') || text.startsWith('<!--')) {
      const ending = text.startsWith('{{--') ? '--}}' : '-->';
      if (!text.includes(ending)) {
        comment = ending;
      }
      // Preserve comments, including examples containing tags/directives.
      continue;
    }

    const directive = /^@(\w+)\b/.exec(text);
    if (directive) {
      const name = directive[1].toLowerCase();
      if (
        ['verbatim', 'php', 'script', 'comment'].includes(name) &&
        !text.slice(directive[0].length).trim().startsWith('(')
      ) {
        output[i] = indent.repeat(stack.length) + text;
        if (!text.includes(`@end${name}`)) {
          raw = { close: `@end${name}`, start: i + 1, indent: stack.length + 1 };
        }
        continue;
      }
      if (name.startsWith('end')) {
        close(name.slice(3), 'directive');
      }
      if (name === 'show' || name === 'stop' || name === 'overwrite' || name === 'append') {
        close('section', 'directive');
      }
      if (name === 'case' || name === 'default') {
        if (stack[stack.length - 1]?.kind === 'case') {
          stack.pop();
        }
      }
      const isMiddle = MIDDLE.has(name) && (name !== 'empty' || /^@empty\s*$/.test(text));
      const level = Math.max(0, stack.length - (isMiddle ? 1 : 0));
      output[i] = indent.repeat(level) + text;
      if (name === 'break' && stack[stack.length - 1]?.kind === 'case') {
        stack.pop();
      }
      const expression = new Expression();
      expression.scan(text.slice(directive[0].length));
      if (expression.depth > 0) {
        pendingDirective = { name, expression, indent: level, text };
      } else if (!isMiddle && !name.startsWith('end')) {
        openDirective(name, text);
      }
      if (
        (name === 'case' || name === 'default') &&
        stack.some((frame) => frame.name === 'switch')
      ) {
        stack.push({ name: 'case', kind: 'case' });
      }
      continue;
    }

    // Walk tags without interpreting quoted attributes, echo expressions, or comments.
    let cursor = 0;
    let base = stack.length;
    let first = true;
    while (cursor < text.length) {
      if (text.startsWith('{{--', cursor) || text.startsWith('<!--', cursor)) {
        const ending = text.startsWith('{{--', cursor) ? '--}}' : '-->';
        const at = text.indexOf(ending, cursor);
        if (at < 0) {
          comment = ending;
          break;
        }
        cursor = at + ending.length;
        continue;
      }
      if (text.startsWith('{{', cursor) || text.startsWith('{!!', cursor)) {
        const ending = text.startsWith('{{', cursor) ? '}}' : '!!}';
        const at = text.indexOf(ending, cursor + 2);
        cursor = at < 0 ? text.length : at + ending.length;
        continue;
      }
      const tag = /^<(\/?)([a-zA-Z_:][\w:.-]*)\b/.exec(text.slice(cursor));
      if (!tag) {
        cursor++;
        continue;
      }
      const result = tagEnd(text.slice(cursor));
      if (tag[1]) {
        close(tag[2].toLowerCase(), 'tag');
        if (first && cursor === 0) {
          base = stack.length;
        }
      } else if (result.end < 0) {
        pendingTag = {
          name: tag[2],
          text: text.slice(cursor),
          quote: result.quote,
          indent: stack.length,
        };
        break;
      } else {
        const endAt = cursor + result.end + 1;
        const rawTag = ['pre', 'textarea', 'script', 'style'].includes(tag[2].toLowerCase());
        finishTag(tag[2], rawTag ? text.slice(cursor) : text.slice(cursor, endAt), i, stack.length);
        if (rawTag) {
          break;
        }
      }
      first = false;
      cursor += result.end < 0 ? text.length : result.end + 1;
    }
    // Plain text whitespace can affect rendering; only reindent structural lines.
    if (/^(?:<|\{\{|\{!!)/.test(text)) {
      output[i] = indent.repeat(base) + line.trimStart();
    }
  }

  // Work backwards so expanding a script body cannot shift another body's indices.
  for (const block of embedded.reverse()) {
    if (block.start < start || block.end > end || block.end < block.start) {
      continue;
    }
    const source = lines.slice(block.start, block.end + 1).join('\n');
    try {
      const formatted = await format(source, {
        parser: block.parser,
        plugins: [babel, estree, typescript, postcss],
        tabWidth: options.tabSize || 4,
        useTabs: options.insertSpaces === false,
        embeddedLanguageFormatting: 'off',
      });
      const body = indentEmbedded(
        formatted.replace(/\n$/, ''),
        indent.repeat(block.indent),
        block.parser,
      );
      output.splice(block.start, block.end - block.start + 1, ...body);
      end += body.length - (block.end - block.start + 1);
    } catch {
      // Incomplete code, Saola directives, or unsupported syntax: preserve the body.
    }
  }
  return output.slice(start, end + 1).join(eol);
}
