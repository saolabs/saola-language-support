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
exports.SaoDefinitionProvider = void 0;
const vscode = __importStar(require("vscode"));
const viewPath_1 = require("./viewPath");
// =============================================
// Go to Definition for .sao view paths
// =============================================
// Resolves @extends/@include/@import targets and <component> tags to the
// matching .sao file. The real path mapping lives in the PHP ViewPathResolver
// (config-driven), so we match by trailing path segments instead of trying to
// mirror that config here.
const VIEW_DIRECTIVE = /@(extends|include|includeIf|includeWhen|includeUnless|includeFirst|import|each|component)\b/;
/** The quoted string literal containing `character`, if any. */
function _stringAt(line, character) {
    const re = /'([^']*)'|"([^"]*)"/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        if (character > m.index && character < m.index + m[0].length) {
            return { value: m[1] ?? m[2], start: m.index + 1, end: m.index + m[0].length - 1 };
        }
    }
    return undefined;
}
/** Directory hint from a `__alias__ +` prefix sitting before the string. */
function _aliasHint(line, before) {
    const m = line.substring(0, before).match(/(__\w+__)\s*\+\s*$/);
    return m ? (viewPath_1.ALIAS_DIRS[m[1]] ?? '') : '';
}
/**
 * Finds the .sao file for a dotted/slashed view path.
 * Candidates are ranked by how many trailing path segments they share with
 * the requested path, so 'web.modules.demo.card' still finds
 * resources/saola/web/views/modules/demo/card.sao.
 */
async function _findView(viewPath, aliasDir) {
    const { dirs, name } = (0, viewPath_1.splitViewPath)(viewPath);
    if (!name) {
        return undefined;
    }
    const files = await vscode.workspace.findFiles(`**/${name}.sao`, '**/node_modules/**', 50);
    if (files.length === 0) {
        return undefined;
    }
    if (files.length === 1) {
        return files[0];
    }
    const best = (0, viewPath_1.pickBestCandidate)(files.map(f => f.path), dirs, aliasDir);
    return files.find(f => f.path === best) ?? files[0];
}
/** Tag name under the cursor, e.g. `<post-list :x="y">` → `post-list`. */
function _tagAt(line, character) {
    const re = /<\/?([A-Za-z][\w.-]*)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
        const start = m.index + m[0].length - m[1].length;
        if (character >= start && character <= start + m[1].length) {
            return m[1];
        }
    }
    return undefined;
}
/** Resolves a component tag through the file's @import lines. */
function _importForTag(text, tag) {
    const re = /@import\s*\(\s*(?:(__\w+__)\s*\+\s*)?['"]([^'"]+)['"]\s*(?:as\s+([\w.-]+))?\s*\)/g;
    let m;
    while ((m = re.exec(text)) !== null) {
        const [, alias, path, as] = m;
        const exported = as ?? path.split(/[./]/).pop();
        if (exported.toLowerCase() === tag.toLowerCase()) {
            return { path, alias: viewPath_1.ALIAS_DIRS[alias ?? ''] ?? '' };
        }
    }
    return undefined;
}
class SaoDefinitionProvider {
    async provideDefinition(document, position) {
        const line = document.lineAt(position.line).text;
        // 1. Cursor inside a quoted path of a view directive
        const literal = _stringAt(line, position.character);
        if (literal && VIEW_DIRECTIVE.test(line)) {
            const target = await _findView(literal.value, _aliasHint(line, literal.start - 1));
            if (target) {
                return new vscode.Location(target, new vscode.Position(0, 0));
            }
            return undefined;
        }
        // 2. Cursor on a component tag → follow its @import
        const tag = _tagAt(line, position.character);
        if (tag) {
            const imported = _importForTag(document.getText(), tag);
            if (imported) {
                const target = await _findView(imported.path, imported.alias);
                if (target) {
                    return new vscode.Location(target, new vscode.Position(0, 0));
                }
            }
        }
        return undefined;
    }
}
exports.SaoDefinitionProvider = SaoDefinitionProvider;
//# sourceMappingURL=navigation.js.map