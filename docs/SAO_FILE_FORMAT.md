# Saola File Format (`.sao`) Specification

The `.sao` file format is the proprietary templating language of the Saola Framework. It is designed to combine the reactivity of modern frontend frameworks (like Vue.js or Svelte) with the robust server-side processing of Laravel Blade.

This document describes the architecture, syntax, rules, and usage of `.sao` files. It also provides comprehensive guidelines for building IDE extensions (Syntax Highlighting, Snippets, Autocomplete, etc.) to support the Saola Framework ecosystem.

---

## 1. File Architecture & Sections

A `.sao` file is divided into three logical components:
1. **Declarations block**: Configuration, state, props, constants, and variables.
2. **Template block**: The HTML/UI structure that supports loops, conditional rendering, and dynamic bindings.
3. **Script / Style blocks**: Optional Vue/Svelte-like `<script setup>` and `<style>` for client-side logic and scoped styling.

### Wrapper Priority Rules (Crucial for Compilers & IDEs)
Saola supports multiple syntax modes within the Template block, determined by the "Wrapper Tag" used.

If multiple wrappers are placed in the same file, the **FIRST wrapper encountered** is exclusively processed. All subsequent wrappers (and their contents) are dropped and ignored.

#### A. Modern Syntax wrappers (JS-like syntax)
- `<template> ... </template>`
- `<sao:blade> ... </sao:blade>`
- **No wrapper** (Directly writing HTML without any enclosing wrapper tag)

*When the modern syntax is used, the preprocessor is automatically engaged. You write plain JavaScript syntax across your variables and loops (e.g. `users as user`), and Saola transforms it into PHP/Blade during compilation.*

#### B. Legacy PHP Syntax wrapper (Pass-through mode)
- `<blade> ... </blade>`

*When `<blade>` is used, the preprocessor is bypassed. You MUST write strict PHP/Blade syntax inside this block (e.g. `$users as $user`).*

---

## 2. Declarations — State & Variable Directives

The declarations section must be placed at the **top of the file**, outside of the template wrappers. These directives define the component's data model.

### 2.1. `@state` — Reactive State (Assignment Syntax)

Declares one or more reactive state variables using `name = value` assignment syntax. Each variable automatically generates a **setter function** named `setVarName`.

**Syntax:**
```saola
@state(name = initialValue)

@state(
    name1 = value1,
    name2 = value2,
    name3 = value3
)
```

**Compile output:** Each entry becomes `@useState($name, phpValue)` in the Blade output.

**Examples:**
```saola
{{-- Single state --}}
@state(editMode = false)

{{-- Multiple states in one declaration --}}
@state(
    todos = [
        {id: 1, task: 'Buy groceries', completed: false},
        {id: 2, task: 'Walk the dog', completed: true}
    ],
    newTodo = '',
    nextTodoIndex = 3
)

{{-- Using in template --}}
<button @click(setEditMode(!editMode))>Toggle Edit</button>
<input @bind(newTodo) placeholder="New todo" />
```

**Auto-generated setters:**  
For `@state(count = 0)`, the compiler generates:
- `count` — The state variable (use in `{{ count }}`)
- `setCount` — Setter function (use in `@click(setCount(count + 1))`)

---

### 2.2. `@states` — Reactive State (Object Literal Syntax)

Declares reactive state variables using a JavaScript **object literal** `{key: value}` syntax. Functionally identical to `@state`, just a different syntactic style.

**Syntax:**
```saola
@states({
    key1: value1,
    key2: value2
})
```

**Compile output:** Same as `@state` — each key becomes `@useState($key, phpValue)`.

**Examples:**
```saola
@states({
    count: 0,
    user: { name: 'Alice', age: 25 },
    isVisible: true,
    items: []
})

{{-- Template usage — same as @state --}}
<p>{{ count }}</p>
<button @click(setCount(count + 1))>+1</button>
<button @click(setIsVisible(!isVisible))>Toggle</button>
```

> **`@state` vs `@states`:** Both are functionally equivalent. Use `@states({...})` when you prefer object literal style. Use `@state(name = value)` when you prefer assignment style. They can even be mixed in the same file.

---

