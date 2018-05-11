# journey v2.0.0

Browser navigation enhanced.

- Timestamps
- Hard-reload detection
- Useful events: `back`, `forward`, `push`, `set`

### observe(function)

Get notified about navigation events.

- `back` the user went back 1+ times in history using native controls
- `forward` the user went forward 1+ times in history using native controls
- `push` your code called the `push` method
- `set` your code called the `set` method

You must call `observe` only once. Within the observer, you can choose to
emit to many listeners or do everything you need from a single module.

The observer is called asynchronously, and is passed the `state` object.

### push(path: string, state: ?object)

Visit the given path.

Under the hood, this calls the `history.pushState` method.

The `path` argument must begin with `/` if you want to change the entire path.
Otherwise, you will visit a path relative to the current path. This works for
`#hash`, `?query`, and `subpath` strings. For example, if the current path is
`/foo`, the previous strings navigate to `/foo#hash`, `/foo?query`, and `/foo/subpath`.

### set(path: string, state: ?object)

Change the path by overwriting the current point in history.

The optional `state` will override the current state entirely.

Under the hood, this calls the `history.replaceState` method.

### back()

Shortcut to `history.back`

### forward()

Shortcut to `history.forward`

### get()

Returns the cached result of `location.pathname + location.hash + location.search`

### is(string)

Shorthand for `journey.get() === "/path/"`

### emit(id: string)

### chain: object[]

The array of "path states" visited in the current session.

### index: number

The current position in the `chain` array.

### state: object

The current "path state", which is guaranteed to have the following properties:

- `session: number` when the current session began
- `time: number` when this path state was created
- `title: string` the value of `document.title`

You can store anything JSON-compatible in this object, but you should use the
`push` or `set` methods to do that. If you want to replace the entire state
without changing the path, setting this property is the easiest way.

### title: string

Shortcut to `document.title`

You should set this property instead of setting `document.title` directly
so the history can be properly updated.

### origin: string

The first path in the current session.
