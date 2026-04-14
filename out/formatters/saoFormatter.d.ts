import * as vscode from 'vscode';
export declare class SaoFormatter implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, _token: vscode.CancellationToken): Promise<vscode.TextEdit[]>;
    /**
     * Format entire .sao document using line-by-line indent tracking
     */
    private formatDocument;
    /**
     * Check if an argument string has multiple top-level arguments (comma outside strings/parens)
     */
    private hasMultipleArgs;
    /**
     * Count net open parens/brackets outside of string literals and Blade comments.
     * Returns positive number if more opens than closes, negative if more closes.
     */
    private countParensOutsideStrings;
}