### 2.3. `@props` — Component Properties

Defines properties passed from parent components or from the server-side controller.

**Syntax (3 forms):**
```saola
{{-- Simple list (names only) --}}
@props(title, content, theme)

{{-- With default values (assignment syntax) --}}
@props(title = 'Default Title', count = 0)

{{-- Object literal syntax --}}
@props({
    title: 'test',
    description: 'Mô tả',
    user: request().user()
})
```

**Compile output:** `@props($title, $content, $theme)` or `@props(['title' => 'test', ...])`.

**Examples:**
```saola
@props({
    title: 'Welcome',
    description: 'Page description',
    user: request().user()
})

<template>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    @if(user)
        <span>Hello, {{ user.name }}</span>
    @endif
</template>
```

---

### 2.4. `@let` — Mutable Local Variable

Declares a mutable variable scoped to the template. Can hold any expression, including function values.

**Syntax:**
```saola
@let(varName = expression)
```

**Compile output:** `@let($varName = phpExpression)`

**Examples:**
```saola
@let(test = 'demo')
@let(total = price * quantity)
@let(n = 0)
@let(handler = (e) => console.log(e))
```

---

### 2.5. `@const` — Immutable Constant / Destructured State

Declares a constant variable, or uses **destructuring assignment** to create state pairs via `useState()`.

**Syntax:**
```saola
{{-- Simple constant --}}
@const(API_URL = '/api/v1')
@const(MAX_COUNT = 10)

{{-- Destructured useState pattern --}}
@const([stateName, setStateName] = useState(initialValue))

{{-- Multiple destructured states --}}
@const(
    [count, setCount] = useState(0),
    [message, setMessage] = useState('Hello, Saola!')
)
```

**Compile output:**  
- Simple: `@const($API_URL = '/api/v1')`  
- Destructured: `@const([$count, $setCount] = useState(0))`

**Examples:**
```saola
@const(MAX_ITEMS = 100)
@const([users, setUsers] = useState([]))
@const([isLoading, setIsLoading] = useState(true))
@const([error, setError] = useState(null))

<template>
    @if(isLoading)
        <p>Loading...</p>
    @elseif(error)
        <p>Error: {{ error }}</p>
    @else
        @foreach(users as user)
            <p>{{ user.name }}</p>
        @endforeach
    @endif
</template>
```

---

### 2.6. `@vars` — Non-Reactive Variables (Legacy)

Declares non-reactive variables. In modern mode, the variable names are passed through with `$` prefix.

**Syntax:**
```saola
@vars(users, posts, currentUser)
@vars(demoList = [])
```

**Compile output:** `@vars($users, $posts, $currentUser)`

---

### 2.7. `@useState` — Legacy State Declaration

The legacy way to declare reactive state. **Not recommended** for modern `.sao` syntax — use `@state` or `@states` instead.

**Syntax:**
```saola
@useState($count, 0)
@useState($username, '')
```

> **Note:** `@useState` uses PHP-style `$` prefix syntax. It is passed through without transformation when detected as legacy syntax.

---

## 3. Template Directives

Directives inside the template block control rendering logic, DOM bindings, and event handling.

### 3.1. Outputting Variables

Variables are rendered using double curly braces (Mustache syntax).

| Syntax | Mode | Description |
|--------|------|-------------|
| `{{ user.name }}` | Modern | JS dot notation |
| `{{ $user['name'] }}` | Legacy | PHP array notation |
| `{!! rawHtml !!}` | Both | Unescaped HTML output |
| `{{-- comment --}}` | Both | Blade comment (removed in output) |

---

### 3.2. Control Flow Directives

#### Conditionals
```saola
@if(count > 0)
    <p>Has items</p>
@elseif(count == 0)
    <p>Loading...</p>
@else
    <p>Error</p>
@endif
```

#### Switch Statement
```saola
@switch(userRole)
    @case('admin')
        <p>Admin Panel</p>
        @break
    @case('moderator')
        <p>Moderator Panel</p>
        @break
    @default
        <p>User Panel</p>
@endswitch
```

