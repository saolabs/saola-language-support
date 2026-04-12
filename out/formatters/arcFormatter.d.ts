import * as vscode from 'vscode';
export declare class ArcFormatter implements vscode.DocumentFormattingEditProvider {
    provideDocumentFormattingEdits(document: vscode.TextDocument, options: vscode.FormattingOptions, _token: vscode.CancellationToken): Promise<vscode.TextEdit[]>;
}
