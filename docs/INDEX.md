# Template Languages VS Code Extension - Complete Index

## 🎯 Quick Navigation

### 📖 **Start Here**
- [SETUP_COMPLETE.md](SETUP_COMPLETE.md) - Project completion summary
- [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) - Detailed project overview
- [README.md](README.md) - User guide and documentation

### 🚀 **Getting Started**
1. Run: `bash get-started.sh` (automated setup)
2. OR manually: `npm install && npm run compile`
3. Press F5 in VS Code to launch debug environment

### 📚 **Documentation Files**

| File | Purpose |
|------|---------|
| [README.md](README.md) | Main user documentation |
| [QUICKSTART.md](QUICKSTART.md) | Development and testing guide |
| [CHANGELOG.md](CHANGELOG.md) | Version history and features |
| [PROJECT_SUMMARY.md](PROJECT_SUMMARY.md) | Complete project breakdown |
| [SETUP_COMPLETE.md](SETUP_COMPLETE.md) | Setup completion checklist |
| [LICENSE](LICENSE) | MIT License |

---

## 📂 **Project Structure**

### Source Code (`src/`)
```
src/
├── extension.ts                 # Main extension entry point
└── formatters/                  # Code formatters
    ├── oneFormatter.ts
    ├── hclFormatter.ts
    └── arcFormatter.ts
```

### Syntax Definitions (`syntaxes/`)
```
syntaxes/
├── one.tmLanguage.json          # ONE language syntax
├── hcl.tmLanguage.json          # HCL language syntax
└── arc.tmLanguage.json          # ARC language syntax
```

### Code Snippets (`snippets/`)
```
snippets/
├── one.json                     # 10 ONE snippets
├── hcl.json                     # 10 HCL snippets
└── arc.json                     # 12 ARC snippets
```

### Language Config (`language-configurations/`)
```
language-configurations/
├── one.language-configuration.json
├── hcl.language-configuration.json
└── arc.language-configuration.json
```

### Examples (`examples/`)
```
examples/
├── example.one                  # ONE template example
├── example.hcl                  # HCL configuration example
└── example.arc                  # ARC language example
```

### Configuration Files (Root)
```
├── package.json                 # Extension manifest
├── tsconfig.json                # TypeScript config
├── .eslintrc.json               # ESLint configuration
├── .prettierrc                  # Prettier formatting config
├── .vscodeignore                # Files to exclude from package
└── .gitignore                   # Git ignore rules
```

---

## 🎨 **Supported Languages**

### 1. ONE Template (.one)
- **Type:** JavaScript-like template language
- **File:** [syntaxes/one.tmLanguage.json](syntaxes/one.tmLanguage.json)
- **Snippets:** [snippets/one.json](snippets/one.json) (10 snippets)
- **Example:** [examples/example.one](examples/example.one)
- **Config:** [language-configurations/one.language-configuration.json](language-configurations/one.language-configuration.json)

### 2. HCL Template (.hcl)
- **Type:** HashiCorp Configuration Language
- **File:** [syntaxes/hcl.tmLanguage.json](syntaxes/hcl.tmLanguage.json)
- **Snippets:** [snippets/hcl.json](snippets/hcl.json) (10 snippets)
- **Example:** [examples/example.hcl](examples/example.hcl)
- **Config:** [language-configurations/hcl.language-configuration.json](language-configurations/hcl.language-configuration.json)

### 3. ARC Template (.arc)
- **Type:** Arc programming language
- **File:** [syntaxes/arc.tmLanguage.json](syntaxes/arc.tmLanguage.json)
- **Snippets:** [snippets/arc.json](snippets/arc.json) (12 snippets)
- **Example:** [examples/example.arc](examples/example.arc)
- **Config:** [language-configurations/arc.language-configuration.json](language-configurations/arc.language-configuration.json)

---

## 🔧 **Available Commands**

### Development
```bash
npm install              # Install dependencies
npm run compile          # Compile TypeScript to JavaScript
npm run watch            # Auto-compile on file changes
npm run lint             # Check code with ESLint
npm run format           # Format code with Prettier
npm run vscode:prepublish # Prepare for marketplace
```

### One-Time Setup
```bash
bash get-started.sh      # Automated setup script
```

---

## 📝 **Snippet References**

### ONE Snippets (Type these prefixes)
| Prefix | Description |
|--------|-------------|
| `one:if` | if statement |
| `one:if-else` | if-else statement |
| `one:for` | for loop |
| `one:while` | while loop |
| `one:function` | function declaration |
| `one:class` | class declaration |
| `one:var` | variable declaration |
| `one:const` | const declaration |
| `one:comment` | single line comment |
| `one:block-comment` | block comment |

### HCL Snippets (Type these prefixes)
| Prefix | Description |
|--------|-------------|
| `hcl:resource` | resource block |
| `hcl:data` | data source block |
| `hcl:variable` | variable declaration |
| `hcl:output` | output block |
| `hcl:module` | module block |
| `hcl:provider` | provider block |
| `hcl:locals` | locals block |
| `hcl:for-each` | for_each meta-argument |
| `hcl:count` | count meta-argument |
| `hcl:if` | conditional expression |

