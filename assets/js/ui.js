// Boot: owns the live state, persistence, and the page-level widgets. Panels get the store passed in.
import { DEFAULT_STATE, applyPreset, sanitizeState } from './state.js';
import { track, clarityTag } from './analytics.js';
import { initConfig } from './ui-config.js';
import { initOutput } from './ui-output.js';
import { initTools } from './ui-tools.js';
import { initSignup } from './ui-signup.js';

const STORAGE_KEY = 'csp-state';
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

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

function wirePage() {
  $$('.faq-q').forEach(b => b.addEventListener('click', () => b.closest('.faq-item').classList.toggle('open')));
}

const store = createStore();
const restored = restore(store);
initConfig(store);
initOutput(store);
wirePage();
initSignup();
// Restored settings are saved straight back, which rewrites old (v1) or tampered values in the clean v2 shape.
if (restored) store.update(() => {});
else store.applyPreset('strict');
initTools(store);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker registration failed', err));
  });
}
