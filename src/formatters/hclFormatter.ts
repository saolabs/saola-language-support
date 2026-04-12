import * as vscode from 'vscode';

export class HclFormatter implements vscode.DocumentFormattingEditProvider {
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    options: vscode.FormattingOptions,
    _token: vscode.CancellationToken
  ): Promise<vscode.TextEdit[]> {
    const edits: vscode.TextEdit[] = [];
    const content = document.getText();
    const lines = content.split('\n');
    const tabSize = options.tabSize || 2;
    const insertSpaces = options.insertSpaces !== false;

    let indentLevel = 0;
    const indent = insertSpaces ? ' '.repeat(tabSize) : '\t';

    const formattedLines = lines.map((line) => {
      const trimmed = line.trim();

      // Decrease indent for closing braces
      if (trimmed.startsWith('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Apply indentation
      let formattedLine = '';
      if (trimmed.length > 0) {
        formattedLine = indent.repeat(indentLevel) + trimmed;
      }

      // Increase indent for opening braces
      if (trimmed.endsWith('{')) {
        indentLevel++;
      }

      return formattedLine;
    });

    const formattedContent = formattedLines.join('\n');
    const fullRange = new vscode.Range(
      document.positionAt(0),
      document.positionAt(content.length)
    );

    edits.push(new vscode.TextEdit(fullRange, formattedContent));
    return edits;
  }
}
