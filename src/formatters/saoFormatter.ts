import * as vscode from 'vscode';

// Directives that become INLINE when they have multiple arguments (comma-separated)
// e.g. @section('meta:title', 'value') → inline, @section('content') → block
const INLINE_WHEN_MULTI_ARGS = new Set([
  'section',
]);

// Blade directives that decrease then increase (same level as opening)
const BLADE_MIDDLE_DIRECTIVES = new Set([
  'else', 'elseif', 'case', 'default', 'empty',
]);

// Note: ALL directives support multi-line paren/bracket indentation.
// e.g. @import([\n    ...\n])  or  @const(\n    $x = 1\n)

// Void HTML elements (self-closing, no indent)
const VOID_ELEMENTS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'keygen', 'link', 'menuitem', 'meta', 'param', 'source', 'track', 'wbr',
]);

export class SaoFormatter implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    const content = document.getText();
    const tabSize = options.tabSize || 4;
    const insertSpaces = options.insertSpaces !== false;
    const indent = insertSpaces ? ' '.repeat(tabSize) : '\t';

    try {
      const formatted = this.formatDocument(content, indent);

      if (formatted !== content) {
        const fullRange = new vscode.Range(
          document.positionAt(0),
          document.positionAt(content.length)
        );
        return [new vscode.TextEdit(fullRange, formatted)];
      }
      return [];
    } catch (e) {
      console.error('SAO Formatter error:', e);
      return [];
    }
  }

  /**
   * Format entire .sao document using line-by-line indent tracking
   */
  private formatDocument(content: string, indent: string): string {
    const lines = content.split('\n');
    const result: string[] = [];
    let indentLevel = 0;
    let inScriptOrStyle = false;
    let scriptStyleIndent = 0;
    let inPreBlock = false;
    // Track multi-line paren state for @const/@let/@vars/@useState
    let inMultilineParen = false;
    let parenBaseIndent = 0;
    let parenDepth = 0;
    // Track multi-line Blade comments {{-- ... --}}
    let inBladeComment = false;
    let bladeCommentIndent = 0;

    // Pre-scan: detect block directives by finding @end<word> patterns in the file.
    // A directive is a block opener ONLY if a corresponding @end<name> exists on a separate line.
    const fileOpenDirectives = new Set<string>();
    const fileCloseDirectives = new Set<string>();
    for (const l of lines) {
      const m = l.trim().match(/^@end(\w+)/);
      if (m) {
        const baseName = m[1];
        fileOpenDirectives.add(baseName);
        fileCloseDirectives.add('end' + baseName);
      }
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Empty lines - preserve them
      if (trimmed === '') {
        result.push('');
        continue;
      }

      // === Handle multi-line Blade comments {{-- ... --}} ===
      if (inBladeComment) {
        if (trimmed.includes('--}}')) {
          result.push(indent.repeat(bladeCommentIndent) + trimmed);
          inBladeComment = false;
        } else {
          result.push(indent.repeat(bladeCommentIndent) + trimmed);
        }
        continue;
      }

      // Check if this line starts a multi-line Blade comment
      if (trimmed.includes('{{--') && !trimmed.includes('--}}')) {
        // Comment opened but not closed on this line
        // Don't skip the line itself - it may contain code before the comment
        // We'll process the line normally and enter comment mode for subsequent lines
        bladeCommentIndent = indentLevel;
      }

      // Track <pre> blocks - don't format content inside
      if (/<pre\b/i.test(trimmed)) { inPreBlock = true; }
      if (/<\/pre>/i.test(trimmed)) { inPreBlock = false; }
      if (inPreBlock) {
        result.push(line);
        continue;
      }

      // === Handle multi-line paren continuation (@const, @let, @vars, @useState) ===
      if (inMultilineParen) {
        // Count parens/brackets to track depth (string-aware)
        const parenCount = this.countParensOutsideStrings(trimmed);
        parenDepth += parenCount;

        if (parenDepth <= 0) {
          // Closing line: ) or ]) — same indent as the @directive
          result.push(indent.repeat(parenBaseIndent) + trimmed);
          inMultilineParen = false;
          parenDepth = 0;
        } else {
          // Content lines inside parens — one level deeper than directive
          result.push(indent.repeat(parenBaseIndent + 1) + trimmed);
        }
        continue;
      }

      // Track <script> and <style> sections for JS/CSS formatting
      if (/^<script\b/i.test(trimmed)) {
        result.push(indent.repeat(indentLevel) + trimmed);
        inScriptOrStyle = true;
        scriptStyleIndent = 0;
        continue;
      }
      if (/^<\/script>/i.test(trimmed)) {
        inScriptOrStyle = false;
        result.push(indent.repeat(indentLevel) + trimmed);
        continue;
      }
      if (/^<style\b/i.test(trimmed)) {
        result.push(indent.repeat(indentLevel) + trimmed);
        inScriptOrStyle = true;
        scriptStyleIndent = 0;
        continue;
      }
      if (/^<\/style>/i.test(trimmed)) {
        inScriptOrStyle = false;
        result.push(indent.repeat(indentLevel) + trimmed);
        continue;
      }

      // Inside <script> or <style>: basic JS/CSS indentation
      if (inScriptOrStyle) {
        // Decrease for closing braces
        if (/^\s*[}\])]/.test(trimmed)) {
          scriptStyleIndent = Math.max(0, scriptStyleIndent - 1);
        }

        result.push(indent.repeat(indentLevel + 1 + scriptStyleIndent) + trimmed);

        // Increase for opening braces
        if (/[{(\[]\s*$/.test(trimmed) && !/^\s*\/\//.test(trimmed)) {
          scriptStyleIndent++;
        }
        continue;
      }

      // === Main HTML + Blade formatting ===

      // Determine indent adjustments
      let decreaseBefore = false;
      let increaseAfter = false;
      let isMiddleDirective = false;
      let isInlineDirective = false;

      // Check Blade directive
      const directiveMatch = trimmed.match(/^@(\w+)/);
      if (directiveMatch) {
        const name = directiveMatch[1];

        // Check for multi-line paren/bracket for ANY directive
        // e.g. @import([\n, @const(\n, @foreach(\n...(unclosed)\n)
        const afterDirective = trimmed.substring(directiveMatch[0].length);
        const parenCount = this.countParensOutsideStrings(afterDirective);

        if (parenCount > 0) {
          // Multi-line: parens/brackets not closed on this line
          result.push(indent.repeat(indentLevel) + trimmed);
          inMultilineParen = true;
          parenBaseIndent = indentLevel;
          parenDepth = parenCount;
          // Enter blade comment mode if comment opened on this line
          if (trimmed.includes('{{--') && !trimmed.includes('--}}')) {
            bladeCommentIndent = indentLevel;
            inBladeComment = true;
          }
          continue;
        }

        if (fileCloseDirectives.has(name)) {
          decreaseBefore = true;
        } else if (BLADE_MIDDLE_DIRECTIVES.has(name)) {
          isMiddleDirective = true;
        } else if (fileOpenDirectives.has(name)) {
          // Check if it's a directive that becomes inline with multiple args
          if (INLINE_WHEN_MULTI_ARGS.has(name)) {
            const argsMatch = trimmed.match(/^@\w+\((.+)\)\s*$/);
            if (argsMatch) {
              // Check if there's a comma outside of strings/nested parens
              const args = argsMatch[1];
              if (this.hasMultipleArgs(args)) {
                isInlineDirective = true;
              } else {
                increaseAfter = true;
              }
            } else {
              increaseAfter = true;
            }
          } else {
            increaseAfter = true;
          }
        }
        // Other directives (extends, include, yield, etc.): no change
      }

      if (isInlineDirective) {
        result.push(indent.repeat(indentLevel) + trimmed);
        continue;
      }

      // Check closing HTML tag: </div>, </h1>, etc.
      if (/^<\/[a-zA-Z]/.test(trimmed)) {
        decreaseBefore = true;
      }

      // Check self-closing /> on its own line
      if (trimmed === '/>') {
        decreaseBefore = true;
      }

      // Check closing brace/bracket } ]
      if (/^[}\]]/.test(trimmed) && !directiveMatch) {
        decreaseBefore = true;
      }

      // Check closing paren ) on its own line
      if (trimmed === ')' && !directiveMatch) {
        decreaseBefore = true;
      }

      // Apply decrease BEFORE outputting the line
      if (decreaseBefore) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      if (isMiddleDirective) {
        // Middle directives: temporarily go back one level
        const middleLevel = Math.max(0, indentLevel - 1);
        result.push(indent.repeat(middleLevel) + trimmed);
        // Keep indentLevel the same (content after @else stays at same level)
      } else {
        result.push(indent.repeat(indentLevel) + trimmed);
      }

      // Check if line increases indent AFTER
      if (increaseAfter) {
        indentLevel++;
      }

      // Check opening HTML tag (not void, not self-closing, not closed on same line)
      if (!directiveMatch) {
        const openTagMatch = trimmed.match(/^<([a-zA-Z][a-zA-Z0-9-]*)\b/);
        if (openTagMatch) {
          const tagName = openTagMatch[1].toLowerCase();
          const isSelfClosing = trimmed.endsWith('/>');
          const hasClosingOnSameLine = new RegExp(`</${openTagMatch[1]}\\s*>`, 'i').test(trimmed);

          if (!VOID_ELEMENTS.has(tagName) && !isSelfClosing && !hasClosingOnSameLine && !decreaseBefore) {
            indentLevel++;
          }
        }

        // Opening brace/bracket at end of line (for JS/CSS blocks)
        if (/[\{\[]\s*$/.test(trimmed) && !trimmed.startsWith('<')) {
          indentLevel++;
        }
      }

      // Enter blade comment mode after processing the line if comment started but not closed
      if (trimmed.includes('{{--') && !trimmed.includes('--}}')) {
        bladeCommentIndent = indentLevel;
        inBladeComment = true;
      }
    }

    // Clean up
    let output = result.join('\n');
    output = output.replace(/[ \t]+$/gm, '');  // trailing whitespace
    output = output.replace(/\n{3,}/g, '\n\n'); // max 2 blank lines
    output = output.trimEnd() + '\n';

    return output;
  }

  /**
   * Check if an argument string has multiple top-level arguments (comma outside strings/parens)
   */
  private hasMultipleArgs(args: string): boolean {
    let depth = 0;
    let inString: string | null = null;

    for (let i = 0; i < args.length; i++) {
      const ch = args[i];

      // Track string state
      if ((ch === "'" || ch === '"') && (i === 0 || args[i - 1] !== '\\')) {
        if (inString === ch) {
          inString = null;
        } else if (inString === null) {
          inString = ch;
        }
        continue;
      }

      if (inString) { continue; }

      if (ch === '(' || ch === '[') { depth++; }
      else if (ch === ')' || ch === ']') { depth--; }
      else if (ch === ',' && depth === 0) {
        return true;
      }
    }

    return false;
  }

  /**
   * Count net open parens/brackets outside of string literals and Blade comments.
   * Returns positive number if more opens than closes, negative if more closes.
   */
  private countParensOutsideStrings(text: string): number {
    let depth = 0;
    let inString: string | null = null;

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];

      // Skip Blade comments {{-- ... --}}
      if (!inString && ch === '{' && text.substring(i, i + 4) === '{{--') {
        const endIdx = text.indexOf('--}}', i + 4);
        if (endIdx !== -1) {
          i = endIdx + 3; // skip past --}}
          continue;
        }
        // Unclosed blade comment — ignore rest of line
        return depth;
      }

      if ((ch === "'" || ch === '"') && (i === 0 || text[i - 1] !== '\\')) {
        if (inString === ch) {
          inString = null;
        } else if (inString === null) {
          inString = ch;
        }
        continue;
      }

      if (inString) { continue; }

      if (ch === '(' || ch === '[') { depth++; }
      else if (ch === ')' || ch === ']') { depth--; }
    }

    return depth;
  }
}