#### `@show(condition)` / `@hide(condition)`
Toggle element visibility via CSS `display` property (similar to Vue's `v-show`).
```saola
<div @show(isVisible)>Shown when isVisible is true</div>
<div @hide(isHidden)>Hidden when isHidden is true</div>
```

#### `@empty` / `@isset`
```saola
@empty(posts)
    <p>No posts found.</p>
@endempty

@isset(user)
    <p>Welcome, {{ user.name }}</p>
@endisset
```

---

### 3.3. Loop Directives

#### `@foreach`
Iterates over arrays or objects.
```saola
{{-- Modern Syntax --}}
@foreach(items as item)
    <li>{{ item.name }}</li>
@endforeach

{{-- With key --}}
@foreach(items as key => item)
    <li>{{ key }}: {{ item.name }}</li>
@endforeach

{{-- Legacy Syntax --}}
@foreach($items as $key => $item)
    <li>{{ $item['name'] }}</li>
@endforeach
```

#### `@for`
Standard for loop.
```saola
@for(i = 0; i < count(inventory); i++)
    <li>{{ inventory[i].name }}</li>
@endfor
```

#### `@while`
While loop with condition.
```saola
@exec(n = 0)
@while(n < MAX_COUNT)
    <li>Item #{{ n + 1 }}</li>
    @exec(n++)
@endwhile
```

#### `@break` / `@continue`
Loop control statements.
```saola
@foreach(items as item)
    @if(item.hidden)
        @continue
    @endif
    @if(item.isLast)
        @break
    @endif
    <li>{{ item.name }}</li>
@endforeach
```

---

### 3.4. HTML Attribute Binding Directives

Saola provides shorthand directives to bind dynamic JS variables directly to HTML attributes.

#### `@class` — Dynamic CSS Classes
```saola
<div @class(['container', 'active': isActive, 'text-red': hasError])>
    Content
</div>

{{-- With img element --}}
<img @class(['site-logo', 'has-login': userState]) />
```

#### `@style` — Dynamic Inline Styles
```saola
<div @style({'color': textColor, 'font-size': size + 'px'})>
    Styled content
</div>
```

#### `@attr` — Dynamic Generic Attributes
```saola
<div @attr({dataCount: count(demoList), dataUserName: user.name})>
    Content
</div>
```

#### Form State Bindings

| Directive | Purpose | Example |
|-----------|---------|---------|
| `@bind(stateVar)` | Two-way data binding (like `v-model`) | `<input @bind(username) />` |
| `@val(value)` | Bind the `value` attribute | `<input @val(email) />` |
| `@checked(bool)` | Bind `checked` boolean | `<input type="checkbox" @checked(todo.completed) />` |
| `@selected(bool)` | Bind `selected` boolean | `<option @selected(isDefault)>` |

#### Boolean Attribute Bindings

| Directive | Purpose | Example |
|-----------|---------|---------|
| `@disabled(condition)` | Bind `disabled` attribute | `<button @disabled(isLoading)>Submit</button>` |
| `@required(condition)` | Bind `required` attribute | `<input @required(isRequired) />` |
| `@readonly(condition)` | Bind `readonly` attribute | `<input @readonly(isLocked) />` |

---

### 3.5. Event Handler Directives

Events are attached directly using `@eventName(handler)`. You can call JS methods defined in your `<script setup>` or execute inline state mutations.

**All supported event directives:**

| Directive | Aliases | Description |
|-----------|---------|-------------|
| `@click(handler)` | `@onClick` | Click events |
| `@input(handler)` | `@onInput` | Input events |
| `@change(handler)` | `@onChange` | Change events |
| `@submit(handler)` | `@onSubmit` | Form submit events |
| `@keyup(handler)` | `@onKeyup` | Key up events |
| `@keydown(handler)` | `@onKeydown` | Key down events |
| `@keypress(handler)` | `@onKeypress` | Key press events |
| `@focus(handler)` | `@onFocus` | Focus events |
| `@blur(handler)` | `@onBlur` | Blur events |
| `@mouseenter(handler)` | `@onMouseenter` | Mouse enter events |
| `@mouseleave(handler)` | `@onMouseleave` | Mouse leave events |
| `@mouseover(handler)` | — | Mouse over events |
| `@mouseout(handler)` | — | Mouse out events |
| `@dblclick(handler)` | — | Double click events |
| `@contextmenu(handler)` | — | Context menu (right-click) |
| `@wheel(handler)` | — | Mouse wheel events |
| `@scroll(handler)` | — | Scroll events |
| `@resize(handler)` | — | Resize events |
| `@load(handler)` | — | Load events |

**Examples:**
```saola
{{-- Inline state mutation --}}
<button @click(setCount(count + 1))>+1</button>

{{-- Call a method from <script setup> --}}
<button @click(increment())>Increment</button>

{{-- With event parameter --}}
<input @keydown(handleNewTodoKeyDown(event)) />

{{-- Prevent default via method --}}
<a href="#" @click(signout())>Sign Out</a>

{{-- Multiple events on same element --}}
<input 
    @bind(newTodo) 
    placeholder="Add todo"
    @keydown(addTodoByEnter(event))
    @focus(showHelp())
    @blur(validate())
/>
```

---

### 3.6. Template Architecture & Component Directives

#### `@import` — Import Components
Load other Saola components to use as custom HTML tags.
```saola
{{-- Named import (alias) --}}
@import(__template__ + 'header' as Header)
@import(__template__ + 'footer' as Footer)
@import(__template__ + 'components.button' as btn)

{{-- Default import (uses filename as tag name) --}}
@import(__template__ + 'post-list')

{{-- Usage in template --}}
<template>
    <Header></Header>
    <btn type="primary" :text="submitText" />
    <post-list :posts="posts" name="test" />
    <Footer>
        <p>Footer child content</p>
    </Footer>
</template>
```

#### `@extends` — Extend Layout Template
Declare a parent layout to extend.
```saola
@extends(__layout__ + 'base')
@extends(__template__ + 'main')
```

#### `@section` — Define Section Content
Define a section of content for the parent layout. Has two forms:
```saola
{{-- Inline value --}}
@section('meta:title', 'Page Title')
@section('meta:type', 'article')
@section('meta:og:image', 'https://example.com/image.jpg')

{{-- Block form (same as @block) --}}
@section('sidebar')
    <nav>Sidebar content</nav>
@endsection
```

#### `@block` / `@endblock` — Define Content Block
Define a named block of content (equivalent to `@section` block form).
```saola
@block('content')
    <main>
        <h1>Page Content</h1>
    </main>
@endblock

@block('footer')
    <div class="footer-container">
        Footer Content
    </div>
@endblock
```

#### `@yield` — Output Block Content
Render the content of a named section/block (used in layout files).
```saola
{{-- In layout file --}}
<html>
<head>
    <title>@yield('meta:title')</title>
</head>
<body>
    @yield('content')
    @yield('footer')
</body>
</html>
```

#### `@include` — Include Partial Template
Include another template directly, optionally passing data.
```saola
@include('partials.header')
@include('partials.sidebar', {menu: menuItems})
@include('examples/partial.sao', {data: products})
```

---

### 3.7. Utility Directives

#### `@exec` — Execute Expression Silently
Execute a JS/PHP expression without outputting anything to the DOM. Useful for updating variables inside loops.
```saola
@exec(n = 0)
@exec(total = count + 1)
@exec(n++)
@exec(a = 10, b = 20)
```

#### `@await` — Async Component Flag
Mark a component as asynchronous. Place at the top level (declaration area). This tells the runtime that the component has async `init()` logic.
```saola
@const([data, setData] = useState(null))
@await

<template>
    @if(data)
        <p>{{ data.title }}</p>
    @else
        <p>Loading...</p>
    @endif
</template>

<script setup>
    export default {
        async init() {
            const response = await this.App.Http.get('/api/data');
            setData(response.data);
        }
    }
</script>
```

#### `@verbatim` — Skip Blade Compilation
Prevent Blade from processing content (useful when you need literal `{{ }}` syntax, e.g., for Vue templates).
```saola
@verbatim
    <div id="vue-app">
        {{ vueVariable }}
    </div>
@endverbatim
```

#### `@php` — Inline PHP Code
Execute raw PHP code directly.
```saola
@php
    $total = $a + $b;
    $formatted = number_format($total, 2);
@endphp
```

---

## 4. Script and Style Sections

### `<script setup lang="ts">`
Similar to Vue 3, this defines the client-side logic mapped directly to the component's `ViewController`.

```html
<script setup lang="ts">
import { saola } from 'saola';
export default {
    name: 'Counter',

    {{-- Lifecycle hook (called once when component is ready) --}}
    init() {
        console.log('Component initialized');
    },

    {{-- Methods (callable from template via @click, etc.) --}}
    increment() {
        setCount(count + 1);
    },

    decrement() {
        setCount(count - 1);
    },

    {{-- Async init for @await components --}}
    async init() {
        const response = await this.App.Http.get('/api/users');
        setUsers(response.data);
    }
}
</script>
```

**Key notes:**
- State variables and their setters are accessible directly by name (e.g., `count`, `setCount`).
- `this.App` provides access to the Saola runtime services (e.g., `this.App.Http` for HTTP requests).
- The `lang="ts"` attribute is optional and enables TypeScript support.

### `<style scoped>`
Defines CSS styles for the component. The `scoped` attribute ensures styles don't leak out to other components.
```html
<style scoped>
.header { color: red; }
.counter-component {
    text-align: center;
    margin: 20px 0;
}
</style>
```

---

## 5. Directive Quick Reference Table

### Declarations (Top of File)

| Directive | Syntax | Purpose | Auto-generates setter? |
|-----------|--------|---------|----------------------|
| `@state` | `@state(name = value)` | Reactive state (assignment) | ✅ `setName()` |
| `@states` | `@states({key: value})` | Reactive state (object) | ✅ `setKey()` |
| `@props` | `@props(a, b)` or `@props({a: val})` | Component properties | ❌ |
| `@let` | `@let(name = expr)` | Mutable local variable | ❌ |
| `@const` | `@const(NAME = val)` | Immutable constant | ❌ |
| `@const` | `@const([x, setX] = useState(val))` | Destructured state | ✅ (manual) |
| `@vars` | `@vars(a, b, c)` | Non-reactive variables | ❌ |
| `@import` | `@import(path as Name)` | Import component | ❌ |
| `@await` | `@await` | Mark async component | ❌ |

### Template Directives

| Category | Directives |
|----------|------------|
| **Control Flow** | `@if`, `@elseif`, `@else`, `@endif`, `@switch`, `@case`, `@default`, `@break`, `@endswitch` |
| **Loops** | `@foreach`/`@endforeach`, `@for`/`@endfor`, `@while`/`@endwhile`, `@break`, `@continue` |
| **Visibility** | `@show(condition)`, `@hide(condition)`, `@empty`, `@isset` |
| **Attribute Binding** | `@class([...])`, `@style({...})`, `@attr({...})` |
| **Form Binding** | `@bind(var)`, `@val(var)`, `@checked(var)`, `@selected(var)` |
| **Boolean Attrs** | `@disabled(cond)`, `@required(cond)`, `@readonly(cond)` |
| **Event Handlers** | `@click`, `@input`, `@change`, `@submit`, `@keyup`, `@keydown`, `@keypress`, `@focus`, `@blur`, `@mouseenter`, `@mouseleave`, `@mouseover`, `@mouseout`, `@dblclick`, `@contextmenu`, `@wheel`, `@scroll`, `@resize`, `@load` |
| **Architecture** | `@extends`, `@section`/`@endsection`, `@block`/`@endblock`, `@yield`, `@include` |
| **Utility** | `@exec(expr)`, `@verbatim`/`@endverbatim`, `@php`/`@endphp` |

---

## 6. Complete Example

```saola
@props({
    title: 'My App',
    description: 'App description',
    user: request().user()
})
@let(test = 'demo')
@state(
    userState = user,
    counter = 0,
    posts = [
        {title: 'Post 1', description: 'Description 1'},
        {title: 'Post 2', description: 'Description 2'}
    ]
)
@const([userAvatar, setAvatar] = useState(getUserAvatar(user)))

<template>
    @extends(__template__ + 'main')
    @section('meta:type', 'article')
    @block('content')
        <main>
            <header>
                <nav>
                    <a href="{{route('web.home')}}" title="{{siteinfo('site_name')}}">
                        <img src="{{asset('static/web/images/logo.png')}}" 
                             alt="{{siteinfo('site_name')}}" 
                             @class(['site-logo', 'has-login': userState]) />
                    </a>
                    <ul @class(['site-menu'])>
                        @foreach(posts as post)
                            <li class="menu-item">
                                <a href="{{webPostUrl(post)}}" class="nav-link">
                                    {{post.title}}
                                </a>
                            </li>
                        @endforeach
                    </ul>
                    <div class="account">
                        @if(userState)
                            <img src="{{getUserAvatar(userState)}}" 
                                 class="user-avatar" 
                                 alt="{{userState.name}}" />
                            <button @click(signout())>Sign Out</button>
                        @else
                            <a href="{{route('web.account.signin')}}">Sign In</a>
                        @endif
                    </div>
                </nav>
            </header>
            <h1>{{title}}</h1>
            <p>{{description}}</p>
            <div class="card">
                <button @click(setCounter(counter + 1))>
                    Clicked {{ counter }} times
                </button>
            </div>
        </main>
    @endblock
</template>

<script setup>
    export default {
        signout() {
            console.log('User signed out');
        },
        changeAvatar(event) {
            event.preventDefault();
            const newAvatar = prompt('Enter new avatar URL:');
            if (newAvatar) {
                setAvatar(newAvatar);
            }
        }
    }
</script>

<style scoped>
    .site-logo {
        width: 120px;
        height: auto;
    }
    .user-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
    }
</style>
```

---

## 7. Guide for IDE Extension Developers

Building an extension for VS Code, WebStorm, or IntelliJ to support `.sao` files? Here is what you need to implement:

### 1. File Recognition & Icons
- **Extension**: `.sao`
- **Language ID**: `saola`
- **Icon Recommendation**: The Saola mascot or a hybrid HTML/PHP icon.

### 2. Syntax Highlighting
The `.sao` syntax is a hybrid. A robust Grammar (e.g., TextMate grammar for VSCode) should:
- Inject **HTML** grammar at the root level.
- Inject **JavaScript/TypeScript** grammar inside `<script>` tags.
- Inject **CSS/SCSS** grammar inside `<style>` tags.
- Tokenize `@` directives (`@states`, `@state`, `@props`, `@foreach`, `@if`, `@import`, `@click`, etc.) as Control Keywords / Macros.
- Inside `@states(...)`, tokenize the content strictly as a **JavaScript Object Literal**.
- Inside `@state(...)`, tokenize the content as **assignment expressions**.
- Inside `{{ ... }}` expressions, tokenize the content as JavaScript expressions.

### 3. Autocomplete / IntelliSense
- **Top-level snippets**:
  - `state` -> expands to `@state(\n\t$1\n)`
  - `states` -> expands to `@states({\n\t$1\n})`
  - `props` -> expands to `@props($1)`
  - `template` -> expands to `<template>\n\t$1\n</template>`
  - `script` -> expands to `<script setup lang="ts">\nexport default {\n\t$1\n}\n</script>`
- **Directives snippets**:
  - `foreach` -> `@foreach(${1:items} as ${2:item})\n\t$3\n@endforeach`
  - `if` -> `@if(${1:condition})\n\t$2\n@endif`
  - `block` -> `@block('${1:name}')\n\t$2\n@endblock`
  - `import` -> `@import(__template__ + '${1:path}' as ${2:Name})`
- **State linking**: If a developer types `{{ `, suggest autocomplete options derived from parsing keys inside `@state(...)`, `@states({...})`, and `@props(...)` at the top of the file!

### 4. Language Server Protocol (LSP) hints
For an advanced extension:
- If inside `<blade>`, prompt a warning or info tip: *"Legacy PHP Syntax Mode active. Variables require `$` prefix."*
- If inside `<template>` or `<sao:blade>` or no wrapper, provide JavaScript parameter hints.
- Warn if multiple level-0 wrappers (`<template>` and `<blade>`) are detected, as only the first counts and the others are discarded by the compiler.
- Detect `@state`/`@states` declarations and provide setter name autocompletion (e.g., `setCount` for state `count`).
