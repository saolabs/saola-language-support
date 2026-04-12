# Template Languages Support

VS Code extension providing syntax highlighting, snippets, and formatting support for `.one` template files.

## Features

### Syntax Highlighting
- **ONE Templates** (.one) - One Laravel Blade-based template language with modern component structure

### Snippets
Comprehensive snippets for ONE template constructs:
- **ONE**: 88+ snippets including Blade directives and OneJS custom directives (@if, @foreach, @props, @vars, @let, @const, @useState, @block, @await, @register, @script, @setup, etc.)

### Formatting
Automatic code formatting with smart indentation.
- **ONE**: Blade & OneJS block keywords (if/endif, foreach/endforeach, block/endblock, register/endregister, etc.)

### Autocomplete
Intelligent directive autocomplete:
- **100+ directives** - Type `@` to see all available directives and their descriptions

### Icon Theme (Separate Extension)
Custom icon theme for `.one` files with Blade-inspired design:
- **ONE Icon Theme** extension in `/one-icon-theme` folder
- Signature ONE red (#FF2D55) for easy visual identification
- Lightweight and performant
- Install from: `one-icon-theme-1.0.0.vsix`

## Language Support

### ONE Templates (.one) - Blade-Based Component Templates

The `.one` format is a Blade-based template language inspired by Laravel Blade and modern component frameworks.

**File Structure:**
```blade
@props($props = [])
@let([$state, $setState] = useState(initialValue))

<blade>
  <!-- Template content -->
</blade>

<script setup lang="typescript">
export default {
  init() { },
  mounted() { }
}
</script>

<style>
  /* Scoped styles */
</style>
```

**Key Features:**
- Component props with `@props`
- Reactive state with `@let`, `@const`, `@useState`
- Comprehensive Blade directives: `@if`, `@foreach`, `@forelse`, `@auth`, `@can`, etc.
- Template interpolation with `{{ }}`
- Event binding with `@click`, `@change`, `@submit`, etc.
- Property access syntax: `$variable->property`
- Modern TypeScript/JavaScript support

**Directives:**
- Control Flow: `@if`, `@unless`, `@foreach`, `@forelse`, `@switch`
- Authorization: `@auth`, `@guest`, `@can`, `@cannot`
- Variables: `@isset`, `@empty`
- Component: `@include`, `@slot`, `@component`
- State: `@props`, `@let`, `@const`, `@useState`

**For detailed syntax documentation, see the `docs/BLADE_SYNTAX.md` file.**

## Usage

### File Extension Association
The extension automatically detects and highlights files with the `.one` extension (Blade-based templates).

You can also manually switch language mode:
- Press `Ctrl+K M` (or `Cmd+K M` on macOS)
- Select "ONE" as the language

### Using Snippets

ONE provides 88+ snippets for common patterns. Type `b:` to see all available snippets:

**Data & Variables:**
- `b:vars` - Declare data variables/props
- `b:let` - Local reactive variables
- `b:const` - Non-reactive constants
- `b:useState` - Reactive state with setter

**Control Flow:**
- `b:if` / `b:if-else` - If/else structure
- `b:foreach` - Foreach loop
- `b:forelse` - Foreach with empty fallback
- `b:switch` - Switch statement

**Components & Views:**
- `b:props` - Component properties
- `b:section` / `b:yield` - Section definition
- `b:include` - Include partial view
- `b:component` - Component structure

**Blocks:**
- `b:block` - Define reusable content block
- `b:useBlock` - Use/yield defined block

**Events:**
- `b:click` / `b:click.prevent` / `b:click.stop` - Click handlers
- `b:change` - Change event
- `b:input` - Input event
- `b:submit` - Form submit

**Async:**
- `b:fetch` - Fetch data asynchronously
- `b:await` - Await async operation

**Lifecycle:**
- `b:register` / `b:script` / `b:setup` - Component lifecycle hooks

**And 50+ more...**

### Formatting

To format your document:
- Use `Shift+Alt+F` (Windows/Linux) or `Shift+Option+F` (macOS)
- Or right-click and select "Format Document"

The formatter automatically handles:
- Blade block indentation (if/endif, foreach/endforeach, etc.)
- Proper spacing and alignment
- Nested structure formatting

### File Icons

To enable custom icons for `.one` files:

1. Install the **ONE Icon Theme** extension from `/one-icon-theme/one-icon-theme-1.0.0.vsix`
2. Open VS Code Settings
3. Go to **File** → **Preferences** → **File Icon Theme** (or use **Cmd+K Cmd+T** on macOS)
4. Select **ONE Icons** from the dropdown
5. `.one` files will now display with the custom Blade-inspired icon

## Settings

You can configure editor behavior in VS Code settings:

```json
"[one]": {
    "editor.tabSize": 2,
    "editor.insertSpaces": true,
    "editor.autoClosingBrackets": "always"
}
```

## Documentation

- **Blade Syntax Guide** - See `docs/BLADE_SYNTAX.md` for complete ONE/Blade syntax reference with examples
- **Quick Start Guide** - See `docs/QUICKSTART.md` to get started in minutes
- **Changelog** - See `docs/CHANGELOG.md` for version history and updates

## Extension Structure

```
vscode-extension/
├── src/
│   ├── extension.ts           # Extension entry point with autocomplete
│   └── formatters/
│       └── oneFormatter.ts    # ONE formatter (Blade & OneJS block keywords)
├── syntaxes/
│   └── one.tmLanguage.json    # ONE syntax rules (directives, interpolation, events)
├── snippets/
│   └── one.json               # ONE snippets (88+ Blade & OneJS directives)
├── language-configurations/
│   └── one.language-configuration.json
├── examples/
│   └── example.one            # ONE component example
├── docs/                      # Documentation files
│   ├── BLADE_SYNTAX.md        # Comprehensive Blade/ONE syntax documentation
│   ├── CHANGELOG.md           # Version history
│   ├── QUICKSTART.md          # Quick start guide
│   └── ...
└── package.json
```

## Commands

The extension provides these commands:

- `template-languages.format` - Format the current document

## Development

### Setup
```bash
npm install
```

### Compile
```bash
npm run compile
```

### Watch for changes
```bash
npm run watch
```

### Lint
```bash
npm run lint
```

## Examples

### ONE Component (Blade Template)

```blade
@props($users = [])
@let([$selectedUser, $setSelectedUser] = useState(null))

<blade>
  <div class="user-list">
    @forelse($users as $user)
      <div class="user-card" @click="selectUser($user)">
        <h3>{{ $user->name }}</h3>
        <p>{{ $user->email }}</p>
      </div>
    @empty
      <p>No users found</p>
    @endforelse
  </div>
</blade>

<script setup lang="typescript">
export default {
  selectUser(user) {
    this.setSelectedUser(user);
  }
}
</script>

<style>
  .user-card {
    padding: 10px;
    cursor: pointer;
    border: 1px solid #ddd;
  }
</style>
```

## License

MIT License - See LICENSE file for details

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues.

## Changelog

### Version 1.4.5
- Updated documentation with icon theme installation instructions
- Improved README with separate icon theme extension information
- Added File Icons section with setup guide

### ONE Icon Theme v1.0.0
- Created separate icon theme extension for `.one` files
- Blade-inspired icon design with signature ONE red (#FF2D55)
- Lightweight SVG icon asset
- Proper VS Code icon theme contribution point
- No conflicts with other icon themes

### Version 1.4.4
- Removed icon configuration to avoid conflicts with icon themes
- Improved extension stability and compatibility
- File `.one` uses VS Code default icon

### Version 1.4.3
- Added custom file icon for `.one` files (removed in 1.4.4 due to conflicts)
- Added 25+ snippets for OneJS custom directives (@vars, @let, @const, @useState, @block, @useBlock, @fetch, @await, @register, @script, @setup, etc.)
- Enhanced autocomplete with 100+ directives (Blade + OneJS)
- Added formatter support for OneJS block patterns (@block, @await, @register, @script, @setup)
- Added block directives and lifecycle hooks support

### Version 1.4.1
- Added @block, @useBlock, @mountBlock directives to autocomplete

### Version 1.4.0
- Added 40+ OneJS custom directives to autocomplete (@vars, @let, @const, @useState, @fetch, @await, @register, @script, @setup, etc.)
- Implemented full autocomplete system for all directives
- Support for event modifiers and attribute binding

### Version 1.3.0
- Added autocomplete for Blade directives (type `@` to see suggestions)
- Improved directive descriptions

### Version 1.2.0
- Laravel Blade-standard syntax highlighting
- Proper scopeName registration (text.html.php.blade)
- Comprehensive Blade syntax support

### Version 1.1.0
- 80+ professional snippets with b: prefix
- Improved syntax structure
- Better highlighting quality

### Version 1.0.0
- Initial release with ONE file support
- Syntax highlighting and basic snippets

## Credits

This extension was inspired by and builds upon:
- [Laravel Blade Snippets](https://github.com/onecentlin/laravel-blade-snippets-vscode) - Comprehensive Blade directives reference
- [Laravel Blade VSCode](https://github.com/amirmarmul/laravel-blade-vscode) - Blade syntax patterns
- [Laravel](https://laravel.com/) - Blade templating engine

