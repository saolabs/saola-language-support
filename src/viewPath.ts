// =============================================
// View path resolution (pure — no vscode API)
// =============================================
// The real mapping from a dotted view name to a file lives in the PHP
// ViewPathResolver and is config-driven, so we rank candidate files by how
// many trailing path segments they share with the requested view instead.

/** `__alias__ + 'name'` → directory hint used to break ties. */
export const ALIAS_DIRS: Record<string, string> = {
  __layout__: 'layouts',
  __template__: 'templates',
  __component__: 'components',
  __module__: 'modules',
  __page__: 'pages',
  __partial__: 'partials',
  __pagination__: 'pagination',
  __base__: '',
};

/** `web.modules.demo.card` → { dirs: ['web','modules','demo'], name: 'card' } */
export function splitViewPath(viewPath: string): { dirs: string[]; name: string } {
  const segments = viewPath.split(/[./\\]/).filter(Boolean);
  return { dirs: segments.slice(0, -1), name: segments[segments.length - 1] ?? '' };
}

/**
 * Picks the candidate file whose directory chain best matches `dirs`.
 * Scores the trailing segment run first, then adds a smaller bonus for the
 * remaining segments found anywhere in the path (the view root prefix, e.g.
 * `web`, is usually separated from the rest by a `views` directory) and for
 * the alias directory.
 */
export function pickBestCandidate(paths: string[], dirs: string[], aliasDir: string): string | undefined {
  let best: string | undefined;
  let bestScore = -1;
  for (const path of paths) {
    const candidateDirs = path.split(/[/\\]/).slice(0, -1);
    let run = 0;
    for (let i = 1; i <= dirs.length && i <= candidateDirs.length; i++) {
      if (candidateDirs[candidateDirs.length - i] !== dirs[dirs.length - i]) { break; }
      run++;
    }
    let score = run;
    for (const dir of dirs.slice(0, dirs.length - run)) {
      if (candidateDirs.includes(dir)) { score += 0.25; }
    }
    if (aliasDir && candidateDirs.includes(aliasDir)) { score += 0.5; }
    if (score > bestScore) { bestScore = score; best = path; }
  }
  return best;
}
