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
exports.activate = activate;
exports.deactivate = deactivate;
const vscode = __importStar(require("vscode"));
const saoFormatter_1 = require("./formatters/saoFormatter");
const navigation_1 = require("./navigation");
const emmet_helper_1 = require("@vscode/emmet-helper");
const vscode_languageserver_textdocument_1 = require("vscode-languageserver-textdocument");
// =============================================
// Emmet Completion Provider for Saola templates
// =============================================
/**
 * Determines if the cursor position is in an HTML markup context
 * where Emmet abbreviations should be expanded.
 * Returns false for: @directive() args, {{ }}, <script>, <style>, etc.
 */
function _isInHtmlContext(document, position) {
    const text = document.getText();
    const offset = document.offsetAt(position);
    const lineText = document.lineAt(position.line).text;
    const beforeCursor = lineText.substring(0, position.character);
    // Skip if line starts with @ directive (outside HTML context)
    const trimmedLine = lineText.trim();
    if (/^@\w+/.test(trimmedLine) && !trimmedLine.match(/^@(end\w+|else|elseif|case|default|break|continue|empty|csrf)\b/)) {
        // This is a directive line - but check if we're after the directive's closing paren
        const directiveMatch = lineText.match(/@\w+\s*\([^)]*\)\s*/);
        if (directiveMatch) {
            const afterDirective = (lineText.indexOf(directiveMatch[0]) + directiveMatch[0].length);
            if (position.character < afterDirective) {
                return false; // Inside directive args
            }
            // After directive args - could be HTML content on same line
        }
        else if (lineText.match(/@\w+\s*\(/)) {
            // Opening paren but no closing - inside multi-line directive args
            return false;
        }
    }
    // Check if inside {{ }}, {!! !!}, {{{ }}} blocks
    const textBefore = text.substring(0, offset);
    // Check for unclosed {{ (not inside a Blade echo)
    const lastDoubleBraceOpen = textBefore.lastIndexOf('{{');
    if (lastDoubleBraceOpen >= 0) {
        const afterOpen = text.substring(lastDoubleBraceOpen);
        const closeMatch = afterOpen.match(/\}\}|--\}\}/);
        if (!closeMatch || (lastDoubleBraceOpen + closeMatch.index) > offset) {
            // Check it's not a comment opening {{--
            if (text[lastDoubleBraceOpen + 2] !== '-') {
                return false;
            }
        }
    }
    // Check for unclosed {!!
    const lastUnescapedOpen = textBefore.lastIndexOf('{!!');
    if (lastUnescapedOpen >= 0) {
        const afterOpen = text.substring(lastUnescapedOpen);
        const closeIdx = afterOpen.indexOf('!!}');
        if (closeIdx < 0 || (lastUnescapedOpen + closeIdx) > offset) {
            return false;
        }
    }
    // Check if inside <script> or <style> blocks
    const scriptStyleRe = /<(script|style)\b[^>]*>/gi;
    let match;
    while ((match = scriptStyleRe.exec(text)) !== null) {
        const openEnd = match.index + match[0].length;
        const tag = match[1].toLowerCase();
        const closeRe = new RegExp(`</${tag}\\s*>`, 'i');
        const closeMatch = closeRe.exec(text.substring(openEnd));
        if (closeMatch) {
            const closeStart = openEnd + closeMatch.index;
            if (offset > openEnd && offset < closeStart) {
                return false;
            }
        }
        else if (offset > openEnd) {
            return false; // Unclosed script/style tag
        }
    }
    // Check if inside @directive(...) arguments (multi-line aware)
    // Walk backwards to find if we're inside a directive's parens
    let parenDepth = 0;
    let inDirectiveArgs = false;
    for (let i = offset - 1; i >= 0; i--) {
        const ch = text[i];
        if (ch === ')') {
            parenDepth++;
        }
        else if (ch === '(') {
            if (parenDepth === 0) {
                // Check if this paren is preceded by a @directive
                const preceding = text.substring(Math.max(0, i - 30), i);
                if (/@\w+\s*$/.test(preceding)) {
                    inDirectiveArgs = true;
                }
                break;
            }
            parenDepth--;
        }
    }
    if (inDirectiveArgs) {
        return false;
    }
    // Check if the abbreviation text looks like an Emmet pattern
    // Skip pure text/word that looks like a regular attribute value
    const word = beforeCursor.match(/[\w.#>+*^()[\]{}:$!@-]+$/);
    if (!word) {
        return false;
    }
    // Don't trigger on lines that look like they're inside attribute values
    // e.g. class="something"
    const quotesBefore = (beforeCursor.match(/"/g) || []).length;
    if (quotesBefore % 2 !== 0) {
        return false; // Inside a quoted attribute value
    }
    const singleQuotesBefore = (beforeCursor.match(/'/g) || []).length;
    if (singleQuotesBefore % 2 !== 0) {
        return false;
    }
    return true;
}
function _getEmmetConfiguration() {
    const emmetConfig = vscode.workspace.getConfiguration('emmet');
    return {
        showExpandedAbbreviation: emmetConfig.get('showExpandedAbbreviation') || 'always',
        showAbbreviationSuggestions: emmetConfig.get('showAbbreviationSuggestions') ?? true,
        syntaxProfiles: emmetConfig.get('syntaxProfiles') || {},
        variables: emmetConfig.get('variables') || {},
        preferences: emmetConfig.get('preferences') || {},
        excludeLanguages: emmetConfig.get('excludeLanguages') || [],
        showSuggestionsAsSnippets: emmetConfig.get('showSuggestionsAsSnippets') ?? false,
    };
}
class SaoEmmetCompletionProvider {
    provideCompletionItems(document, position, _token, _context) {
        // Only provide Emmet in HTML-like contexts
        if (!_isInHtmlContext(document, position)) {
            return undefined;
        }
        const syntax = 'html';
        const emmetConfig = _getEmmetConfiguration();
        // Convert to LSP TextDocument
        const lsDoc = vscode_languageserver_textdocument_1.TextDocument.create(document.uri.toString(), document.languageId, document.version, document.getText());
        const result = (0, emmet_helper_1.doComplete)(lsDoc, position, syntax, emmetConfig);
        if (!result || !result.items.length) {
            return undefined;
        }
        const completionItems = result.items.map((item) => {
            const ci = new vscode.CompletionItem(item.label, vscode.CompletionItemKind.Snippet);
            ci.documentation = item.documentation;
            ci.detail = item.detail || 'Emmet Abbreviation';
            ci.insertText = new vscode.SnippetString(item.textEdit.newText);
            ci.filterText = item.filterText;
            ci.sortText = item.sortText;
            const range = item.textEdit.range;
            ci.range = new vscode.Range(range.start.line, range.start.character, range.end.line, range.end.character);
            return ci;
        });
        return new vscode.CompletionList(completionItems, true);
    }
}
const BLADE_DIRECTIVES = [
    // === Laravel Blade - Control Flow ===
    { label: '@if', detail: 'Conditional if statement', insertText: '@if(${1:condition})\n\t$0\n@endif' },
    { label: '@else', detail: 'Else clause' },
    { label: '@elseif', detail: 'Else if clause', insertText: '@elseif(${1:condition})' },
    { label: '@endif', detail: 'End if block' },
    { label: '@unless', detail: 'Unless condition (inverse if)', insertText: '@unless(${1:condition})\n\t$0\n@endunless' },
    { label: '@endunless', detail: 'End unless block' },
    { label: '@switch', detail: 'Switch statement', insertText: '@switch(${1:expression})\n\t@case(${2:value})\n\t\t$0\n\t\t@break\n\t@default\n\t\t\n@endswitch' },
    { label: '@case', detail: 'Case in switch', insertText: '@case(${1:value})' },
    { label: '@default', detail: 'Default case' },
    { label: '@break', detail: 'Break switch case' },
    { label: '@endswitch', detail: 'End switch block' },
    // === Laravel Blade - Loops ===
    { label: '@foreach', detail: 'Loop through items (Modern)', insertText: '@foreach(${1:items} as ${2:item})\n\t$0\n@endforeach' },
    { label: '@endforeach', detail: 'End foreach loop' },
    { label: '@forelse', detail: 'Loop with empty fallback (Modern)', insertText: '@forelse(${1:items} as ${2:item})\n\t$0\n@empty\n\t\n@endforelse' },
    { label: '@endforelse', detail: 'End forelse loop' },
    { label: '@for', detail: 'For loop (Modern)', insertText: '@for(${1:i = 0; i < 10; i++})\n\t$0\n@endfor' },
    { label: '@endfor', detail: 'End for loop' },
    { label: '@while', detail: 'While loop', insertText: '@while(${1:condition})\n\t$0\n@endwhile' },
    { label: '@endwhile', detail: 'End while loop' },
    { label: '@key', detail: 'List item key for DOM reconciliation/diffing', insertText: '@key(${1:item.id})' },
    { label: '@each', detail: 'Render view for each item', insertText: '@each(\'${1:view}\', ${2:\\$items}, \'${3:item}\')' },
    { label: '@continue', detail: 'Continue to next iteration' },
    // === Laravel Blade - Auth & Permissions ===
    { label: '@auth', detail: 'Check if authenticated', insertText: '@auth\n\t$0\n@endauth' },
    { label: '@endauth', detail: 'End auth block' },
    { label: '@guest', detail: 'Check if guest', insertText: '@guest\n\t$0\n@endguest' },
    { label: '@endguest', detail: 'End guest block' },
    { label: '@can', detail: 'Check authorization ability', insertText: '@can(\'${1:ability}\')\n\t$0\n@endcan' },
    { label: '@endcan', detail: 'End can block' },
    { label: '@cannot', detail: 'Check cannot (inverse can)', insertText: '@cannot(\'${1:ability}\')\n\t$0\n@endcannot' },
    { label: '@endcannot', detail: 'End cannot block' },
    { label: '@canany', detail: 'Check any of multiple abilities', insertText: '@canany([${1:\'ability1\', \'ability2\'}])\n\t$0\n@endcanany' },
    { label: '@endcanany', detail: 'End canany block' },
    // === Laravel Blade - Layout & Sections ===
    { label: '@section', detail: 'Define section', insertText: '@section(\'${1:name}\')\n\t$0\n@endsection' },
    { label: '@endsection', detail: 'End section' },
    { label: '@yield', detail: 'Output section content', insertText: '@yield(\'${1:name}\')' },
    { label: '@extends', detail: 'Extend parent layout', insertText: '@extends(\'${1:layout}\')' },
    { label: '@include', detail: 'Include partial view', insertText: '@include(\'${1:view}\')' },
    { label: '@includeIf', detail: 'Include if exists', insertText: '@includeIf(\'${1:view}\')' },
    { label: '@includeWhen', detail: 'Include when condition true', insertText: '@includeWhen(${1:condition}, \'${2:view}\')' },
    { label: '@includeUnless', detail: 'Include unless condition true', insertText: '@includeUnless(${1:condition}, \'${2:view}\')' },
    { label: '@includeFirst', detail: 'Include first existing view', insertText: '@includeFirst([${1:\'view1\', \'view2\'}])' },
    { label: '@hasSection', detail: 'Check if section has content', insertText: '@hasSection(\'${1:name}\')' },
    { label: '@sectionMissing', detail: 'Check if section is missing', insertText: '@sectionMissing(\'${1:name}\')' },
    // === Laravel Blade - Components & Slots ===
    { label: '@component', detail: 'Include component', insertText: '@component(\'${1:component}\')\n\t$0\n@endcomponent' },
    { label: '@endcomponent', detail: 'End component block' },
    { label: '@slot', detail: 'Define component slot', insertText: '@slot(\'${1:name}\')\n\t$0\n@endslot' },
    { label: '@endslot', detail: 'End slot block' },
    { label: '@aware', detail: 'Access parent component variables' },
    // === Laravel Blade - Stacks ===
    { label: '@push', detail: 'Push content to stack', insertText: '@push(\'${1:name}\')\n\t$0\n@endpush' },
    { label: '@endpush', detail: 'End push block' },
    { label: '@pushOnce', detail: 'Push content to stack once', insertText: '@pushOnce(\'${1:name}\')\n\t$0\n@endPushOnce' },
    { label: '@endPushOnce', detail: 'End pushOnce block' },
    { label: '@pushIf', detail: 'Push to stack if condition', insertText: '@pushIf(${1:condition}, \'${2:name}\')\n\t$0\n@endPushIf' },
    { label: '@endPushIf', detail: 'End pushIf block' },
    { label: '@prepend', detail: 'Prepend content to stack', insertText: '@prepend(\'${1:name}\')\n\t$0\n@endprepend' },
    { label: '@endprepend', detail: 'End prepend block' },
    { label: '@prependOnce', detail: 'Prepend to stack once', insertText: '@prependOnce(\'${1:name}\')\n\t$0\n@endPrependOnce' },
    { label: '@endPrependOnce', detail: 'End prependOnce block' },
    { label: '@stack', detail: 'Render stack content', insertText: '@stack(\'${1:name}\')' },
    // === Laravel Blade - Conditional Classes & Attributes ===
    { label: '@class', detail: 'Conditionally apply classes', insertText: '@class([${1:\'class\' => condition}])' },
    { label: '@style', detail: 'Conditionally apply styles', insertText: '@style([${1:\'property: value\' => condition}])' },
    { label: '@checked', detail: 'Bind checked attribute', insertText: '@checked(${1:condition})' },
    { label: '@selected', detail: 'Bind selected attribute', insertText: '@selected(${1:condition})' },
    { label: '@disabled', detail: 'Bind disabled attribute', insertText: '@disabled(${1:condition})' },
    { label: '@readonly', detail: 'Bind readonly attribute', insertText: '@readonly(${1:condition})' },
    { label: '@required', detail: 'Bind required attribute', insertText: '@required(${1:condition})' },
    // === Laravel Blade - Forms & Security ===
    { label: '@csrf', detail: 'CSRF token field' },
    { label: '@method', detail: 'HTTP method spoofing', insertText: '@method(\'${1:PUT}\')' },
    { label: '@error', detail: 'Show validation error', insertText: '@error(\'${1:field}\')\n\t$0\n@enderror' },
    { label: '@enderror', detail: 'End error block' },
    // === Laravel Blade - Conditions ===
    { label: '@isset', detail: 'Check if variable set', insertText: '@isset(${1:\$variable})\n\t$0\n@endisset' },
    { label: '@endisset', detail: 'End isset block' },
    { label: '@empty', detail: 'Check if empty', insertText: '@empty(${1:\$variable})\n\t$0\n@endempty' },
    { label: '@endempty', detail: 'End empty block' },
    { label: '@env', detail: 'Check environment', insertText: '@env(\'${1:local}\')\n\t$0\n@endenv' },
    { label: '@endenv', detail: 'End env block' },
    { label: '@production', detail: 'Check if production', insertText: '@production\n\t$0\n@endproduction' },
    { label: '@endproduction', detail: 'End production block' },
    // === Laravel Blade - Rendering ===
    { label: '@once', detail: 'Render block once', insertText: '@once\n\t$0\n@endonce' },
    { label: '@endonce', detail: 'End once block' },
    { label: '@verbatim', detail: 'Display raw Blade syntax', insertText: '@verbatim\n\t$0\n@endverbatim' },
    { label: '@endverbatim', detail: 'End verbatim block' },
    { label: '@comment', detail: 'Blade comment block', insertText: '@comment\n\t$0\n@endcomment' },
    { label: '@endcomment', detail: 'End comment block' },
    // === Laravel Blade - PHP & Data ===
    { label: '@php', detail: 'Inline PHP code', insertText: '@php\n\t$0\n@endphp' },
    { label: '@endphp', detail: 'End PHP block' },
    { label: '@json', detail: 'JSON encode output', insertText: '@json(${1:\$data})' },
    { label: '@js', detail: 'JS encode output', insertText: '@js(${1:\$data})' },
    { label: '@dump', detail: 'Dump variable for debugging', insertText: '@dump(${1:variable})' },
    { label: '@dd', detail: 'Dump and die for debugging', insertText: '@dd(${1:variable})' },
    { label: '@use', detail: 'Use PHP class in template', insertText: '@use(\'${1:App\\Models\\User}\')' },
    { label: '@session', detail: 'Access session data', insertText: '@session(\'${1:key}\')' },
    { label: '@lang', detail: 'Translate language string', insertText: '@lang(\'${1:messages.key}\')' },
    // ======================================
    // ======================================
    // Saola Custom Directives (Modern Syntax)
    // ======================================
    // --- Data & Variables ---
    { label: '@import', detail: 'Import template/component', insertText: '@import(${1:__template__ + \'path\'} as ${2:Name})' },
    { label: '@importView', detail: 'Import a view inside <script setup>', insertText: '@importView(${1:__component__ + \'path\'} as ${2:Name})' },
    { label: '@props', detail: 'Declare component properties', insertText: '@props(${1:title, theme=\'dark\'})' },
    { label: '@vars', detail: 'Declare non-reactive variables', insertText: '@vars(${1:users, posts})' },
    { label: '@let', detail: 'Mutable local; optional name: Type = value', insertText: '@let(${1:varName = value})' },
    { label: '@const', detail: 'Constant; optional name: Type = value', insertText: '@const(${1:NAME = value})' },
    { label: '@computed', detail: 'Lazy computed; optional type; script reads get$name()', insertText: '@computed(${1:fullName} = ${2:first + \' \' + last})' },
    // --- Reactive State ---
    { label: '@states', detail: 'Declare reactive state (JS Object)', insertText: '@states({\n\t${1:count: 0}\n})' },
    { label: '@state', detail: 'Declare reactive state (assignment)', insertText: '@state(\n\t${1:varName = value}\n)' },
    { label: '@useState', detail: 'Declare reactive state (Legacy)', insertText: '@useState(${1:\$state}, ${2:initialValue})' },
    // --- Utility ---
    { label: '@exec', detail: 'Execute expression silently', insertText: '@exec(${1:varName = value})' },
    { label: '@out', detail: 'Output variable (unescaped)', insertText: '@out(${1:variable})' },
    // --- Attribute Binding ---
    { label: '@bind', detail: 'Two-way data binding (v-model)', insertText: '@bind(${1:variable})' },
    { label: '@val', detail: 'Bind value attribute', insertText: '@val(${1:variable})' },
    { label: '@attr', detail: 'Dynamic attributes', insertText: '@attr({${1:name: value}})' },
    { label: '@class', detail: 'Dynamic CSS classes', insertText: '@class({${1:\'class\': condition}})' },
    { label: '@style', detail: 'Dynamic inline styles', insertText: '@style({${1:\'property\': value}})' },
    { label: '@show', detail: 'Toggle visibility (display: none)', insertText: '@show(${1:condition})' },
    { label: '@transition', detail: "Enter/leave transition — sinh class {name}-enter-from/-active/-to và {name}-leave-*", insertText: "@transition('${1:fade}')" },
    { label: '@hide', detail: 'Hide element (display: none)', insertText: '@hide(${1:condition})' },
    // --- Event Handling ---
    // Modifier nối bằng dấu chấm, xếp chồng được: @click.stop.once(...)
    // Tập hợp lệ phải khớp EVENT_MODIFIERS trong compiler/src/sao2js/template_ast.py.
    { label: '@click.prevent', detail: 'Click + event.preventDefault()', insertText: '@click.prevent(${1:handler()})' },
    { label: '@click.stop', detail: 'Click + event.stopPropagation()', insertText: '@click.stop(${1:handler()})' },
    { label: '@click.self', detail: 'Click chỉ khi target === currentTarget', insertText: '@click.self(${1:handler()})' },
    { label: '@click.once', detail: 'Click chỉ chạy một lần', insertText: '@click.once(${1:handler()})' },
    { label: '@submit.prevent', detail: 'Submit + event.preventDefault()', insertText: '@submit.prevent(${1:handler()})' },
    { label: '@click', detail: 'Click events', insertText: '@click(${1:handler()})' },
    { label: '@input', detail: 'Input events', insertText: '@input(${1:handler()})' },
    { label: '@change', detail: 'Change events', insertText: '@change(${1:handler()})' },
    { label: '@submit', detail: 'Form submit events', insertText: '@submit(${1:handler()})' },
    { label: '@keyup', detail: 'Key up events', insertText: '@keyup(${1:handler(event)})' },
    { label: '@keydown', detail: 'Key down events', insertText: '@keydown(${1:handler(event)})' },
    { label: '@keypress', detail: 'Key press events', insertText: '@keypress(${1:handler(event)})' },
    { label: '@focus', detail: 'Focus events', insertText: '@focus(${1:handler()})' },
    { label: '@blur', detail: 'Blur events', insertText: '@blur(${1:handler()})' },
    { label: '@mouseenter', detail: 'Mouse enter events', insertText: '@mouseenter(${1:handler()})' },
    { label: '@mouseleave', detail: 'Mouse leave events', insertText: '@mouseleave(${1:handler()})' },
    { label: '@mouseover', detail: 'Mouse over events', insertText: '@mouseover(${1:handler()})' },
    { label: '@mouseout', detail: 'Mouse out events', insertText: '@mouseout(${1:handler()})' },
    { label: '@dblclick', detail: 'Double click events', insertText: '@dblclick(${1:handler()})' },
    { label: '@contextmenu', detail: 'Context menu (right-click)', insertText: '@contextmenu(${1:handler()})' },
    { label: '@wheel', detail: 'Mouse wheel events', insertText: '@wheel(${1:handler()})' },
    { label: '@scroll', detail: 'Scroll events', insertText: '@scroll(${1:handler()})' },
    { label: '@resize', detail: 'Resize events', insertText: '@resize(${1:handler()})' },
    { label: '@load', detail: 'Load events', insertText: '@load(${1:handler()})' },
    // --- View Structure ---
    { label: '@view', detail: 'Configure view/component', insertText: '@view(${1::subscribe})' },
    { label: '@wrapper', detail: 'Wrap content in component', insertText: '@wrapper(\'${1:component}\')' },
    { label: '@block', detail: 'Define content block', insertText: '@block(\'${1:name}\')\n\t$0\n@endblock' },
    { label: '@endblock', detail: 'End block' },
    { label: '@useBlock', detail: 'Render block content', insertText: '@useBlock(\'${1:name}\')' },
    { label: '@mountBlock', detail: 'Mount block (alias)', insertText: '@mountBlock(\'${1:name}\')' },
    // --- Async ---
    { label: '@fetch', detail: 'Fetch data from API', insertText: '@fetch(\'${1:/api/endpoint}\')' },
    { label: '@await', detail: 'Mark component as async', insertText: '@await' },
];
class OneDirectiveCompletionProvider {
    provideCompletionItems(document, position, token, context) {
        const line = document.lineAt(position).text;
        const beforeCursor = line.substring(0, position.character);
        // Only suggest if @ is typed
        if (!beforeCursor.includes('@')) {
            return [];
        }
        const lastAtIndex = beforeCursor.lastIndexOf('@');
        const afterAt = beforeCursor.substring(lastAtIndex + 1);
        // Don't suggest if we're inside a string or already past valid directive characters
        if (/[^a-zA-Z]/.test(afterAt) && afterAt.length > 0) {
            return [];
        }
        return BLADE_DIRECTIVES
            .filter(d => d.label.substring(1).toLowerCase().startsWith(afterAt.toLowerCase()))
            .map(directive => {
            const item = new vscode.CompletionItem(directive.label, vscode.CompletionItemKind.Keyword);
            item.detail = directive.detail;
            item.range = new vscode.Range(new vscode.Position(position.line, lastAtIndex), position);
            // Add snippet insert text if available
            if (directive.insertText) {
                item.insertText = new vscode.SnippetString(directive.insertText);
            }
            return item;
        });
    }
}
// =========================================================================
// Saola Attribute, Binding, Variable & Special Tag Completion Provider
// =========================================================================
const COMMON_BINDING_ATTRS = [
    { label: ':key', detail: 'DOM diffing key for list reconciliation', insertText: ':key="${1:item.id}"' },
    { label: ':class', detail: 'Dynamic CSS class binding (object/expression)', insertText: ':class="{ ${1:\'active\'}: ${2:condition} }"' },
    { label: ':style', detail: 'Dynamic inline style binding (object/expression)', insertText: ':style="{ ${1:\'property\'}: ${2:value} }"' },
    { label: ':is', detail: 'Dynamic component / tag name binding', insertText: ':is="${1:component}"' },
    { label: ':id', detail: 'Dynamic ID binding', insertText: ':id="${1:id}"' },
    { label: ':title', detail: 'Dynamic title binding', insertText: ':title="${1:title}"' },
    { label: ':src', detail: 'Dynamic image/media source binding', insertText: ':src="${1:src}"' },
    { label: ':href', detail: 'Dynamic link URL binding', insertText: ':href="${1:href}"' },
    { label: ':value', detail: 'Dynamic value attribute binding', insertText: ':value="${1:value}"' },
    { label: ':disabled', detail: 'Dynamic disabled boolean binding', insertText: ':disabled="${1:condition}"' },
    { label: ':checked', detail: 'Dynamic checked boolean binding', insertText: ':checked="${1:condition}"' },
    { label: ':selected', detail: 'Dynamic selected boolean binding', insertText: ':selected="${1:condition}"' },
    { label: ':readonly', detail: 'Dynamic readonly boolean binding', insertText: ':readonly="${1:condition}"' },
    { label: ':required', detail: 'Dynamic required boolean binding', insertText: ':required="${1:condition}"' },
    { label: ':hidden', detail: 'Dynamic hidden boolean binding', insertText: ':hidden="${1:condition}"' },
    { label: ':placeholder', detail: 'Dynamic placeholder text binding', insertText: ':placeholder="${1:placeholder}"' },
    { label: ':name', detail: 'Dynamic name attribute binding', insertText: ':name="${1:name}"' },
    { label: ':type', detail: 'Dynamic type attribute binding', insertText: ':type="${1:type}"' },
    { label: ':alt', detail: 'Dynamic alt text binding', insertText: ':alt="${1:alt}"' },
    { label: ':width', detail: 'Dynamic width binding', insertText: ':width="${1:width}"' },
    { label: ':height', detail: 'Dynamic height binding', insertText: ':height="${1:height}"' },
];
const SPECIAL_DYNAMIC_TAGS = [
    { label: '<:template>', detail: 'Saola template root / fragment wrapper', insertText: '<:template>\n\t$0\n</:template>' },
    { label: '<:slot>', detail: 'Saola named slot content', insertText: '<:slot name="${1:name}">\n\t$0\n</:slot>' },
    { label: '<:component>', detail: 'Saola dynamic component renderer', insertText: '<:component is="${1:componentName}">$0</:component>' },
    { label: '<:is>', detail: 'Saola dynamic tag alias', insertText: '<:is="${1:tag}">$0</:is>' },
];
function _collectImportedComponents(text) {
    const re = /@import(?:View)?\s*\(\s*(?:(__\w+__)\s*\+\s*)?['"]([^'"]+)['"]\s*(?:as\s+([\w:.-]+))?\s*\)/g;
    const components = [];
    let m;
    while ((m = re.exec(text)) !== null) {
        const [, , path, as] = m;
        const exported = as ?? path.split(/[./]/).pop();
        components.push({ name: exported, original: path });
    }
    return components;
}
function _kebabCase(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}
function _getHtmlTagContext(document, position) {
    const lineText = document.lineAt(position.line).text;
    const beforeCursor = lineText.substring(0, position.character);
    // 1. Tag start check
    const tagStartM = beforeCursor.match(/<([A-Za-z_:][\w:.-]*)$/);
    if (tagStartM || beforeCursor.endsWith('<')) {
        return {
            inTag: false,
            isStartingTag: true,
            tagPrefix: tagStartM ? tagStartM[1] : ''
        };
    }
    // 2. Check if inside {{ ... }} or {!! ... !!}
    const lastDoubleBrace = beforeCursor.lastIndexOf('{{');
    const lastUnescaped = beforeCursor.lastIndexOf('{!!');
    const lastEcho = Math.max(lastDoubleBrace, lastUnescaped);
    if (lastEcho >= 0) {
        const afterEcho = beforeCursor.substring(lastEcho);
        if (!afterEcho.includes('}}') && !afterEcho.includes('!!}')) {
            return { inTag: false, inAttrValue: true, isBindingAttr: true };
        }
    }
    // 3. Scan backwards up to 15 lines to find enclosing '<tag' if not closed by '>'
    let textToCursor = '';
    const startLine = Math.max(0, position.line - 15);
    for (let l = startLine; l < position.line; l++) {
        textToCursor += document.lineAt(l).text + '\n';
    }
    textToCursor += beforeCursor;
    const lastOpen = textToCursor.lastIndexOf('<');
    const lastClose = textToCursor.lastIndexOf('>');
    if (lastOpen >= 0 && lastOpen > lastClose) {
        const afterTag = textToCursor.substring(lastOpen);
        const tagMatch = afterTag.match(/^<([A-Za-z_:][\w:.-]*)/);
        if (tagMatch) {
            const tagName = tagMatch[1];
            // Check if cursor is inside attribute quotes: (:?[A-Za-z_@][\w:.-]*)\s*=\s*(["'])([^"']*)$
            const attrMatch = afterTag.match(/(:?[A-Za-z_@][\w:.-]*)\s*=\s*(["'])([^"']*)$/);
            if (attrMatch) {
                const attrName = attrMatch[1];
                const isBindingAttr = attrName.startsWith(':') || attrName.startsWith('@');
                return { inTag: true, tagName, inAttrValue: true, attrName, isBindingAttr };
            }
            return { inTag: true, tagName, inAttrValue: false };
        }
    }
    return { inTag: false };
}
class SaoAttributeAndTagCompletionProvider {
    provideCompletionItems(document, position, _token, _context) {
        const lineText = document.lineAt(position.line).text;
        const beforeCursor = lineText.substring(0, position.character);
        const docText = document.getText();
        const ctx = _getHtmlTagContext(document, position);
        // ── 1. TAG COMPLETIONS (< or <:) ──────────────────────────────────────────
        if (ctx.isStartingTag) {
            const prefix = ctx.tagPrefix || '';
            const items = [];
            // Special tags (<:slot, <:template, <:component, <:is>)
            for (const tag of SPECIAL_DYNAMIC_TAGS) {
                const cleanTag = tag.label.replace(/[<>]/g, '');
                if (cleanTag.toLowerCase().includes(prefix.toLowerCase()) || prefix === ':') {
                    const item = new vscode.CompletionItem(tag.label, vscode.CompletionItemKind.Class);
                    item.detail = tag.detail;
                    item.insertText = new vscode.SnippetString(prefix ? tag.insertText.substring(1 + prefix.length) : tag.insertText.substring(1));
                    items.push(item);
                }
            }
            // Imported component tags from @import
            const importedComps = _collectImportedComponents(docText);
            for (const comp of importedComps) {
                const pascalName = comp.name;
                const kebabName = _kebabCase(comp.name);
                // PascalCase snippet
                const pItem = new vscode.CompletionItem(`<${pascalName}>`, vscode.CompletionItemKind.Struct);
                pItem.detail = `Component: ${comp.original}`;
                pItem.insertText = new vscode.SnippetString(prefix ? `${pascalName} $1/>` : `${pascalName} $1/>`);
                items.push(pItem);
                // kebab-case snippet if different
                if (kebabName !== pascalName.toLowerCase()) {
                    const kItem = new vscode.CompletionItem(`<${kebabName}>`, vscode.CompletionItemKind.Struct);
                    kItem.detail = `Component: ${comp.original} (kebab-case)`;
                    kItem.insertText = new vscode.SnippetString(prefix ? `${kebabName} $1/>` : `${kebabName} $1/>`);
                    items.push(kItem);
                }
            }
            return new vscode.CompletionList(items, false);
        }
        // ── 2. VARIABLE EXPRESSION COMPLETIONS (inside :attr="..." or {{ ... }}) ──
        if (ctx.inAttrValue && ctx.isBindingAttr) {
            const declaredVars = _collectDeclaredVars(docText);
            const items = [];
            for (const v of declaredVars) {
                if (_IS_PHP_SUPERGLOBAL(v)) {
                    continue;
                }
                const isFunc = v.startsWith('set') && v.length > 3 && v[3] === v[3].toUpperCase();
                const item = new vscode.CompletionItem(v, isFunc ? vscode.CompletionItemKind.Function : vscode.CompletionItemKind.Variable);
                item.detail = _IMPLICIT_VARS.has(v)
                    ? `Saola Implicit Variable: ${v}`
                    : isFunc
                        ? `State Setter: ${v}(newValue)`
                        : `Declared Variable/State: ${v}`;
                if (isFunc) {
                    item.insertText = new vscode.SnippetString(`${v}(\${1:value})`);
                }
                items.push(item);
            }
            return new vscode.CompletionList(items, false);
        }
        // ── 3. ATTRIBUTE COMPLETIONS INSIDE TAG (<tag :... or <tag @...) ───────────
        if (ctx.inTag && !ctx.inAttrValue) {
            const items = [];
            const declaredVars = _collectDeclaredVars(docText);
            // Check if typing after ':'
            const lastColonIndex = beforeCursor.lastIndexOf(':');
            const isAfterColon = lastColonIndex >= 0 && lastColonIndex >= beforeCursor.lastIndexOf(' ');
            // Common binding attributes
            for (const attr of COMMON_BINDING_ATTRS) {
                const item = new vscode.CompletionItem(attr.label, vscode.CompletionItemKind.Property);
                item.detail = attr.detail;
                item.insertText = new vscode.SnippetString(isAfterColon ? attr.insertText.substring(1) : attr.insertText);
                items.push(item);
            }
            // Dynamic binding attributes generated from declared variables/states
            for (const v of declaredVars) {
                if (_IMPLICIT_VARS.has(v) && !['user', 'users', 'items', 'item', 'errors'].includes(v)) {
                    continue;
                }
                if (v.startsWith('set') && v.length > 3 && v[3] === v[3].toUpperCase()) {
                    continue; // Skip setters as attribute names
                }
                const propBinding = `:${v}`;
                const kebabBinding = `:${_kebabCase(v)}`;
                // CamelCase prop binding
                const pItem = new vscode.CompletionItem(propBinding, vscode.CompletionItemKind.Field);
                pItem.detail = `Bind ${v} property (:${v}="${v}")`;
                pItem.insertText = new vscode.SnippetString(isAfterColon ? `${v}="\${1:${v}}"` : `:${v}="\${1:${v}}"`);
                items.push(pItem);
                // kebab-case prop binding if different
                if (kebabBinding !== propBinding) {
                    const kItem = new vscode.CompletionItem(kebabBinding, vscode.CompletionItemKind.Field);
                    kItem.detail = `Bind ${v} property (${kebabBinding}="${v}")`;
                    kItem.insertText = new vscode.SnippetString(isAfterColon ? `${_kebabCase(v)}="\${1:${v}}"` : `${kebabBinding}="\${1:${v}}"`);
                    items.push(kItem);
                }
            }
            // Event directives inside tag: @click, @input, @change, @submit.prevent, @key, @class, @style, etc.
            for (const d of BLADE_DIRECTIVES) {
                if (d.label.startsWith('@click') || d.label.startsWith('@input') || d.label.startsWith('@change') ||
                    d.label.startsWith('@submit') || d.label.startsWith('@key') || d.label.startsWith('@class') ||
                    d.label.startsWith('@style') || d.label.startsWith('@bind') || d.label.startsWith('@val') ||
                    d.label.startsWith('@transition') || d.label.startsWith('@focus') || d.label.startsWith('@blur')) {
                    const item = new vscode.CompletionItem(d.label, vscode.CompletionItemKind.Method);
                    item.detail = d.detail;
                    if (d.insertText) {
                        item.insertText = new vscode.SnippetString(d.insertText);
                    }
                    items.push(item);
                }
            }
            return new vscode.CompletionList(items, false);
        }
        return undefined;
    }
}
// =============================================
// ONE Variable Diagnostic Provider
// =============================================
// Variables always implicitly available in OneJS templates
const _IMPLICIT_VARS = new Set([
    // OneJS system variables
    '__base__', '__layout__', '__page__', '__component__',
    '__template__', '__context__', '__partial__', '__system__',
    '__env', '__helper',
    // Common Blade/Laravel implicit variables
    'loop', 'this', 'errors', 'message', 'slot',
    'app', 'request', 'auth', 'session', 'user',
]);
// PHP superglobals: $_GET, $_POST, $_SESSION, $_COOKIE, $_SERVER, $_FILES, $_ENV, $GLOBALS
const _IS_PHP_SUPERGLOBAL = (v) => /^_[A-Z]/.test(v) || v === 'GLOBALS';
function _isSaoDocument(doc) {
    return doc.languageId === 'saola' || doc.languageId === 'sao' || doc.fileName.endsWith('.sao');
}
function _detectSaoMode(text) {
    // `<template>` in ra làm ví dụ trong comment không phải thẻ bọc thật — nhận
    // nhầm là LẬT chế độ modern/legacy của cả file, kéo theo mọi chẩn đoán sai.
    // Làm trắng giữ số dòng nên firstWrapperLine vẫn đúng.
    const lines = _blankBladeComments(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.match(/^<(template|sao:blade)\b/i)) {
            return { mode: 'modern', firstWrapperLine: i };
        }
        if (line.match(/^<blade\b/i)) {
            return { mode: 'legacy', firstWrapperLine: i };
        }
    }
    // If no wrapper found, it's modern by default
    return { mode: 'modern', firstWrapperLine: -1 };
}
/** Top-level declaration names; types/default expressions never declare variables. */
function _declarationNames(content) {
    const text = content.trim();
    const names = [];
    const object = text.startsWith('{');
    let start = object ? 1 : 0;
    let depth = 0, angles = 0;
    let quote = '', inType = false, inValue = false;
    const add = (end) => {
        const match = text.slice(start, end).trim().match(/^\$?([A-Za-z_]\w*)\s*(?=[:=,;]|$)/);
        if (match) {
            names.push(match[1]);
        }
    };
    for (let i = start; i < text.length; i++) {
        const c = text[i];
        if (quote) {
            if (c === '\\') {
                i++;
            }
            else if (c === quote) {
                quote = '';
            }
            continue;
        }
        if ('"\'`'.includes(c)) {
            quote = c;
            continue;
        }
        if (object && c === '}' && depth === 0) {
            add(i);
            return names;
        }
        if ('([{'.includes(c)) {
            depth++;
            continue;
        }
        if (')]}'.includes(c)) {
            depth--;
            continue;
        }
        if (depth !== 0) {
            continue;
        }
        if (c === ':' && !object && !inValue) {
            inType = true;
        }
        if (inType && c === '<') {
            angles++;
            continue;
        }
        if (inType && c === '>' && angles > 0 && text[i - 1] !== '=') {
            angles--;
            continue;
        }
        if (angles !== 0) {
            continue;
        }
        if (c === '=' && text[i + 1] !== '>') {
            inType = false;
            inValue = true;
        }
        if (c === ',') {
            add(i);
            start = i + 1;
            inType = false;
            inValue = false;
        }
    }
    add(text.length);
    return names;
}
function _addAssignedVars(expr, vars, mode) {
    // Match both $var = and var = to support mixed modes
    const destructM = expr.match(/^\s*\[([^\]]+)\]\s*=/);
    if (destructM) {
        for (const m of destructM[1].matchAll(/\$?(\w+)/g)) {
            vars.add(m[1]);
        }
        return;
    }
    for (const name of _declarationNames(expr)) {
        vars.add(name);
    }
}
function _addDeclarationVars(content, vars, mode) {
    // Always check for object literal style first (e.g., @props({ key: val }))
    if (content.trim().startsWith('{')) {
        _addStates(content, vars);
        return;
    }
    // Handle array style (e.g., @props(['key' => 'val']))
    const arrayM = content.match(/^\s*\[([\s\S]*)\]\s*$/);
    if (arrayM) {
        _collectArrayKeys(arrayM[1], vars);
        return;
    }
    for (const name of _declarationNames(content)) {
        vars.add(name);
    }
}
function _addStates(content, vars) {
    for (const key of _declarationNames(content)) {
        vars.add(key);
        vars.add('set' + key.charAt(0).toUpperCase() + key.slice(1));
    }
}
function _addUseStateVars(content, vars) {
    const arrayM = content.match(/^\s*\[([\s\S]*)\]\s*$/);
    if (arrayM) {
        _collectArrayKeys(arrayM[1], vars);
        // Also add setter functions for each state variable
        const keys = new Set();
        _collectArrayKeys(arrayM[1], keys);
        for (const key of keys) {
            vars.add('set' + key.charAt(0).toUpperCase() + key.slice(1));
        }
    }
    else {
        // Single variable case: @useState($state)
        const assignM = content.match(/^\s*\$(\w+)/);
        if (assignM) {
            vars.add(assignM[1]);
            vars.add('set' + assignM[1].charAt(0).toUpperCase() + assignM[1].slice(1));
        }
    }
}
function _collectArrayKeys(content, vars) {
    // Check if this is an associative array (contains =>)
    const isAssociative = content.includes('=>');
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let escaped = false;
    let quoteStart = -1;
    for (let i = 0; i < content.length; i++) {
        const ch = content[i];
        if (escaped) {
            escaped = false;
            continue;
        }
        if (ch === '\\') {
            escaped = true;
            continue;
        }
        if (inSingle || inDouble) {
            const closeQuote = inSingle ? "'" : '"';
            if (ch === closeQuote) {
                const key = content.slice(quoteStart + 1, i);
                const remainder = content.slice(i + 1).trimStart();
                if (isAssociative) {
                    // For associative arrays: only add keys (before =>)
                    if (depth === 0 && remainder.startsWith('=>')) {
                        vars.add(key);
                    }
                }
                else {
                    // For simple arrays: add all quoted values
                    if (depth === 0 && (remainder.startsWith(',') || remainder.startsWith(']') || remainder === '')) {
                        vars.add(key);
                    }
                }
                inSingle = false;
                inDouble = false;
                quoteStart = -1;
            }
            continue;
        }
        if (ch === "'") {
            inSingle = true;
            quoteStart = i;
            continue;
        }
        if (ch === '"') {
            inDouble = true;
            quoteStart = i;
            continue;
        }
        if (ch === '[') {
            depth += 1;
            continue;
        }
        if (ch === ']') {
            depth = Math.max(0, depth - 1);
            continue;
        }
    }
}
function _extractDirectiveContent(lines, startIndex) {
    const firstLine = lines[startIndex];
    const openParenIndex = firstLine.indexOf('(');
    if (openParenIndex < 0) {
        return '';
    }
    let depth = 0;
    let inSingle = false;
    let inDouble = false;
    let escaped = false;
    let content = '';
    for (let lineIndex = startIndex; lineIndex < lines.length; lineIndex++) {
        const line = lines[lineIndex];
        const startPos = lineIndex === startIndex ? openParenIndex + 1 : 0;
        for (let charIndex = startPos; charIndex < line.length; charIndex++) {
            const ch = line[charIndex];
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                if (lineIndex === startIndex || charIndex > startPos) {
                    content += ch;
                }
                continue;
            }
            if (inSingle || inDouble) {
                content += ch;
                const closeQuote = inSingle ? "'" : '"';
                if (ch === closeQuote) {
                    inSingle = false;
                    inDouble = false;
                }
                continue;
            }
            if (ch === "'") {
                inSingle = true;
                content += ch;
                continue;
            }
            if (ch === '"') {
                inDouble = true;
                content += ch;
                continue;
            }
            if (ch === '(') {
                depth += 1;
                content += ch;
                continue;
            }
            if (ch === ')') {
                if (depth === 0) {
                    return content;
                }
                depth -= 1;
                content += ch;
                continue;
            }
            content += ch;
        }
        if (lineIndex > startIndex) {
            content += '\n';
        }
    }
    return content;
}
/**
 * Làm trắng vùng `{{-- --}}` và `@verbatim`, GIỮ NGUYÊN độ dài và số dòng.
 *
 * Các khâu quét biến ở dưới chạy THEO DÒNG và khớp `^@states(` / `^@props(`,
 * nên ví dụ minh hoạ trong comment bị đăng ký thành biến thật — autocomplete
 * gợi ý biến không tồn tại, và chẩn đoán "biến chưa khai báo" im lặng bỏ sót.
 * Trang tài liệu dính nặng nhất vì nó tồn tại để in ra cú pháp Saola.
 *
 * Giữ số dòng là bắt buộc: `_extractDirectiveContent(lines, i)` dùng chỉ số
 * dòng, lệch một dòng là đọc nhầm khai báo.
 *
 * Cùng luật với compiler — Saola\Compiler\Support\BladeComment::blank()
 * (PHP), blankBladeComments() (compiler/src/index.js), blank_blade_comments()
 * (compiler/src/common/utils.py).
 */
function _blankBladeComments(text) {
    if (!text) {
        return text;
    }
    return text.replace(/\{\{--[\s\S]*?--\}\}|@verbatim\b[\s\S]*?@endverbatim\b/gi, m => m.replace(/[^\n]/g, ' '));
}
function _collectDeclaredVars(text) {
    const vars = new Set(_IMPLICIT_VARS);
    const { mode } = _detectSaoMode(text);
    const lines = _blankBladeComments(text).split('\n');
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        if (t.match(/^@states?\((.+)/)) {
            _addStates(_extractDirectiveContent(lines, i), vars);
            continue;
        }
        if (t.match(/^@let\((.+)/)) {
            _addAssignedVars(_extractDirectiveContent(lines, i), vars, mode);
            continue;
        }
        if (t.match(/^@const\((.+)/)) {
            _addAssignedVars(_extractDirectiveContent(lines, i), vars, mode);
            continue;
        }
        // @computed(name = expr) khai báo `name` y như @let — thiếu dòng này thì
        // biến computed bị báo nhầm "is not declared".
        if (t.match(/^@computed\((.+)/)) {
            _addAssignedVars(_extractDirectiveContent(lines, i), vars, mode);
            continue;
        }
        if (t.startsWith('@useState(')) {
            const content = _extractDirectiveContent(lines, i);
            _addUseStateVars(content, vars);
            continue;
        }
        if (t.match(/^@vars\((.+)/)) {
            _addDeclarationVars(_extractDirectiveContent(lines, i), vars, mode);
            continue;
        }
        if (t.match(/^@props\((.+)/)) {
            _addDeclarationVars(_extractDirectiveContent(lines, i), vars, mode);
            continue;
        }
        // Scoped loop vars
        let m;
        // Handle @foreach(list as $key => $val) or @foreach(list as key => val)
        if ((m = t.match(/^@fo(?:reach|relse)\(.+\bas\b\s+\$?(\w+)\s*(?:=>|,)\s*\$?(\w+)/))) {
            vars.add(m[1]);
            vars.add(m[2]);
            continue;
        }
        // Handle @foreach(list as $item) or @foreach(list as item)
        if ((m = t.match(/^@fo(?:reach|relse)\(.+\bas\b\s+\$?(\w+)/))) {
            vars.add(m[1]);
            continue;
        }
        // Handle @for($i = 0; ...) or @for(i = 0; ...)
        if ((m = t.match(/^@for\(\s*\$?(\w+)\s*=/))) {
            vars.add(m[1]);
            continue;
        }
    }
    return vars;
}
function _runAnalysis(document, collection) {
    if (!_isSaoDocument(document)) {
        return [];
    }
    const text = document.getText();
    const diagnostics = [];
    const { mode, firstWrapperLine } = _detectSaoMode(text);
    // Check for priority rule violations (multiple level-0 wrappers)
    // Thẻ bọc in ra làm ví dụ trong comment không được tính là wrapper thật,
    // nếu không sẽ báo "nhiều wrapper" oan. Làm trắng giữ số dòng nên vị trí
    // gắn chẩn đoán vẫn đúng.
    const lines = _blankBladeComments(text).split('\n');
    let wrapperCount = 0;
    let firstWrapperType = '';
    for (let i = 0; i < lines.length; i++) {
        const t = lines[i].trim();
        const mw = t.match(/^<(template|sao:blade|blade)\b/i);
        if (mw) {
            wrapperCount++;
            if (wrapperCount === 1)
                firstWrapperType = mw[1].toLowerCase();
            if (wrapperCount > 1) {
                diagnostics.push(new vscode.Diagnostic(new vscode.Range(i, 0, i, lines[i].length), `Multiple level-0 wrappers detected. Only the first wrapper (<${firstWrapperType}>) will be processed.`, vscode.DiagnosticSeverity.Warning));
            }
        }
    }
    // Variable undeclared checks only work reliably in legacy mode (PHP $variable syntax).
    // In modern mode, identifiers have no $ prefix so we cannot distinguish
    // variables from function names, HTML attributes, CSS properties, etc.
    if (mode === 'legacy') {
        const globalVars = _collectDeclaredVars(text);
        const scopeStack = [new Set(globalVars)];
        const isVarDeclared = (v) => scopeStack.some(s => s.has(v));
        const declareInCurrentScope = (v) => scopeStack[scopeStack.length - 1].add(v);
        const LOOP_CLOSE_RE = /^@end(foreach|forelse|for|while)\b/i;
        const LOOP_OPEN_RE = /^@(foreach|forelse|for|while)\b/i;
        const IF_ASSIGN_RE = /@(?:if|elseif)\([^\n]*?\(\s*\$(\w+)\s*=[^=]/i;
        const SCRIPT_OPEN_RE = /^<script\b/i;
        const SCRIPT_CLOSE_RE = /^<\/script>/i;
        const STYLE_OPEN_RE = /^<style\b/i;
        const STYLE_CLOSE_RE = /^<\/style>/i;
        let lineStart = 0;
        let inScriptOrStyle = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const t = line.trim();
            if (SCRIPT_OPEN_RE.test(t) || STYLE_OPEN_RE.test(t)) {
                inScriptOrStyle = true;
            }
            if (inScriptOrStyle) {
                if (SCRIPT_CLOSE_RE.test(t) || STYLE_CLOSE_RE.test(t))
                    inScriptOrStyle = false;
                lineStart += line.length + 1;
                continue;
            }
            if (LOOP_CLOSE_RE.test(t) && scopeStack.length > 1) {
                scopeStack.pop();
            }
            if (LOOP_OPEN_RE.test(t)) {
                const newScope = new Set();
                // Handle @foreach(list as $key => $val) or @foreach(list as key => val)
                const kvM = t.match(/\bas\b\s+\$?(\w+)\s*(?:=>|,)\s*\$?(\w+)/i);
                if (kvM) {
                    newScope.add(kvM[1]);
                    newScope.add(kvM[2]);
                }
                else {
                    // Handle @foreach(list as $item) or @foreach(list as item)
                    const asM = t.match(/\bas\b\s+\$?(\w+)/i);
                    if (asM) {
                        newScope.add(asM[1]);
                    }
                }
                // Handle @for($i = 0; ...) or @for(i = 0; ...)
                const forM = t.match(/^@for\(\s*\$?(\w+)\s*=/i);
                if (forM) {
                    newScope.add(forM[1]);
                }
                scopeStack.push(newScope);
            }
            // Global declarations in directives
            let declMatch;
            if ((declMatch = t.match(/^@let\((.+)/))) {
                _addAssignedVars(_extractDirectiveContent(lines, i), scopeStack[0], mode);
            }
            if ((declMatch = t.match(/^@const\((.+)/))) {
                _addAssignedVars(_extractDirectiveContent(lines, i), scopeStack[0], mode);
            }
            if ((declMatch = t.match(/^@computed\((.+)/))) {
                _addAssignedVars(_extractDirectiveContent(lines, i), scopeStack[0], mode);
            }
            if (t.startsWith('@useState(')) {
                _addUseStateVars(_extractDirectiveContent(lines, i), scopeStack[0]);
            }
            if ((declMatch = t.match(/^@vars\((.+)/))) {
                _addDeclarationVars(_extractDirectiveContent(lines, i), scopeStack[0], mode);
            }
            if ((declMatch = t.match(/^@props\((.+)/))) {
                _addDeclarationVars(_extractDirectiveContent(lines, i), scopeStack[0], mode);
            }
            // @exec assignments
            if (/^@exec\(/i.test(t)) {
                for (const am of t.matchAll(/\$(\w+)\s*=[^=]/g)) {
                    declareInCurrentScope(am[1]);
                }
            }
            const ifAsgM = IF_ASSIGN_RE.exec(t);
            if (ifAsgM) {
                declareInCurrentScope(ifAsgM[1]);
            }
            // Check every $var usage in this line
            const VAR_RE = /\$(\w+)/g;
            let m;
            while ((m = VAR_RE.exec(line)) !== null) {
                const varName = m[1];
                if (isVarDeclared(varName)) {
                    continue;
                }
                if (_IS_PHP_SUPERGLOBAL(varName)) {
                    continue;
                }
                const absOffset = lineStart + m.index;
                const diag = new vscode.Diagnostic(new vscode.Range(document.positionAt(absOffset), document.positionAt(absOffset + m[0].length)), `'$${varName}' is not declared. Use @let, @const, @computed, @useState, @vars, or @props.`, vscode.DiagnosticSeverity.Warning);
                diag.source = 'SAO Template';
                diagnostics.push(diag);
            }
            lineStart += line.length + 1;
        }
    }
    collection.set(document.uri, diagnostics);
    return diagnostics;
}
function activate(context) {
    console.log('Template Languages extension is now active!');
    // ── Ensure Emmet is configured for SAO language IDs ──────────────────────
    _ensureEmmetConfig();
    const saoFormatter = new saoFormatter_1.SaoFormatter();
    // Register document formatter (Format Document)
    context.subscriptions.push(vscode.languages.registerDocumentFormattingEditProvider('sao', saoFormatter), vscode.languages.registerDocumentFormattingEditProvider('saola', saoFormatter));
    // Register range formatter (Format Selection)
    context.subscriptions.push(vscode.languages.registerDocumentRangeFormattingEditProvider('sao', {
        provideDocumentRangeFormattingEdits(document, range, options, _token) {
            // For range formatting, delegate to full document formatter
            // since Blade/HTML context requires full document awareness
            return [];
        }
    }), vscode.languages.registerDocumentRangeFormattingEditProvider('saola', {
        provideDocumentRangeFormattingEdits(document, range, options, _token) {
            return [];
        }
    }));
    // Register onType formatting for Enter key (proper indentation on new line)
    context.subscriptions.push(vscode.languages.registerOnTypeFormattingEditProvider('sao', {
        provideOnTypeFormattingEdits(document, position, ch, options, _token) {
            return _handleOnTypeFormatting(document, position, ch, options);
        }
    }, '\n'), vscode.languages.registerOnTypeFormattingEditProvider('saola', {
        provideOnTypeFormattingEdits(document, position, ch, options, _token) {
            return _handleOnTypeFormatting(document, position, ch, options);
        }
    }, '\n'));
    // Register autocomplete for directives (Blade + SAO)
    // Register autocomplete for directives (Blade + SAO)
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('sao', new OneDirectiveCompletionProvider(), '@'), vscode.languages.registerCompletionItemProvider('saola', new OneDirectiveCompletionProvider(), '@'));
    // ── Attribute, Binding & Tag Completion Provider ──────────────────────────
    const attrTagProvider = new SaoAttributeAndTagCompletionProvider();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('sao', attrTagProvider, ':', '<', '@', '"', "'", '{', ' '), vscode.languages.registerCompletionItemProvider('saola', attrTagProvider, ':', '<', '@', '"', "'", '{', ' '));
    // ── Emmet HTML Completion Provider ──────────────────────────────────────
    // Provides context-aware HTML Emmet abbreviation expansion
    // e.g. div#test.demo → <div id="test" class="demo"></div>
    const emmetProvider = new SaoEmmetCompletionProvider();
    context.subscriptions.push(vscode.languages.registerCompletionItemProvider('sao', emmetProvider, '>', '+', '^', '*', '#', '.', '[', '{', '!', '$'), vscode.languages.registerCompletionItemProvider('saola', emmetProvider, '>', '+', '^', '*', '#', '.', '[', '{', '!', '$'));
    // ── Go to Definition (view paths + component tags) ──────────────────────
    const definitionProvider = new navigation_1.SaoDefinitionProvider();
    context.subscriptions.push(vscode.languages.registerDefinitionProvider('sao', definitionProvider), vscode.languages.registerDefinitionProvider('saola', definitionProvider));
    // ── Hover documentation for directives & binding attributes ───────────────
    const hoverProvider = {
        provideHover(document, position) {
            // 1. Directive hover
            const dirRange = document.getWordRangeAtPosition(position, /@[a-zA-Z0-9_.-]+/);
            if (dirRange) {
                const word = document.getText(dirRange).toLowerCase();
                const directive = BLADE_DIRECTIVES.find(d => d.label.toLowerCase() === word);
                if (directive) {
                    const md = new vscode.MarkdownString(`**${directive.label}** — ${directive.detail}`);
                    const snippet = directive.insertText;
                    if (snippet) {
                        md.appendCodeblock(snippet.replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$0/g, ''), 'sao');
                    }
                    return new vscode.Hover(md, dirRange);
                }
            }
            // 2. Bound attribute hover (:attr)
            const bindRange = document.getWordRangeAtPosition(position, /:[a-zA-Z0-9_:-]+/);
            if (bindRange) {
                const word = document.getText(bindRange);
                const common = COMMON_BINDING_ATTRS.find(a => a.label === word);
                const md = new vscode.MarkdownString();
                if (common) {
                    md.appendMarkdown(`**Saola Binding Attribute \`${common.label}\`**\n\n${common.detail}`);
                    md.appendCodeblock(common.insertText.replace(/\$\{\d+:([^}]*)\}/g, '$1').replace(/\$0/g, ''), 'sao');
                }
                else {
                    const propName = word.substring(1);
                    md.appendMarkdown(`**Saola Bound Property \`${word}\`**\n\nBinds \`${propName}\` to a reactive JavaScript expression.`);
                }
                return new vscode.Hover(md, bindRange);
            }
            return undefined;
        }
    };
    context.subscriptions.push(vscode.languages.registerHoverProvider('sao', hoverProvider), vscode.languages.registerHoverProvider('saola', hoverProvider));
    // ── Variable Diagnostics ──────────────────────────────────────────────────
    const varDiagnostics = vscode.languages.createDiagnosticCollection('sao-variables');
    context.subscriptions.push(varDiagnostics);
    const analyzeDoc = (doc) => _runAnalysis(doc, varDiagnostics);
    // Analyze all already-open documents immediately
    vscode.workspace.textDocuments.forEach(analyzeDoc);
    context.subscriptions.push(vscode.workspace.onDidOpenTextDocument(analyzeDoc), vscode.workspace.onDidChangeTextDocument(e => analyzeDoc(e.document)), vscode.window.onDidChangeActiveTextEditor(ed => { if (ed) {
        analyzeDoc(ed.document);
    } }), vscode.workspace.onDidCloseTextDocument(doc => varDiagnostics.delete(doc.uri)));
    // Debug command: run analysis on active file and report result
    context.subscriptions.push(vscode.commands.registerCommand('sao.checkVariables', () => {
        const doc = vscode.window.activeTextEditor?.document;
        if (!doc) {
            vscode.window.showErrorMessage('No active editor.');
            return;
        }
        const text = doc.getText();
        const bladeOpen = /<blade\b[^>]*>/i.exec(text);
        const preBladeText = bladeOpen ? text.substring(0, bladeOpen.index) : '';
        const diags = _runAnalysis(doc, varDiagnostics);
        const declared = _collectDeclaredVars(preBladeText);
        vscode.window.showInformationMessage(`SAO Check — languageId: "${doc.languageId}" | declared: [${[...declared].filter(v => !_IMPLICIT_VARS.has(v)).join(', ')}] | warnings: ${diags.length}`);
    }));
}
function deactivate() { }
/**
 * Ensures all Emmet settings are correctly configured for Saola files.
 *
 * Three settings are critical for Emmet to work in mapped (custom) languages:
 * 1. emmet.includeLanguages — maps sao/saola to html
 * 2. emmet.showExpandedAbbreviation — MUST be 'always' for mapped languages
 *    (VS Code's built-in Emmet skips mapped languages unless this is 'always')
 * 3. emmet.triggerExpansionOnTab — enables Tab key to expand abbreviations
 */
function _ensureEmmetConfig() {
    try {
        const config = vscode.workspace.getConfiguration('emmet');
        // 1. Ensure includeLanguages has sao/saola → html mapping
        const includeLanguages = config.get('includeLanguages') || {};
        if (!includeLanguages['sao'] || !includeLanguages['saola']) {
            const updated = { ...includeLanguages };
            if (!updated['sao']) {
                updated['sao'] = 'html';
            }
            if (!updated['saola']) {
                updated['saola'] = 'html';
            }
            config.update('includeLanguages', updated, vscode.ConfigurationTarget.Global);
        }
        // 2. Ensure showExpandedAbbreviation is 'always'
        // The default value 'inMarkupAndStylesheetFilesOnly' causes VS Code's built-in Emmet
        // to skip languages that are only mapped via includeLanguages (not native Emmet modes).
        // See: vscode/extensions/emmet/src/defaultCompletionProvider.ts line ~60
        const showExpanded = config.get('showExpandedAbbreviation');
        if (showExpanded !== 'always') {
            config.update('showExpandedAbbreviation', 'always', vscode.ConfigurationTarget.Global);
        }
        // 3. Ensure triggerExpansionOnTab is enabled
        // Without this, pressing Tab only inserts a tab character instead of expanding Emmet abbreviations.
        const triggerOnTab = config.get('triggerExpansionOnTab');
        if (triggerOnTab !== true) {
            config.update('triggerExpansionOnTab', true, vscode.ConfigurationTarget.Global);
        }
    }
    catch (err) {
        console.warn('Saola: Failed to update Emmet configuration:', err);
    }
}
function _handleOnTypeFormatting(document, position, ch, options) {
    if (ch !== '\n') {
        return [];
    }
    const tabSize = options.tabSize || 4;
    const insertSpaces = options.insertSpaces !== false;
    const indent = insertSpaces ? ' '.repeat(tabSize) : '\t';
    // Get the previous line (the line before where Enter was pressed)
    const prevLineNum = position.line - 1;
    if (prevLineNum < 0) {
        return [];
    }
    const prevLine = document.lineAt(prevLineNum).text;
    const prevTrimmed = prevLine.trim();
    const currentLine = document.lineAt(position.line).text;
    const currentTrimmed = currentLine.trim();
    // Calculate previous line's indent level
    let prevIndent = 0;
    for (const char of prevLine) {
        if (char === ' ') {
            prevIndent++;
        }
        else if (char === '\t') {
            prevIndent += tabSize;
        }
        else {
            break;
        }
    }
    const prevIndentLevel = Math.floor(prevIndent / tabSize);
    // Blade opening directives
    const openDirectives = /^@(if|unless|foreach|forelse|for|while|switch|auth|guest|can|cannot|canany|section|component|slot|push|prepend|once|php|isset|empty|env|production|verbatim|error|await|block|comment|states)\b/;
    // HTML opening tag (not void, not self-closing, support custom tags)
    const htmlOpenTag = /^<(?!area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)([a-zA-Z0-9:-]+)\b[^/>]*>\s*$/;
    // Opening brace/bracket
    const openBrace = /[{\[]\s*$/;
    let targetIndentLevel = prevIndentLevel;
    if (openDirectives.test(prevTrimmed)) {
        targetIndentLevel = prevIndentLevel + 1;
    }
    else if (htmlOpenTag.test(prevTrimmed)) {
        targetIndentLevel = prevIndentLevel + 1;
    }
    else if (openBrace.test(prevTrimmed)) {
        targetIndentLevel = prevIndentLevel + 1;
    }
    // If next line is a closing tag, don't increase indent
    const closingDirective = /^@(endif|endunless|endforeach|endforelse|endfor|endwhile|endswitch|endauth|endguest|endcan|endcannot|endcanany|endsection|endcomponent|endslot|endpush|endprepend|endonce|endphp|endisset|endempty|endenv|endproduction|endverbatim|enderror|endblock|endcomment)\b/;
    if (closingDirective.test(currentTrimmed) || /^<\/ /.test(currentTrimmed)) {
        // Don't change - let the language config handle it
        return [];
    }
    const targetIndentStr = indent.repeat(targetIndentLevel);
    const currentLineRange = new vscode.Range(new vscode.Position(position.line, 0), new vscode.Position(position.line, currentLine.length - currentTrimmed.length));
    return [new vscode.TextEdit(currentLineRange, targetIndentStr)];
}
//# sourceMappingURL=extension.js.map