# Quick Start Guide

## Installation & Setup

### 1. Install Dependencies
```bash
cd /Users/doanln/Desktop/2026/Projects/vscode-extension
npm install
```

### 2. Compile TypeScript
```bash
npm run compile
```

### 3. Run Extension in Debug Mode
- Press `F5` to open the extension in VS Code
- Or use menu: Debug → Start Debugging
- A new VS Code window will open with your extension active

## Testing the Extension

### Test File Creation
Create test files to verify the extension works:

1. **Test ONE file** (`.one`):
```one
// Test ONE template
function hello(name) {
  if (name) {
    console.log("Hello " + name);
  }
}

class User {
  constructor(username) {
    this.username = username;
  }
}
```

2. **Test HCL file** (`.hcl`):
```hcl
terraform {
  required_version = ">= 1.0"
}

variable "aws_region" {
  type = string
  description = "AWS region"
}

resource "aws_instance" "example" {
  ami = "ami-12345678"
  instance_type = "t2.micro"
}
```

3. **Test ARC file** (`.arc`):
```arc
def greet(name)
  if name then
    println("Hello " + name)
  else
    println("Hello World")
  end
end

class Person
  def initialize(name)
    @name = name
  end
end
```

### Testing Features

#### 1. Syntax Highlighting
- Open test files with .one, .hcl, or .arc extensions
- Verify that keywords, strings, and comments are highlighted with different colors

#### 2. Snippets
Type the snippet prefixes to test:
- **ONE**: Type `one:if`, `one:for`, `one:function`
- **HCL**: Type `hcl:resource`, `hcl:variable`, `hcl:module`
- **ARC**: Type `arc:if`, `arc:loop`, `arc:def`

Press Tab or Enter to expand the snippet.

#### 3. Formatting
- Open a test file
- Press `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (macOS)
- Verify proper indentation is applied

#### 4. Language Mode
- Open a test file
- Press `Ctrl+K M` (or `Cmd+K M` on macOS)
- Verify that ONE, HCL, or ARC appears in the language selection

## Development Commands

```bash
# Compile TypeScript
npm run compile

# Watch for changes and auto-compile
npm run watch

# Lint TypeScript files
npm run lint

# Format code with Prettier
npm run format

# Prepare for publishing
npm run vscode:prepublish
```

## Building for Distribution

### Create VSIX Package
```bash
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file that can be:
- Installed locally: `code --install-extension template-languages-1.0.0.vsix`
- Published to VS Code Marketplace
- Distributed to other users

## Project Structure

```
vscode-extension/
├── src/                              # TypeScript source
│   ├── extension.ts                  # Main extension entry point
│   └── formatters/                   # Formatter implementations
│       ├── oneFormatter.ts
│       ├── hclFormatter.ts
│       └── arcFormatter.ts
├── syntaxes/                         # TextMate grammar definitions
│   ├── one.tmLanguage.json
│   ├── hcl.tmLanguage.json
│   └── arc.tmLanguage.json
├── snippets/                         # Code snippets
│   ├── one.json
│   ├── hcl.json
│   └── arc.json
├── language-configurations/          # Language config
│   ├── one.language-configuration.json
│   ├── hcl.language-configuration.json
│   └── arc.language-configuration.json
├── out/                              # Compiled output (created by npm run compile)
├── package.json                      # Extension manifest
├── tsconfig.json                     # TypeScript config
├── README.md                         # User documentation
└── CHANGELOG.md                      # Version history
```

## Troubleshooting

### Extension Not Activating
1. Check if files have correct extensions (.one, .hcl, .arc)
2. Open VS Code developer tools: Help → Toggle Developer Tools
3. Check console for errors

### Syntax Highlighting Not Working
- Ensure files have the correct extension
- Reload VS Code window (Ctrl+R or Cmd+R)
- Check syntaxes/[language].tmLanguage.json file structure

### Snippets Not Appearing
- Type the snippet prefix (e.g., `one:if`)
- If still not showing, check IntelliSense settings in VS Code
- Ensure snippets/[language].json files are properly formatted

### Formatting Not Working
- Check that document formatting provider is registered
- Verify the formatter files are compiled in out/formatters/

## Publishing to VS Code Marketplace

1. Create a publisher account at https://marketplace.visualstudio.com
2. Create personal access token (PAT)
3. Login with vsce:
   ```bash
   vsce login <publisher-name>
   ```
4. Update package.json with correct publisher name
5. Publish:
   ```bash
   vsce publish
   ```

## Additional Resources

- [VS Code Extension API Documentation](https://code.visualstudio.com/api)
- [TextMate Grammar Reference](https://macromates.com/manual/en/language_grammars)
- [VS Code Snippets Format](https://code.visualstudio.com/docs/editor/userdefinedsnippets)

## Support

For issues or questions:
1. Check the README.md
2. Review existing GitHub issues
3. Create a new issue with detailed information

---

Happy coding! 🚀
