"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArcFormatter = void 0;
const vscode = __importStar(require("vscode"));
class ArcFormatter {
    async provideDocumentFormattingEdits(document, options, _token) {
        const edits = [];
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
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(content.length));
        edits.push(new vscode.TextEdit(fullRange, formattedContent));
        return edits;
    }
}
exports.ArcFormatter = ArcFormatter;
//# sourceMappingURL=arcFormatter.js.map