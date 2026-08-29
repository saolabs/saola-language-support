import * as vscode from 'vscode';
export declare class SaoDefinitionProvider implements vscode.DefinitionProvider {
    provideDefinition(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Definition | undefined>;
}
