# OneJS Directives Reference

Complete reference for all custom directives in OneJS framework.

## Table of Contents

1. [Data & Variables](#data--variables)
2. [Reactive State](#reactive-state)
3. [Control Flow](#control-flow)
4. [Loops](#loops)
5. [Output & Interpolation](#output--interpolation)
6. [Event Handling](#event-handling)
7. [Attribute Binding](#attribute-binding)
8. [Class & Style Binding](#class--style-binding)
9. [View Structure](#view-structure)
10. [Async Data](#async-data)
11. [Lifecycle & Scripts](#lifecycle--scripts)

---

## Data & Variables

### @vars

Declare data variables (props/data passed to view).

**Syntax:**
```blade
// Array syntax
@vars(['user', 'posts', 'title'])

// With defaults
@vars($user = null, $posts = [], $title = 'Default')
```

**Notes:**
- Variables from `@vars` are **reactive** - changes trigger re-renders
- Accessible throughout the template
- Automatically tracked in `__VARIABLE_LIST__`

**Snippet Trigger:** `one:vars`

---

### @let

Declare local variables (not from data).

**Syntax:**
```blade
@let($count = 0)
@let($isActive = true)
@let([$first, $second] = [1, 2])
```

**Notes:**
- Variables from `@let` are also **reactive**
- Scoped to template
- Can be destructured

**Snippet Trigger:** `one:let`

---

### @const

Declare constants.

**Syntax:**
```blade
@const($API_URL = 'https://api.example.com')
@const($MAX_ITEMS = 10)
```

**Notes:**
- Constants are read-only
- Available throughout component

**Snippet Trigger:** `one:const`

---

## Reactive State

### @useState

Declare reactive state with automatic subscriptions.

**Syntax:**

1. **Two-parameter format** (recommended):
```blade
@useState($count, 0)
@useState($isVisible, false)
```

2. **Three-parameter format** (custom setter name):
```blade
@useState(0, $count, $setCount)
```

**Usage in template:**
```blade
<p>Count: {{ $count }}</p>
<button @click(setCount($count + 1))>Increment</button>
```

**Notes:**
- State changes **automatically trigger re-renders**
- Setter functions generated automatically
- Integrates with OneJS reactive system

**Snippet Trigger:** `one:useState`

---

## Control Flow

### @if / @elseif / @else / @endif

Conditional rendering.

**Syntax:**
```blade
@if($user->isAdmin)
    <p>Admin Panel</p>
@elseif($user->isModerator)
    <p>Moderator Panel</p>
@else
    <p>User Panel</p>
@endif
```

**With reactive variables:**
```blade
@if($isLoggedIn)
    <p>Welcome, {{ $userName }}!</p>
@endif
```

**Snippet Triggers:**
- `one:if` - Basic if statement
- `one:if-else` - If-else structure
- `one:if-elseif-else` - Complete conditional

---

### @switch / @case / @default / @break / @endswitch

Switch statements.

**Syntax:**
```blade
@switch($userRole)
    @case('admin')
        <p>Admin Access</p>
        @break
    
    @case('moderator')
        <p>Moderator Access</p>
        @break
    
    @default
        <p>User Access</p>
@endswitch
```

**Snippet Trigger:** `one:switch`

---

## Loops

### @foreach / @endforeach

Iterate over arrays.

**Syntax:**
```blade
@foreach($users as $user)
    <li>{{ $user->name }}</li>
@endforeach

// With key => value
@foreach($items as $key => $item)
    <li>{{ $key }}: {{ $item }}</li>
@endforeach
```

**Loop variables:**
- `$loop->index` - Current iteration (0-based)
- `$loop->first` - Is first iteration
- `$loop->last` - Is last iteration
- `$loop->count` - Total items

**Snippet Triggers:**
- `one:foreach` - Basic loop
- `one:foreach-key` - Loop with key

---

### @for / @endfor

Traditional for loop.

**Syntax:**
```blade
@for($i = 0; $i < 10; $i++)
    <li>Item {{ $i }}</li>
@endfor
```

**Snippet Trigger:** `one:for`

---

### @while / @endwhile

While loop.

**Syntax:**
```blade
@while($count < 5)
    <p>Count: {{ $count }}</p>
@endwhile
```

**Snippet Trigger:** `one:while`

---

## Output & Interpolation

### {{ $variable }}

Escaped output (HTML-safe).

**Syntax:**
```blade
<p>Name: {{ $user->name }}</p>
<p>{{ $dangerousContent }}</p>
```

**With reactive variables:**
```blade
<p>Count: {{ $count }}</p>
```

**Snippet Trigger:** `one:interpolate`

---

### {!! $variable !!}

Unescaped output (raw HTML).

**Syntax:**
```blade
<div>{!! $htmlContent !!}</div>
```

**⚠️ Warning:** Only use with trusted content to prevent XSS attacks.

**Snippet Trigger:** `one:raw`

---

### @out

Unescaped output directive (alternative to {!! !!}).

**Syntax:**
```blade
@out($htmlContent)
@out($user->bio)
```

**Snippet Trigger:** `one:out`

---

### @json

Output JSON-encoded data.

**Syntax:**
```blade
<script>
    const userData = @json($user);
    const config = @json(['apiUrl' => $apiUrl, 'debug' => true]);
</script>
```

**With reactive variables:**
```blade
<script>
    const state = @json(['count' => $count, 'isActive' => $isActive]);
</script>
```

**Snippet Trigger:** `one:json`

---

## Event Handling

### @click

Handle click events.

**Syntax:**
```blade
<button @click(handleClick)>Click me</button>
<button @click(increment)>Count: {{ $count }}</button>
<button @click(deleteItem($item->id))>Delete</button>
```

**With modifiers:**
```blade
// Prevent default and stop propagation
<a @click.prevent.stop(handleLink)>Link</a>
```

**Snippet Triggers:**
- `one:click` - Basic click handler
- `one:click-param` - Click with parameter

---

### @change

Handle change events (inputs, selects).

**Syntax:**
```blade
<input type="checkbox" @change(toggleTodo($todo['id']))>
<select @change(updateCategory)>
    <option>Option 1</option>
</select>
```

**Snippet Trigger:** `one:change`

---

### @input

Handle input events (text inputs).

**Syntax:**
```blade
<input type="text" @input(handleInput) value="{{ $text }}">
```

**Snippet Trigger:** `one:input`

---

### @submit

Handle form submission.

**Syntax:**
```blade
<form @submit(handleSubmit)>
    <input type="text" name="username">
    <button type="submit">Submit</button>
</form>
```

**Snippet Trigger:** `one:submit`

---

## Attribute Binding

### @attr

Bind dynamic attributes.

**Syntax:**

1. **Simple binding:**
```blade
<div @attr('data-id', $user->id)></div>
<img @attr('src', $imageUrl) @attr('alt', $imageAlt)>
```

2. **Array binding:**
```blade
<div @attr([
    'data-id' => $id,
    'data-name' => $name,
    'title' => $tooltip
])></div>
```

**With reactive variables:**
```blade
<div @attr('data-count', $count)></div>
```

**Snippet Triggers:**
- `one:attr` - Single attribute
- `one:attr-array` - Multiple attributes

---

### @checked

Conditional checked attribute.

**Syntax:**
```blade
<input type="checkbox" @checked($isActive)>
<input type="checkbox" @checked($todo['completed'])>
```

**Snippet Trigger:** `one:checked`

---

### @selected

Conditional selected attribute.

**Syntax:**
```blade
<option @selected($category === 'books')>Books</option>
```

**Snippet Trigger:** `one:selected`

---

### @disabled

Conditional disabled attribute.

**Syntax:**
```blade
<button @disabled($isLoading)>Submit</button>
```

**Snippet Trigger:** `one:disabled`

---

## Class & Style Binding

### @class

Dynamic class binding.

**Syntax:**

1. **Conditional class:**
```blade
<div @class('active', $isActive)></div>
```

2. **Array binding:**
```blade
<li @class([
    'todo-item' => true,
    'completed' => $todo['completed'],
    'urgent' => $todo['priority'] === 'high'
])>
```

3. **Mixed (static + conditional):**
```blade
<div @class(['btn', 'btn-primary' => $isPrimary, 'btn-disabled' => $isDisabled])>
```

**With reactive variables:**
```blade
<div @class(['active' => $isActive, 'loading' => $isLoading])></div>
```

**Snippet Trigger:** `one:class`

---

### @style

Dynamic style binding.

**Syntax:**

1. **Array binding:**
```blade
<div @style([
    'color' => $textColor,
    'font-size' => $fontSize . 'px',
    'display' => $isVisible ? 'block' : 'none'
])></div>
```

2. **Conditional styles:**
```blade
<div @style(['background-color' => $isActive ? '#green' : '#red'])></div>
```

**With reactive variables:**
```blade
<div @style(['opacity' => $opacity, 'transform' => 'scale(' . $scale . ')'])></div>
```

**Snippet Trigger:** `one:style`

---

### @show

Conditional display (show/hide).

**Syntax:**
```blade
<div @show($isVisible)>
    Content will be hidden with display:none when $isVisible is false
</div>
```

**Snippet Trigger:** `one:show`

---

## View Structure

### @extends

Extend a layout.

**Syntax:**
```blade
@extends('layouts.app')
@extends('layouts.admin')
```

**Notes:**
- Must be first directive in file
- Child view inherits layout structure
- Use with `@section` to define content

**Snippet Trigger:** `one:extends`

---

### @section / @endsection

Define content sections.

**Syntax:**

1. **Block section:**
```blade
@section('content')
    <h1>Main Content</h1>
    <p>Content goes here...</p>
@endsection
```

2. **Inline section:**
```blade
@section('title', 'Page Title')
```

**Snippet Triggers:**
- `one:section` - Block section
- `one:section-inline` - Inline section

---

### @yield

Output section content (in layouts).

**Syntax:**
```blade
<!DOCTYPE html>
<html>
<head>
    <title>@yield('title', 'Default Title')</title>
</head>
<body>
    @yield('content')
</body>
</html>
```

**With defaults:**
```blade
@yield('sidebar', '<p>Default sidebar</p>')
```

**Snippet Trigger:** `one:yield`

---

### @include

Include sub-views.

**Syntax:**

1. **Simple include:**
```blade
@include('components.header')
@include('components.footer')
```

2. **With data:**
```blade
@include('components.card', ['title' => $title, 'content' => $content])
@include('components.user-item', ['user' => $user])
```

**With reactive data:**
```blade
@include('components.counter', ['count' => $count])
```

**Snippet Triggers:**
- `one:include` - Simple include
- `one:include-data` - Include with data

---

### @view / @wrapper

Configure view wrapper element.

**Syntax:**

1. **Enable wrapper:**
```blade
@view(:subscribe)
```

2. **With custom tag:**
```blade
@view(:tag('article'), :class('container'))
```

**Options:**
- `:subscribe` - Enable reactive subscriptions
- `:tag('element')` - Custom HTML tag (default: div)
- `:class('...')` - Add classes
- `:id('...')` - Set ID

**Snippet Trigger:** `one:view`

---

## Async Data

### @fetch

Configure data fetching.

**Syntax:**

1. **GET request:**
```blade
@fetch('/api/users')
```

2. **With method:**
```blade
@fetch('/api/users', 'POST')
```

3. **Full config:**
```blade
@fetch([
    'url' => '/api/users',
    'method' => 'GET',
    'headers' => ['Authorization' => 'Bearer token']
])
```

**Snippet Triggers:**
- `one:fetch` - Basic fetch
- `one:fetch-method` - Fetch with method

---

### @await

Declare variables that wait for async data.

**Syntax:**
```blade
@vars($users, $posts)
@fetch('/api/data')
@await($users, $posts)

<div>
    @foreach($users as $user)
        <li>{{ $user->name }}</li>
    @endforeach
</div>
```

**Notes:**
- Variables in `@await` will wait for fetch to complete
- View shows loading state until data arrives
- Auto-renders when data is available

**Snippet Trigger:** `one:await`

---

## Lifecycle & Scripts

### @register / @endregister

Register view lifecycle code (mounted, methods, computed).

**Syntax:**
```blade
@register
    mounted() {
        console.log('View mounted');
        this.loadData();
    },
    
    methods: {
        loadData() {
            // Load data logic
        },
        handleClick() {
            this.data.count++;
        }
    },
    
    computed: {
        fullName() {
            return this.data.firstName + ' ' + this.data.lastName;
        }
    }
@endregister
```

**Lifecycle hooks:**
- `mounted()` - Called when view is mounted to DOM
- `updated()` - Called when view updates
- `unmounted()` - Called before view is removed

**Snippet Trigger:** `one:register`

---

### @script / @endscript

Alias for @register (preferred).

**Syntax:**
```blade
@script
    mounted() {
        console.log('View ready');
    },
    
    methods: {
        increment() {
            this.state.count++;
        }
    },
    
    computed: {
        total() {
            return this.state.count * 2;
        }
    }
@endscript
```

**Snippet Trigger:** `one:script`

---

## Best Practices

### 1. Use @vars for Props
```blade
@vars(['user', 'posts'])  ✅
```

### 2. Use @useState for Local State
```blade
@useState($count, 0)  ✅
```

### 3. Use @class for Dynamic Classes
```blade
<div @class(['active' => $isActive])>  ✅
```

### 4. Organize Scripts in @script
```blade
@script
    mounted() { /* lifecycle */ },
    methods: { /* functions */ },
    computed: { /* derived values */ }
@endscript
```

### 5. Use @json for JS Data
```blade
<script>
    const config = @json($config);  ✅
</script>
```

### 6. Keep Templates Clean
- Use `@include` for reusable parts
- Use `@section` for layout content
- Use `@component` for encapsulation

---

## File Structure

A proper `.one` file uses this structure:

```blade
// 1. Declare data variables
@vars(['user', 'posts'])

// 2. Declare local state
@useState($count, 0)

// 3. Template
<blade>
    <div class="container">
        <h1>{{ $user->name }}</h1>
        @foreach($posts as $post)
            <article>{{ $post->title }}</article>
        @endforeach
    </div>
</blade>

// 4. Lifecycle and methods
@script
    mounted() {
        console.log('Component ready');
    },
    methods: {
        increment() {
            this.state.count++;
        }
    }
@endscript

// 5. Styles
<style>
    .container {
        padding: 20px;
    }
</style>
```

---

## Reactive System

All data from `@vars`, `@let`, `@const`, and `@useState` is **reactive**:

```blade
@vars(['count'])
@useState($isVisible, false)

<!-- Changes to $count or $isVisible automatically update UI -->
<p @show($isVisible)>Count: {{ $count }}</p>
<button @click(setIsVisible(!$isVisible))>Toggle</button>
```

**How it works:**
1. Compiler tracks which variables are used in each directive
2. Generates `__reactive()` calls with dependency tracking
3. Runtime subscribes to state changes
4. Automatically re-renders affected parts when state changes

---

## Troubleshooting

### Issue: Reactive updates not working
**Solution:** Ensure variables are declared with `@vars`, `@let`, or `@useState`:
```blade
@vars(['count'])  // ✅ Reactive
```

### Issue: Events not firing
**Solution:** Ensure handler methods are defined in `@script`:
```blade
@script
    methods: {
        handleClick() {  // ✅ Defined
            // logic
        }
    }
@endscript
```

### Issue: Styles not applying
**Solution:** Add `<style>` section at end of component

### Issue: Data not displaying
**Solution:** Check `@vars` declaration includes all needed variables

---

**Version:** 1.3.0  
**Last Updated:** January 30, 2026
