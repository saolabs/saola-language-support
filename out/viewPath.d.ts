/** `__alias__ + 'name'` → directory hint used to break ties. */
export declare const ALIAS_DIRS: Record<string, string>;
/** `web.modules.demo.card` → { dirs: ['web','modules','demo'], name: 'card' } */
export declare function splitViewPath(viewPath: string): {
    dirs: string[];
    name: string;
};
/**
 * Picks the candidate file whose directory chain best matches `dirs`.
 * Scores the trailing segment run first, then adds a smaller bonus for the
 * remaining segments found anywhere in the path (the view root prefix, e.g.
 * `web`, is usually separated from the rest by a `views` directory) and for
 * the alias directory.
 */
export declare function pickBestCandidate(paths: string[], dirs: string[], aliasDir: string): string | undefined;
