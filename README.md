
# journey v1.0.0

Manage your browser history with this simple library.

```js
const journey = require('journey')
```

The `journey` object has the following properties:

### state: object

Each point in history can store a JSON object containing any relevant data.
The `state` object contains the following properties by default:
- `sessionId: number`
- `time: number`
- `depth: number`
- `pageTitle: string`

The `sessionId` is different between every hard reload. The `time` indicates
in milliseconds when the last navigation event occurred. The `depth` indicates
how many times the `back` method can be called. The `pageTitle` preserves
the document title for each point in history.

### depth: number

The current history depth, which represents the number of times the `back`
method can be called.

### origin: string

The pathname where the session began.

---

The `journey` object has the following methods:

### here(): string

The current pathname.

### here(path: string, state: ?object): void

Update the pathname by mutating the current point in history. In other words,
using the `back` method won't reset the pathname to its previous value. You can
optionally pass a `state` object, which replaces the current state.

### isHere(pattern: string | RegExp): boolean

Are we there yet? Returns `true` if the current pathname matches the given pattern.

### visit(path: string, state: ?object): void

Update the pathname by creating a new point in history. In other words,
using the `back` method **will** reset the pathname to its previous value.
You can optionally pass a `state` object, which must be compatible with
`JSON.stringify` and will be preserved in case the user goes back.

### back(): void

Reset the pathname (and the `state` object) to its previous value. This is
equivalent to the user pressing the browser's native back button.

This method does nothing when the `depth` property equals zero.

### emit(event: string, state: ?object): void

Manually trigger an event.

Valid events include: `set | push | pop`

### on(event: string, listener: function): function

Listen for an event.

The `set` event indicates the pathname was replaced, but the `depth` remains
the same. The `push` event indicates the pathname changed and the `depth` was
incremented. The `pop` event indicates the pathname changed and the `depth` was
decremented.

The `listener` function is passed an event object that contains the following
properties:
- `type: string`
- `path: string`
- `state: object`
- `previous: string`

All events are not emitted until the next microtask. The best way to understand
this behavior is to think of the event emitter being wrapped in a promise every
time an event occurs.

### observe(pattern: string | RegExp, listener: function): void

Observe changes to the pathname. The given `listener` function is called
when the pathname matches the given `pattern`. Observers cannot be stopped.
The `listener` function is passed the same event object that an `on` listener
would receive.
