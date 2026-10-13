import * as vscode from 'vscode';
import { formatSaola } from './templateFormat';

export class SaoFormatter
  implements vscode.DocumentFormattingEditProvider, vscode.DocumentRangeFormattingEditProvider
{
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken,
  ): Promise<vscode.TextEdit[]> {
    return this.format(document, options, token);
  }

  async provideDocumentRangeFormattingEdits(
    document: vscode.TextDocument,
    range: vscode.Range,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken,
  ): Promise<vscode.TextEdit[]> {
    // Whole-line edits, with the rest of the document supplying nesting context.
    const end =
      range.end.character === 0 && range.end.line > range.start.line
        ? range.end.line - 1
        : range.end.line;
    return this.format(
      document,
      options,
      token,
      new vscode.Range(new vscode.Position(range.start.line, 0), document.lineAt(end).range.end),
    );
  }

  private async format(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    token: vscode.CancellationToken,
    range?: vscode.Range,
  ): Promise<vscode.TextEdit[]> {
    if (token.isCancellationRequested) {
      return [];
    }
    const content = document.getText();
    const editRange =
      range ?? new vscode.Range(document.positionAt(0), document.positionAt(content.length));
    try {
      const formatted = await formatSaola(content, options, range?.start.line, range?.end.line);
      if (token.isCancellationRequested || formatted === document.getText(editRange)) {
        return [];
      }
      return [vscode.TextEdit.replace(editRange, formatted)];
    } catch (error) {
      console.error('Saola formatter:', error);
      return [];
    }
  }
}
