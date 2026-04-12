import * as vscode from 'vscode';

export class ArcFormatter implements vscode.DocumentFormattingEditProvider {
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
    
    const blockKeywords = /\b(if|then|else|loop|while|def|class|trait|match|type)(\s|$)/;
    const endKeyword = /\bend\b/;

    const formattedLines = lines.map((line) => {
      const trimmed = line.trim();

      // Decrease indent for 'end' keyword
      if (endKeyword.test(trimmed)) {
        indentLevel = Math.max(0, indentLevel - 1);
      }

      // Apply indentation
      let formattedLine = '';
      if (trimmed.length > 0) {
        formattedLine = indent.repeat(indentLevel) + trimmed;
      }

      // Increase indent for block keywords
      if (blockKeywords.test(trimmed)) {
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
