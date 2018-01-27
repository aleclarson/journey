
import nextTick from 'next-tick'
import Emitter from 'emitter'

// Timestamp used for session tracking.
const _sessionId = Date.now();

let _path = getPath(location.hash);
let _state = null;
let _depth = 0;

_state = createState();
history.replaceState(_state, _state.pageTitle, _path);

const journey = exports;

Object.defineProperty(journey, 'state', {
  enumerable: true,
  get: () => _state,
  set(state) {
    this.here(_path, state);
  }
});

Object.defineProperty(journey, 'depth', {
  enumerable: true,
  get: () => _depth,
  set() {
    throw Error('Cannot set `depth` manually');
  }
});

journey.origin = _path;

journey.here = function() {
  if (arguments.length) {
    const [path, state] = arguments;
    return updatePath(path, state, false);
  }
  return _path;
};

journey.isHere = (pattern) => {
  if (typeof pattern == 'string') {
    return _path == pattern;
  }
  return pattern.test(_path);
};

journey.visit = (path, state) =>
  updatePath(path, state, true);

journey.back = () =>
  _depth > 0 && history.back();

//
// Events
//

// Path observers are called whenever the current path is changed.
// These functions can return a function to handle the change event
// and they can even stop the propagation of an event.
const observers = [];

const events = ['set', 'push', 'pop'];
const emitter = new Emitter(events);

journey.emit = (eventId, state) => {
  if (events.indexOf(eventId) < 0) {
    throw Error(`Unknown path event: "${eventId}"`)
  }
  if (state) {
    Object.assign(_state, state);
    history.replaceState(_state, _state.pageTitle, _path);
  }
  emit(eventId, null);
};

journey.on = function(eventId, listener) {
  emitter.on(eventId, listener);
  return () => emitter.off(eventId, listener);
};

journey.observe = function(pattern, listener) {
  observers.push(createMatcher(pattern, listener));
};

//
// Helpers
//

window.addEventListener('popstate', function({ state }) {

  // The hash was changed manually.
  if (!state) {
    state = createState();
  }

  // Detect if `state` is from another session.
  else if (state.sessionId != _sessionId) {
    return location.reload();
  }

  // Webkit cannot prevent scroll event caused by popstate.
  if (!isEnv('webkit')) {
    const scrollY = scroll.y;
    requestAnimationFrame(() => {
      scroll.y = scrollY;
    });
  }

  const previous = _path;
  _path = getPath(location.hash);
  _state = state;

  // Use the depth to determine event type.
  const eventId = state.depth > _depth ? 'push' : 'pop';
  _depth = state.depth;

  emit(eventId, previous);
});

// Get current path with an optional hash.
function getPath(hash) {
  const path = location.pathname;
  if (!hash) return path;
  return path == '/' ? hash : path + hash;
}

function updatePath(path, state, isPush) {
  if (path[0] == '#') {
    path = getPath(path);
  }
  if (path != _path) {
    const previous = _path;
    _path = path;

    if (isPush) _depth += 1;
    _state = createState(state);

    if (isPush) {
      history.pushState(_state, _state.pageTitle, path);
      emit('push', previous);
    } else {
      history.replaceState(_state, _state.pageTitle, path);
      emit('set', previous);
    }
  }
}

function createState(state) {
  if (!state) {
    state = {};
  }
  state.time = Date.now();
  state.depth = _depth;
  if (!state.pageTitle) {
    state.pageTitle = document.title;
  }
  state.sessionId = _sessionId;
  return state;
}

function createMatcher(pattern, listener) {
  if (pattern instanceof RegExp) {
    return (path) => pattern.test(path) && listener;
  }
  if (pattern[0] == '#') {
    return (path) => path.endsWith(pattern) && listener;
  }
  if (typeof pattern == 'string') {
    return (path) => path == pattern && listener;
  }
  throw TypeError('Invalid pattern type: ' + (pattern != null ? typeof pattern : pattern));
}

function emit(eventId, previous) {
  const path = _path;
  const event = {
    type: eventId,
    path,
    state: _state,
    previous,
  };

  nextTick(() => {
    let listener, index = -1, stopped = false;
    event.stopPropagation = () => { stopped = true };

    // Avoid extra work if no previous path exists.
    if (!previous) {
      while (++index < observers.length) {
        const observer = observers[index];
        if (listener = observer(path)) {
          listener(event, true);
          if (stopped) break;
        }
      }
    }

    else {
      // Collect listeners for the current path
      // while calling listeners for the previous path.
      const listeners = [];
      while (++index < observers.length) {
        const observer = observers[index];
        if (listener = observer(path)) {
          listeners.push(listener);
        } else if (!stopped) {
          if (listener = observer(previous)) {
            listener(event, false);
          }
        }
      }

      // Call listeners for the current path.
      if (listeners.length) {
        index = -1;
        stopped = false;
        while (listener = listeners[++index]) {
          listener(event, true);
          if (stopped) break;
        }
      }
    }

    event.stopPropagation = undefined;
    emitter.emit(eventId, event);
  });
}
