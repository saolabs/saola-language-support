# Saola for VS Code v1.1.0

Standardizes Saola branding, adds light/dark template file icons, and completes document and selection formatting. The extension ID remains `saolabs.saola-language-support`.

The formatter understands template nesting and multiline attributes/directives. Bundled Prettier formats complete embedded JS/TS/CSS/SCSS/Less bodies. Sensitive text, raw blocks, partial embedded selections, and unparseable code are preserved.

Validation: all nine behavior test scripts pass, including activation and formatting from the packaged bundle. All 88 real templates checked are idempotent. Build and VSIX packaging pass. Changed TypeScript files pass ESLint; full-repository lint still reports the existing `no-unused-expressions` violation in `src/setupCheck.ts:277`. No Marketplace upload is performed by these commands.
