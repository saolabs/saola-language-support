import { format } from 'prettier/standalone';
import * as babel from 'prettier/plugins/babel';
import * as estree from 'prettier/plugins/estree';
import * as typescript from 'prettier/plugins/typescript';
import * as postcss from 'prettier/plugins/postcss';
import * as ts from 'typescript';
import { closeParen, setupLiteralRanges } from '../setupCheck';
import { DIRECTIVE, ECHO, ECHO_END, Expression, TAG, TagEnd } from '../templateSyntax';

const VOID = new Set(
  'area base br col embed hr img input link meta param source track wbr'.split(' '),
);
const BLOCKS = new Set(
  (
    'if unless foreach forelse for while switch auth guest can cannot canany section component slot ' +
    'push pushonce pushif prepend prependonce once isset empty env production error block ' +
    'hassection sectionmissing wrapper serverside clientside'
  ).split(' '),
);
const RAW_TAGS = new Set(['pre', 'textarea', 'script', 'style']);
const RAW_DIRECTIVES = new Set(['verbatim', 'php', 'script', 'comment']);
const SECTION_ENDS = new Set(['show', 'stop', 'overwrite', 'append']);

function blockName(name: string): string {
  if (['ssr', 'usessr'].includes(name)) return 'serverside';
  if (['csr', 'usecsr'].includes(name)) return 'clientside';
  return name === 'wrap' ? 'wrapper' : name;
}

function branchOwner(name: string, hasArgs: boolean): string[] {
  if (name === 'empty' && !hasArgs) return ['forelse'];
  if (name === 'elseauth') return ['auth'];
  if (name === 'elseguest') return ['guest'];
  if (name === 'elseif') return ['if'];
  if (name === 'else') return ['if', 'unless', 'auth', 'guest', 'can', 'cannot', 'canany', 'isset', 'empty', 'hassection', 'sectionmissing'];
  return [];
}

type Frame = { name: string; kind: 'tag' | 'directive' | 'case' };
type Embedded = { start: number; end: number; indent: number; parser: string; source?: string; opening?: string; closing?: string };
type Options = { tabSize: number; insertSpaces: boolean };

