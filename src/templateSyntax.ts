export const DIRECTIVE = /^@([a-zA-Z_][\w-]*(?:\.[\w-]+)*)([ \t]*\()?/;
export const TAG = /^<(\/?)([a-zA-Z_:][\w:.-]*)(?=[\s/>]|$)/;
export const ECHO = /^(\{\{\{|\{\{|\{!!)/;
export const ECHO_END: Record<string, string> = { '{{{': '}}}', '{{': '}}', '{!!': '!!}' };

/** Ignore quoted strings and comments when tracking a multi-line directive expression. */
export class Expression {
  depth = 0;
  quote = '';
  comment = false;
  end = -1;
  comma = false;

  scan(text: string, delimiter = '', stopDepth = 0): number {
    this.end = -1;
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
      if (delimiter && this.depth === stopDepth && text.startsWith(delimiter, i)) {
        this.end = i + delimiter.length;
        return leadingClosers + (leading && delimiter === ')' ? 1 : 0);
      }
      if (ch === ',' && this.depth === 1) this.comma = true;
      if (text.startsWith('//', i)) {
        const newline = text.indexOf('\n', i);
        if (newline < 0) break;
        i = newline;
        continue;
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

export class TagEnd {
  private quote = '';
  private expression?: Expression;
  private delimiter = '';

  get inLiteral(): boolean {
    return !!(this.quote || this.expression?.quote);
  }

  scan(text: string, onDirective?: (name: string, value: string, offset: number) => void): number {
    for (let i = 0; i < text.length;) {
      const ch = text[i];
      if (this.expression) {
        this.expression.scan(text.slice(i), this.delimiter);
        if (this.expression.end < 0) return -1;
        i += this.expression.end;
        this.expression = undefined;
      } else if (this.quote) {
        if (ch === this.quote) this.quote = '';
        i += ch === '\\' ? 2 : 1;
      } else if (ch === '"' || ch === "'") {
        this.quote = ch;
        i++;
      } else if (ch === '>') {
        return i;
      } else {
        if (onDirective && ch === '#' && /\s/.test(text[i - 1] ?? '')) {
          const attr = /^#(if|elseif|switch|case|foreach|for|while|key)\s*=\s*(["'])/.exec(text.slice(i));
          if (attr) {
            const start = i + attr[0].length;
            const end = text.indexOf(attr[2], start);
            if (end < 0) return -1;
            onDirective(attr[1], text.slice(start, end), start);
            i = end + 1;
            continue;
          }
        }
        const directive = ch === '@' ? DIRECTIVE.exec(text.slice(i)) : null;
        const echo = ch === '{' ? ECHO.exec(text.slice(i)) : null;
        if (directive?.[2] || echo) {
          this.expression = new Expression();
          this.delimiter = echo ? ECHO_END[echo[0]] : ')';
          i += echo ? echo[0].length : directive![0].length;
        } else {
          i++;
        }
      }
    }
    return -1;
  }
}