### ARC Snippets (Type these prefixes)
| Prefix | Description |
|--------|-------------|
| `arc:if` | if-then statement |
| `arc:if-else` | if-then-else statement |
| `arc:loop` | loop statement |
| `arc:while` | while loop |
| `arc:def` | function definition |
| `arc:class` | class definition |
| `arc:trait` | trait definition |
| `arc:match` | match expression |
| `arc:type` | type declaration |
| `arc:directive` | directive |
| `arc:comment` | single line comment |
| `arc:block-comment` | block comment |

---

## 🧪 **Testing the Extension**

### 1. Launch Debug Mode
```bash
# Method 1: Press F5
# Method 2: Menu → Debug → Start Debugging
```

### 2. Open Example Files
- [examples/example.one](examples/example.one)
- [examples/example.hcl](examples/example.hcl)
- [examples/example.arc](examples/example.arc)

### 3. Test Features
- **Syntax Highlighting:** Check color coding appears
- **Snippets:** Type prefix and press Tab
- **Formatting:** Press Shift+Alt+F (Windows/Linux) or Shift+Option+F (macOS)

---

## 📦 **Package Contents**

| Component | Location | Files |
|-----------|----------|-------|
| **Source Code** | `src/` | 4 files (1 TS + 3 formatters) |
| **Syntax Definitions** | `syntaxes/` | 3 JSON files |
| **Snippets** | `snippets/` | 3 JSON files |
| **Language Config** | `language-configurations/` | 3 JSON files |
| **Examples** | `examples/` | 3 example files |
| **Documentation** | Root | 6 markdown files |
| **Configuration** | Root | 6 config files |
| **Total** | — | 28 files |

---

## 🔗 **Key Files by Purpose**

### Core Extension Files
- **Entry Point:** [src/extension.ts](src/extension.ts)
- **ONE Formatter:** [src/formatters/oneFormatter.ts](src/formatters/oneFormatter.ts)
- **HCL Formatter:** [src/formatters/hclFormatter.ts](src/formatters/hclFormatter.ts)
- **ARC Formatter:** [src/formatters/arcFormatter.ts](src/formatters/arcFormatter.ts)

### Syntax & Highlighting
- **ONE Syntax:** [syntaxes/one.tmLanguage.json](syntaxes/one.tmLanguage.json)
- **HCL Syntax:** [syntaxes/hcl.tmLanguage.json](syntaxes/hcl.tmLanguage.json)
- **ARC Syntax:** [syntaxes/arc.tmLanguage.json](syntaxes/arc.tmLanguage.json)

### Code Snippets
- **ONE Snippets:** [snippets/one.json](snippets/one.json)
- **HCL Snippets:** [snippets/hcl.json](snippets/hcl.json)
- **ARC Snippets:** [snippets/arc.json](snippets/arc.json)

### Configuration
- **Extension Manifest:** [package.json](package.json)
- **TypeScript Config:** [tsconfig.json](tsconfig.json)
- **ESLint Config:** [.eslintrc.json](.eslintrc.json)
- **Prettier Config:** [.prettierrc](.prettierrc)

---

## 🎓 **Learning Resources**

- [VS Code Extension API](https://code.visualstudio.com/api)
- [TextMate Grammar Documentation](https://macromates.com/manual/en/language_grammars)
- [VS Code Snippets Format](https://code.visualstudio.com/docs/editor/userdefinedsnippets)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

## ✅ **Checklist for Getting Started**

- [ ] Read [SETUP_COMPLETE.md](SETUP_COMPLETE.md)
- [ ] Run `npm install` or `bash get-started.sh`
- [ ] Run `npm run compile`
- [ ] Press F5 to launch debug VS Code
- [ ] Open example files from `examples/` folder
- [ ] Test syntax highlighting
- [ ] Try snippets with tab completion
- [ ] Test code formatting (Shift+Alt+F)
- [ ] Read [README.md](README.md) for user guide
- [ ] Customize snippets or syntax as needed

---

## 🚀 **Next Steps**

1. **Immediate:** Run setup script and test the extension
2. **Short-term:** Customize snippets and syntax for your needs
3. **Medium-term:** Add more features (linting, language server)
4. **Long-term:** Publish to VS Code Marketplace

---

## 📞 **Support & Help**

| Question | Resource |
|----------|----------|
| How do I use the extension? | [README.md](README.md) |
| How do I test it? | [QUICKSTART.md](QUICKSTART.md) |
| What files are included? | This file (INDEX.md) |
| How do I customize it? | [QUICKSTART.md](QUICKSTART.md#extending-the-extension) |
| Version history? | [CHANGELOG.md](CHANGELOG.md) |

---

## 📄 **License**

MIT License - See [LICENSE](LICENSE) for details

---

## 🎉 **Ready to Start?**

```bash
# Option 1: Automated Setup
bash get-started.sh

# Option 2: Manual Setup
npm install
npm run compile
# Then press F5 in VS Code
```

**Happy coding! 🚀**

---

**Last Updated:** January 30, 2026  
**Extension Version:** 1.0.0  
**Status:** ✅ Ready for Use
