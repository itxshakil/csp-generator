// The live config. Every change goes through update(), which saves and notifies. Pure apart from the
// injected save, so it runs under node --test.
import { DEFAULT_STATE, applyPreset } from './state.js';

export function createStore({ save, onPreset = () => {} }) {
  const listeners = [];
  let snapshot = null;
  const notify = () => listeners.forEach(fn => fn());

  const store = {
    state: structuredClone(DEFAULT_STATE),
    preset: '',
    onChange(fn) { listeners.push(fn); },
    // Inputs are validated where they are typed, so the mutator never sees junk.
    // Any change after a reset drops its undo: undo must never throw away newer work.
    update(mutator, preset = '') {
      snapshot = null;
      mutator(store.state);
      store.preset = preset;
      save(store.state);
      notify();
    },
    applyPreset(name, options) {
      store.update(s => Object.assign(s, applyPreset(s, name, options)), name);
      onPreset(name);
    },
    // Back to the selected preset (Strict when none), everything else cleared. Undoable until the next change.
    reset() {
      const before = { state: structuredClone(store.state), preset: store.preset };
      store.applyPreset(store.preset || 'strict', { reset: true });
      snapshot = before;
    },
    get canUndo() { return snapshot !== null; },
    undo() {
      if (!snapshot) return false;
      ({ state: store.state, preset: store.preset } = snapshot);
      snapshot = null;
      save(store.state);
      notify();
      return true;
    },
  };
  return store;
}
