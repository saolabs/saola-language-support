# Saola Language Support

VS Code extension providing full syntax highlighting, snippets, and intelligent support for `.sao` (Saola Framework) template files.

## Features

### 🚀 Dual-Syntax Highlighting
Saola Language Support intelligently handles both **Modern** and **Legacy** syntax modes:
- **Modern Mode (JS-like)**: Clean, JavaScript-inspired syntax without the `$` prefix for variables. 
  - Perfect for use within `<template>` tags.
  - Full JavaScript highlighting for expressions using `source.js` integration.
- **Legacy Mode (Blade-like)**: Strict PHP-style syntax with the `$` prefix.
  - Automatically activated when using the `<blade>` wrapper.
  - Familiar environment for Laravel developers.

### 💡 Intelligent Autocomplete
Typing `@` gives you instant access to **100+ Saola & Blade directives**:
- **Core Directives**: `@state`, `@states`, `@props`, `@import`, `@await`, etc.
- **Full Event Handler Suite**: All standard HTML events (`@click`, `@keyup`, `@mouseenter`, etc.) with modern snippet support.
- **Logic & Control Flow**: `@if`, `@foreach`, `@forelse`, `@switch`, and many more.

### ⚡ Professional Snippets
Comprehensive snippets for all Saola constructs. Type `b:` to see them:
- `b:state` - Modern assignment-style reactive state.
- `b:props` - Modern component property declaration.
- `b:foreach` - Modern loop without `$` prefix.
- `b:import` - Modern component import with alias support.

### 🧹 Smart Diagnostics
The extension helps you write cleaner code by providing real-time feedback:
- **Wrapper Priority**: Warns if multiple root wrappers (`<template>` vs `<blade>`) are usage, as the compiler only treats the first one as root.
- **Mode-Aware Validation**: Automatically adjusts variable checking rules based on whether you are in Modern or Legacy mode to avoid false-positive "undeclared variable" warnings.

---

## Language Reference

### Modern Syntax (.sao)
The modern Saola syntax is designed to feel like modern frontend frameworks (Vue/Svelte) while maintaining the power of Blade.

```saola
@props({
    title: 'Hello World',
    active: true
})

@state(count = 0)

<template>
    <div class="counter">
        <h1>{{ title }}</h1>
        <button @click(setCount(count + 1))>
            Clicked {{ count }} times
        </button>
        
        @if(active)
            <span class="badge">Active</span>
        @endif
    </div>
</template>

<script setup>
export default {
    mounted() {
        console.log('Compoment mounted!');
    }
}
</script>
```

### Legacy Syntax
For projects migrating from traditional Blade templates, simply use the `<blade>` wrapper:

```saola
<blade>
    @foreach($items as $item)
        <li>{{ $item->name }}</li>
    @endforeach
</blade>
```

---

## Installation & Usage

### File Association
The extension automatically detects files with the `.sao` extension.

### Using Snippets
Type `b:` to access Saola-specific snippets:
- `b:state` -> `@state(varName = value)`
- `b:import` -> `@import(__template__ + 'path' as Alias)`
- `b:foreach` -> `@foreach(items as item) ... @endforeach`

---

## Changelog

### Version 1.7.7
- **Major Syntax Coloring Overhaul**: Switched to `source.js` for all modern expressions. Variables (`userAvatar`), Functions (`useState`), and Operators (`=, +, []`) now follow standard JavaScript colors for maximum readability.
- **Improved Foreach Highlighting**: Added specific keyword support for `as` within modern `@foreach` loops.
- **Updated Snippets**: Added a full suite of event handlers and attribute binding snippets (`@keyup`, `@checked`, `@disabled`, etc.) in `snippets/sao.json`.

### Version 1.7.5
- Improved Saola variable highlighting by switching to standard `variable.other.readwrite` scopes.
- Added object key highlighting inside `@props` and `@states`.

### Version 1.7.2
- Improved Variable Diagnostics: Disabled "undeclared variable" warnings in modern mode to prevent false positives for JS identifiers.
- Added `@state`, `@exec`, and `@bind` to autocomplete.

---

## License
MIT License - See LICENSE file for details
