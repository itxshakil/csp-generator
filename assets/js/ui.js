// Boot: owns the live state, persistence, and the page-level widgets. Panels get the store passed in.
import { DEFAULT_STATE, applyPreset, sanitizeState } from './state.js';
import { track, clarityTag } from './analytics.js';
import { initConfig } from './ui-config.js';
import { initOutput } from './ui-output.js';
import { initTools } from './ui-tools.js';
import { initSignup } from './ui-signup.js';
import { shortcutFor } from './shortcuts.js';

const STORAGE_KEY = 'csp-state';

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save settings to localStorage', e);
  }
}

function createStore() {
  const listeners = [];
  const store = {
    state: structuredClone(DEFAULT_STATE),
    preset: '',
    onChange(fn) { listeners.push(fn); },
    // Every user change goes through here. Inputs are validated where they are typed, so the mutator never sees junk.
    update(mutator, preset = '') {
      mutator(store.state);
      store.preset = preset;
      save(store.state);
      listeners.forEach(fn => fn());
    },
    applyPreset(name, options) {
      store.update(s => Object.assign(s, applyPreset(s, name, options)), name);
      track('select_preset', { preset: name });
      clarityTag('preset', name);
    },
  };
  return store;
}

// Returns true when saved settings were found and loaded.
function restore(store) {
  let raw;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (e) {
    console.warn('localStorage unavailable', e);
    return false;
  }
  if (!raw) return false;
  let saved;
  try {
    saved = JSON.parse(raw);
  } catch (e) {
    console.warn('Ignoring unreadable saved settings', e);
    return false;
  }
  store.state = sanitizeState(saved);
  return true;
}

function focusSearch() {
  const head = document.querySelector('#sec-integrations .cfg-section-head');
  if (head.getAttribute('aria-expanded') === 'false') head.click();
  const search = document.querySelector('#int-search');
  search.focus({ preventScroll: true });
  search.scrollIntoView({ block: 'center' });
}

function wireShortcuts(output) {
  const help = document.querySelector('#kbd-help');
  document.addEventListener('keydown', e => {
    const action = shortcutFor(e, Boolean(document.querySelector('dialog[open]')));
    if (!action) return;
    e.preventDefault();
    if (action.type === 'tab') output.setTab(action.tab);
    else if (action.type === 'copy') output.copyActive();
    else if (action.type === 'search') focusSearch();
    else if (action.type === 'help') help.togglePopover();
    track('shortcut', { action: action.type });
  });
}

const store = createStore();
const restored = restore(store);
initConfig(store);
const output = initOutput(store);
initSignup();
// Restored settings are saved straight back, which rewrites old (v1) or tampered values in the clean v2 shape.
if (restored) store.update(() => {});
else store.applyPreset('strict');
initTools(store);
wireShortcuts(output);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker registration failed', err));
  });
}
