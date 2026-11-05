// Boot: owns the live state, persistence, and the page-level widgets. Panels get the store passed in.
import { sanitizeState } from './state.js';
import { createStore } from './store.js';
import { track, clarityTag } from './analytics.js';
import { initConfig } from './ui-config.js';
import { initOutput } from './ui-output.js';
import { initTools } from './ui-tools.js';
import { initSignup } from './ui-signup.js';
import { shortcutFor } from './shortcuts.js';
import { initUndoToast } from './ui-toast.js';
import { initMobileBar } from './ui-mbar.js';
import { $ } from './dom.js';

const STORAGE_KEY = 'csp-state';

function save(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('Could not save settings to localStorage', e);
  }
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
  const head = $('#sec-integrations .cfg-section-head');
  if (head.getAttribute('aria-expanded') === 'false') head.click();
  const search = $('#int-search');
  search.focus({ preventScroll: true });
  search.scrollIntoView({ block: 'center' });
}

function wireShortcuts(output) {
  const help = $('#kbd-help');
  document.addEventListener('keydown', e => {
    const action = shortcutFor(e, Boolean($('dialog[open]')));
    if (!action) return;
    e.preventDefault();
    if (action.type === 'tab') output.setTab(action.tab);
    else if (action.type === 'copy') output.copyActive();
    else if (action.type === 'search') focusSearch();
    else if (action.type === 'help') help.togglePopover();
    track('shortcut', { action: action.type });
  });
}

const store = createStore({
  save,
  onPreset(name) {
    track('select_preset', { preset: name });
    clarityTag('preset', name);
  },
});
const restored = restore(store);
initConfig(store);
const output = initOutput(store);
initSignup();
// Restored settings are saved straight back, which rewrites old (v1) or tampered values in the clean v2 shape.
if (restored) store.update(() => {});
else store.applyPreset('strict');
initTools(store);
initUndoToast(store);
initMobileBar(store);
wireShortcuts(output);

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker registration failed', err));
  });
}
