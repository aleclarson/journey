const nextTick = require('next-tick');

const journey = exports;

// Timestamp used for session tracking.
const _session = Date.now();

// The current path and its state.
let _path = getPath();
let _state = createState();

// The chain of path states.
const _chain = [_state];

// Our position in the chain.
let _index = 0;

// Register the initial state.
history.replaceState(_state, _state.title, _path);

//
// Properties
//

const d = Object.defineProperty;

d(journey, 'chain', {
  enumerable: true,
  value: _chain,
});

d(journey, 'index', {
  enumerable: true,
  get: () => _index,
});

d(journey, 'state', {
  enumerable: true,
  get: () => _state,
  set: setState,
});

d(journey, 'title', {
  enumerable: true,
  get: () => _state.title,
  set(title) {
    document.title = _state.title = title;
    history.replaceState(_state, title, _path);
  }
})

d(journey, 'origin', {
  enumerable: true,
  value: _path,
});

//
// Methods
//

journey.is = (path) => _path == path;
journey.get = () => _path;

journey.set = updater('set', 'replaceState');
journey.push = updater('push', 'pushState');

journey.back = history.back.bind(history);
journey.forward = history.forward.bind(history);

//
// Events
//

let observer = Function.prototype;
journey.observe = (fn) => {observer = nextTick.bind(0, fn)};

const eventTypes = ['set', 'push', 'back', 'forward'];
journey.emit = (eventType, state) => {
  if (eventTypes.indexOf(eventType) == -1) {
    throw Error(`Unknown path event: "${eventType}"`);
  }
  if (state) setState(state);
  observer(eventType, _state);
};

//
// Internal
//

// Listen for native back/forward events.
window.addEventListener('popstate', function({ state }) {

  // The state is falsy when the hash is changed via the URL bar.
  if (!state) state = createState();

  // Remember the previous index.
  const index = _index;

  _path = getPath();
  _state = insertState(state);

  // Is this state from an old session?
  if (state == _state) {
    state.session = null;
  }

  // Let the observer know what happened.
  observer(index < _index ? 'forward' : 'back', state);

  // Adopt the orphan after the observer.
  if (!state.session) nextTick(() => {
    state.session = _session;
    if (state == _state) {
      history.replaceState(state, state.title, _path);
    }
  });
});

// Get the relative href and optionally replace the #? string.
function getPath(query) {
  const path = location.pathname;
  return path + (query || location.hash + location.search);
}

function updater(eventType, action) {
  const push = eventType == 'push';
  return function(path, state) {
    if (/^[^/]/.test(path)) {
      path = getPath(path);
    }
    if (push && path == _path) {
      return; // Avoid push if already there.
    }
    _state = createState(state);
    if (push) {
      // Remove dead path states.
      const dead = 1 + _index - _chain.length;
      if (dead !== 0) {
        _chain.splice(_index, dead, _state);
      } else {
        _chain.push(_state);
      }
    } else {
      _chain[_index] = _state;
    }
    history[action](_state, _state.title, _path);
    observer(eventType, _state);
  }
}

function createState(state = {}) {
  state.session = _session;
  if (!state.time) {
    state.time = Date.now();
  }
  if (!state.title) {
    state.title = document.title;
  }
  return state;
}

function setState(state = {}) {
  state.time = _state.time;
  _chain[_index] = _state = createState(state);
  history.replaceState(_state, _state.title, _path);
}

// Insert a path state, unless it already exists.
// Returns the new chain index.
function insertState(state) {
  const {time} = state;

  // Are we moving forward in time?
  if (time > _state.time) {
    // Are we at the end of the state chain?
    if (_index == _chain.length - 1) {
      _index = _chain.push(state) - 1;
      return state;
    }
    _index = search(_chain, (state) => {
      return time <= state.time;
    }, _index);
  } else {
    _index = searchUp(_chain, (state) => {
      return time > state.time;
    }, _index);
  }

  // Does this state already exist?
  if (time == _chain[_index].time) {
    return _chain[_index];
  }

  // Probably an orphan state.
  _chain.splice(_index, 0, state);
  return state;
}

// Search down an array.
// When the given `test` function returns true, the current index is returned.
// When no match is found, the length is returned.
function search(arr, test, from) {
  let i = from != null ? from : -1;
  const len = arr.length;
  if (i < len) {
    i += 1;
    do {
      if (test(arr[i], i)) return i;
    } while (++i !== len);
  }
  return len;
}

// Search up an array.
// When the given `test` function returns true, the previous index is returned.
// When no match is found, zero is returned.
function searchUp(arr, test, from) {
  let i = from != null ? from : arr.length;
  if (i > 0) {
    i -= 1;
    do {
      if (test(arr[i], i)) return i + 1;
    } while (--i !== 0);
  }
  return 0;
}
