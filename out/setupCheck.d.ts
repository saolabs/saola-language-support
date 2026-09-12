export interface SetupDiagnostic {
    /** Offset into the .sao source. */
    start: number;
    length: number;
    message: string;
    code: number;
}
/** Names in scope of every compiled view constructor (compiler/resources/templates/view.js). */
export declare const CLOSURE_NAMES: Record<string, string>;
interface Chunk {
    virt: number;
    src: number;
    length: number;
}
declare class Builder {
    text: string;
    readonly chunks: Chunk[];
    gen(s: string): this;
    copy(s: string, srcOffset: number): this;
    toSource(virt: number): number | undefined;
}
/** `{{-- --}}` and `@verbatim` blocks are text, not code — a `<script setup>` printed in one must not match. */
export declare function maskComments(source: string): string;
/** Locate `<script setup>`; returns the body and its offset in `source`. */
export declare function setupBlock(source: string): {
    body: string;
    offset: number;
} | undefined;
/** Rebuild the view as one TypeScript module with a source map back to `source` offsets. */
export declare function buildVirtual(source: string): Builder;
export declare function checkSetup(source: string): SetupDiagnostic[];
/** Every name a template can reference from the view scope (compiled closure + declarations + setup). */
export declare function viewScope(source: string): Set<string>;
export declare function checkTemplate(source: string): SetupDiagnostic[];
export {};
