import * as vscode from 'vscode';
import { ALIAS_DIRS, splitViewPath, pickBestCandidate } from './viewPath';

// =============================================
// Go to Definition for .sao view paths
// =============================================
// Resolves @extends/@include/@import targets and <component> tags to the
// matching .sao file. The real path mapping lives in the PHP ViewPathResolver
// (config-driven), so we match by trailing path segments instead of trying to
// mirror that config here.

const VIEW_DIRECTIVE = /@(extends|include|includeIf|includeWhen|includeUnless|includeFirst|import|each|component)\b/;

/** The quoted string literal containing `character`, if any. */
function _stringAt(line: string, character: number): { value: string; start: number; end: number } | undefined {
  const re = /'([^']*)'|"([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    if (character > m.index && character < m.index + m[0].length) {
      return { value: m[1] ?? m[2], start: m.index + 1, end: m.index + m[0].length - 1 };
    }
  }
  return undefined;
}

/** Directory hint from a `__alias__ +` prefix sitting before the string. */
function _aliasHint(line: string, before: number): string {
  const m = line.substring(0, before).match(/(__\w+__)\s*\+\s*$/);
  return m ? (ALIAS_DIRS[m[1]] ?? '') : '';
}

/**
 * Finds the .sao file for a dotted/slashed view path.
 * Candidates are ranked by how many trailing path segments they share with
 * the requested path, so 'web.modules.demo.card' still finds
 * resources/saola/web/views/modules/demo/card.sao.
 */
async function _findView(viewPath: string, aliasDir: string): Promise<vscode.Uri | undefined> {
  const { dirs, name } = splitViewPath(viewPath);
  if (!name) { return undefined; }

  const files = await vscode.workspace.findFiles(`**/${name}.sao`, '**/node_modules/**', 50);
  if (files.length === 0) { return undefined; }
  if (files.length === 1) { return files[0]; }

  const best = pickBestCandidate(files.map(f => f.path), dirs, aliasDir);
  return files.find(f => f.path === best) ?? files[0];
}

/** Normalizes tag/export names for case-insensitive and kebab/pascal agnostic matching */
function _normalizeTag(name: string): string {
  return name.replace(/[-_:]/g, '').toLowerCase();
}

/** Tag name under the cursor, e.g. `<post-list :x="y">` → `post-list`, `<UserItem>` → `UserItem`. */
function _tagAt(line: string, character: number): string | undefined {
  const re = /<\/?([A-Za-z_:][\w:.-]*)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) {
    const start = m.index + m[0].length - m[1].length;
    if (character >= start && character <= start + m[1].length) { return m[1]; }
  }
  return undefined;
}

/** Resolves a component tag through the file's @import lines. */
function _importForTag(text: string, tag: string): { path: string; alias: string } | undefined {
  const re = /@import\s*\(\s*(?:(__\w+__)\s*\+\s*)?['"]([^'"]+)['"]\s*(?:as\s+([\w:.-]+))?\s*\)/g;
  let m: RegExpExecArray | null;
  const normalizedTag = _normalizeTag(tag);
  while ((m = re.exec(text)) !== null) {
    const [, alias, path, as] = m;
    const exported = as ?? path.split(/[./]/).pop()!;
    if (_normalizeTag(exported) === normalizedTag) {
      return { path, alias: ALIAS_DIRS[alias ?? ''] ?? '' };
    }
  }
  return undefined;
}

export class SaoDefinitionProvider implements vscode.DefinitionProvider {
  async provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position
  ): Promise<vscode.Definition | undefined> {
    const line = document.lineAt(position.line).text;

    // 1. Cursor inside a quoted path of a view directive
    const literal = _stringAt(line, position.character);
    if (literal && VIEW_DIRECTIVE.test(line)) {
      const target = await _findView(literal.value, _aliasHint(line, literal.start - 1));
      if (target) { return new vscode.Location(target, new vscode.Position(0, 0)); }
      return undefined;
    }

    // 2. Cursor on a component tag → follow its @import
    const tag = _tagAt(line, position.character);
    if (tag) {
      const imported = _importForTag(document.getText(), tag);
      if (imported) {
        const target = await _findView(imported.path, imported.alias);
        if (target) { return new vscode.Location(target, new vscode.Position(0, 0)); }
      }
    }

    return undefined;
  }
}