function parserFor(tag: string, attrs: string): string | undefined {
  const attributes = new Map<string, string>();
  const attribute = /\s+([^\s=<>'"]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const [, name, doubleQuoted, singleQuoted, unquoted] of attrs.matchAll(attribute)) {
    attributes.set(name.toLowerCase(), (doubleQuoted ?? singleQuoted ?? unquoted ?? '').toLowerCase());
  }
  const lang = attributes.get('lang');
  const type = attributes.get('type');
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

function indentEmbedded(source: string, prefix: string, parser: string, rebase = false): string[] {
  const literals: { start: number; end: number }[] = [];
  if (parser === 'babel' || parser === 'typescript') {
    const file = ts.createSourceFile(
      'format.ts',
      source,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TS,
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
  const lines = source.split('\n').map((line) => {
    // Prefixing a raw template/string continuation changes the literal value.
    const insideLiteral =
      parser === 'babel' || parser === 'typescript'
        ? literals.some((span) => offset > span.start && offset < span.end)
        : !!expression.quote;
    expression.scan(line);
    offset += line.length + 1;
    return { line, insideLiteral };
  });
  // A Saola declaration is not JS/TS syntax. If parsing fails, normalize only
  // the body's common margin; preserve relative indentation and literal values.
  let margin: string | undefined;
  if (rebase) {
    for (const { line, insideLiteral } of lines) {
      if (!line.trim() || insideLiteral) { continue; }
      const whitespace = /^\s*/.exec(line)![0];
      margin ??= whitespace;
      while (!whitespace.startsWith(margin)) { margin = margin.slice(0, -1); }
    }
  }
  return lines.map(({ line, insideLiteral }) =>
    line.trim() && !insideLiteral ? prefix + line.slice(margin?.length ?? 0) : line,
  );
}

/** Replace setup declarations with valid statements before handing code to Prettier. */
function protectDeclarations(source: string): { text: string; originals: Map<string, string> } {
  const originals = new Map<string, string>();
  let prefix = '__SAOLA_FORMAT_DECL_';
  while (source.includes(prefix)) prefix += '_';
  const literals = setupLiteralRanges(source);
  const pattern = /^[ \t]*@(props|vars|states?|let|const|computed|assets?|importView|useState|middleware|useAuth|useauth)\b/gm;
  let text = '', pos = 0;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    const at = source.indexOf('@', match.index);
    if (literals.some(span => at >= span.start && at < span.end)) continue;
    const tail = source.slice(pattern.lastIndex);
    const paren = /^[ \t]*\(/.exec(tail);
    let end = paren ? closeParen(source, pattern.lastIndex + paren[0].length - 1) : pattern.lastIndex;
    if ((!paren && !/^useauth$/i.test(match[1])) || end < 0) continue;
    end += /^[ \t]*;/.exec(source.slice(end))?.[0].length ?? 0;
    const token = `${prefix}${originals.size}__`;
    originals.set(token, source.slice(at, end));
    text += source.slice(pos, match.index) + `${token}();`;
    pos = end;
    pattern.lastIndex = end;
  }
  return {text:text + source.slice(pos), originals};
}

function indentDeclaration(source: string, prefix: string, unit: string): string[] {
  const expression = new Expression();
  return source.split('\n').map((line, index) => {
    const preserve = !!expression.quote;
    const depth = expression.depth;
    const closers = expression.scan(line);
    if (preserve || !line.trim()) return line;
    const level = index === 0 ? 0 : closers > 0 ? Math.max(0, depth - closers - 1) : Math.max(1, depth - 1);
    return prefix + unit.repeat(level) + line.trimStart();
  });
}

function indentUnit(options: Options): string {
  return options.insertSpaces === false ? '\t' : ' '.repeat(options.tabSize || 4);
}

function formatStructure(lines: string[], indent: string, indentFinalBlank = false) {
  const output = [...lines];
  const stack: Frame[] = [];
  const embedded: Embedded[] = [];
  let raw: { close: RegExp; start: number; indent: number; parser?: string; preserve: boolean } | undefined;
  let comment = '';
  let pendingTag: { name: string; scan: TagEnd; text: string; indent: number } | undefined;
  let pendingDirective: { name: string; expression: Expression; indent: number } | undefined;
  let echo: { expression: Expression; delimiter: string } | undefined;

  const frameIndex = (names: string[], kind: Frame['kind']) => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].kind === kind && names.includes(stack[i].name)) return i;
    }
    return -1;
  };
  const close = (name: string, kind: Frame['kind']) => {
    const at = frameIndex([name], kind);
    if (at >= 0) stack.length = at;
  };
  const openDirective = (name: string, expression?: Expression) => {
    if (BLOCKS.has(name) && !(name === 'section' && expression?.comma)) {
      stack.push({ name, kind: 'directive' });
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const text = line.trimStart();
    if (!text) {
      if (indentFinalBlank && i === lines.length - 1 && !raw && !comment && !echo) {
        if (pendingTag && !pendingTag.scan.inLiteral) {
          output[i] = indent.repeat(pendingTag.indent + 1);
        } else if (pendingDirective && !pendingDirective.expression.quote) {
          output[i] = indent.repeat(pendingDirective.indent + Math.max(1, pendingDirective.expression.depth - 1));
        } else if (!pendingTag && !pendingDirective) {
          output[i] = indent.repeat(stack.length);
        }
      }
      continue;
    }

    let cursor = 0;
    let level: number | undefined;
    let preserve = false;

    const finishTag = (name: string, opening: string, base: number, after: number) => {
      if (/\/\s*>$/.test(opening) || VOID.has(name)) return;
      if (!RAW_TAGS.has(name)) {
        stack.push({ name, kind: 'tag' });
        return;
      }

      const closeTag = new RegExp(`</${name}\\s*>`, 'i');
      const parser = parserFor(name, opening);
      const closing = closeTag.exec(text.slice(after));
      if (parser && closing && cursor === 0 && !text.slice(after + closing.index + closing[0].length).trim()) {
        embedded.push({
          start: i, end: i, indent: base + 1, parser, opening, closing: closing[0],
          source: text.slice(after, after + closing.index),
        });
      }
      raw = {
        close: closeTag,
        start: i + 1,
        indent: base + 1,
        parser: text.slice(after).trim() ? undefined : parser,
        preserve: name === 'pre' || name === 'textarea',
      };
    };

    if (pendingTag) {
      const tag = pendingTag;
      preserve = tag.scan.inLiteral;
      const endAt = tag.scan.scan(text);
      level = tag.indent + (/^\/?\s*>/.test(text) ? 0 : 1);
      tag.text += '\n' + text.slice(0, endAt < 0 ? undefined : endAt + 1);
      if (endAt >= 0) {
        pendingTag = undefined;
        cursor = endAt + 1;
        finishTag(tag.name, tag.text, tag.indent, cursor);
      } else {
        cursor = text.length;
      }
    } else if (pendingDirective) {
      const { name, expression, indent: base } = pendingDirective;
      preserve = !!expression.quote;
      const depth = expression.depth;
      const closers = expression.scan(text, ')', 1);
      level = base + (closers > 0 ? Math.max(0, depth - closers - 1) : Math.max(1, depth - 1));
      if (expression.end >= 0) {
        openDirective(name, expression);
        pendingDirective = undefined;
        cursor = expression.end;
      } else {
        cursor = text.length;
      }
    }

    while (cursor < text.length) {
      const tail = text.slice(cursor);
      if (raw) {
        const closing = raw.close.exec(tail);
        if (level === undefined) {
          preserve = raw.preserve || closing?.index !== 0;
          if (!preserve) level = raw.indent - 1;
        }
        if (!closing) break;
        if (raw.parser && cursor === 0 && closing.index === 0) {
          embedded.push({ start: raw.start, end: i - 1, indent: raw.indent, parser: raw.parser });
        }
        cursor += closing.index + closing[0].length;
        raw = undefined;
        continue;
      }
      if (comment) {
        if (level === undefined) preserve = true;
        const at = text.indexOf(comment, cursor);
        if (at < 0) break;
        cursor = at + comment.length;
        comment = '';
        continue;
      }
      if (echo) {
        if (level === undefined) preserve = true;
        echo.expression.scan(tail, echo.delimiter);
        if (echo.expression.end < 0) break;
        cursor += echo.expression.end;
        echo = undefined;
        continue;
      }
      if (tail.startsWith('{{--') || tail.startsWith('<!--')) {
        comment = tail.startsWith('{{--') ? '--}}' : '-->';
        cursor += 4;
        continue;
      }
      const echoStart = ECHO.exec(tail);
      if (echoStart) {
        if (cursor === 0) level = stack.length;
        echo = { expression: new Expression(), delimiter: ECHO_END[echoStart[0]] };
        cursor += echoStart[0].length;
        continue;
      }

      const tag = TAG.exec(tail);
      if (tag) {
        const name = tag[2].toLowerCase();
        if (tag[1]) close(name, 'tag');
        if (cursor === 0) level = stack.length;
        const scan = new TagEnd();
        const endAt = scan.scan(tail);
        if (endAt < 0) {
          if (!tag[1]) pendingTag = { name, scan, text: tail, indent: stack.length };
          break;
        }
        const after = cursor + endAt + 1;
        if (!tag[1]) finishTag(name, tail.slice(0, endAt + 1), stack.length, after);
        cursor = after;
        continue;
      }

      const directive = (cursor === 0 || !/[\w@]/.test(text[cursor - 1])) && DIRECTIVE.exec(tail);
      if (directive) {
        const name = directive[1].toLowerCase();
        const hasArgs = !!directive[2];
        const branches = branchOwner(name, hasArgs);
        const isCase = name === 'case' || name === 'default';
        const isBreak = name === 'break';
        const switchAt = isCase ? frameIndex(['switch'], 'directive') : -1;
        if (isCase && switchAt >= 0) stack.length = switchAt + 1;
        if (name.startsWith('end')) close(blockName(name.slice(3)), 'directive');
        if (!hasArgs && SECTION_ENDS.has(name)) close('section', 'directive');
        const owner = branches.length ? frameIndex(branches, 'directive') : -1;
        if (owner >= 0) stack.length = owner + 1;

        const base = owner >= 0 ? owner : stack.length;
        if (cursor === 0) level = base;
        cursor += directive[0].length;

        if (!hasArgs && RAW_DIRECTIVES.has(name)) {
          raw = { close: new RegExp(`@end${name}\\b`, 'i'), start: i + 1, indent: base + 1, preserve: false };
          continue;
        }
        if (isCase && switchAt >= 0) stack.push({ name: 'case', kind: 'case' });
        if (isBreak && !hasArgs && stack[stack.length - 1]?.kind === 'case') stack.pop();

        const block = branches.length || name.startsWith('end') ? '' : blockName(name);
        if (hasArgs) {
          const expression = new Expression();
          expression.depth = 1;
          expression.scan(text.slice(cursor), ')', 1);
          if (expression.end < 0) {
            pendingDirective = { name: block, expression, indent: base };
            break;
          }
          cursor += expression.end;
          openDirective(block, expression);
        } else {
          openDirective(block);
        }
        continue;
      }

      if (cursor === 0 && /^<(?:!|\?)/.test(tail)) level = stack.length;
      cursor++;
    }

    if (level !== undefined && !preserve) output[i] = indent.repeat(level) + text;
  }

  return { output, embedded };
}

export function onEnterIndent(content: string, options: Options): string | undefined {
  const lines = content.split(/\r?\n/);
  const last = lines.length - 1;
  if (!last) return undefined;
  const { output } = formatStructure(lines, indentUnit(options), true);
  if (output[last] === lines[last]) return undefined;
  return /^\s*/.exec(output[last])![0];
}

/**
 * Keep template text and expressions verbatim; format structural indentation and
 * complete JS/TS/CSS bodies. Selection boundaries refer to the original lines.
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
  const indent = indentUnit(options);
  const { output, embedded } = formatStructure(lines, indent);

  // Work backwards so expanding a script body cannot shift another body's indices.
  for (const block of embedded.reverse()) {
    if (block.start < start || block.end > end || block.end < block.start) {
      continue;
    }
    const originalSource = block.source ?? lines.slice(block.start, block.end + 1).join('\n');
    // Remove the enclosing tag's margin before formatting. Prettier preserves
    // block-comment interiors; repeatedly adding that margin causes indent drift.
    const source = indentEmbedded(originalSource, '', block.parser, true).join('\n');
    const declarations = ['babel', 'typescript'].includes(block.parser)
      ? protectDeclarations(source)
      : { text: source, originals: new Map<string, string>() };
    try {
      const prettierOptions = {
        parser: block.parser,
        plugins: [babel, estree, typescript, postcss],
        tabWidth: options.tabSize || 4,
        useTabs: options.insertSpaces === false,
        embeddedLanguageFormatting: 'off' as const,
      };
      const firstPass = await format(declarations.text, prettierOptions);
      // Prettier can make a different wrapping choice once a chain or CSS value
      // has been split across lines. Stabilize it before restoring Saola syntax.
      const formatted = firstPass.trimEnd() === declarations.text.trimEnd()
        ? firstPass
        : await format(firstPass, prettierOptions);
      let body = indentEmbedded(
        formatted.replace(/\n$/, ''),
        indent.repeat(block.indent),
        block.parser,
      );
      const restored = new Set<string>();
      body = body.flatMap(line => {
        const marker = /^(\s*)([A-Za-z_]\w*)\(\);(.*)$/.exec(line);
        const original = marker && declarations.originals.get(marker[2]);
        if (!marker || !original) return [line];
        restored.add(marker[2]);
        const lines = indentDeclaration(original, marker[1], indent);
        lines[lines.length - 1] += marker[3];
        return lines;
      });
      if (restored.size !== declarations.originals.size) continue;
      if (block.opening) body = [indent.repeat(block.indent - 1) + block.opening, ...body, indent.repeat(block.indent - 1) + block.closing];
      output.splice(block.start, block.end - block.start + 1, ...body);
      end += body.length - (block.end - block.start + 1);
    } catch {
      if (!block.opening && declarations.originals.size) {
        const body = indentEmbedded(source, indent.repeat(block.indent), block.parser, true);
        output.splice(block.start, block.end - block.start + 1, ...body);
      }
    }
  }
  return output.slice(start, end + 1).join(eol);
}
