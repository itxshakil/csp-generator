// Boot: owns the live state, persistence, and the page-level widgets. Panels get the store passed in.
import { DEFAULT_STATE, PRESETS, sanitizeState } from './state.js';
import { track, clarityTag } from './analytics.js';
import { initConfig } from './ui-config.js';
import { initOutput } from './ui-output.js';

const STORAGE_KEY = 'csp-state';
const formStartedAt = Date.now();
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
    applyPreset(name) {
      store.update(s => {
        Object.assign(s, structuredClone(PRESETS[name]));
        s.custom = structuredClone(DEFAULT_STATE.custom);
      }, name);
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

// ── Guide form ──────────────────────────────────────────────────────────────
async function submitGuide(btn) {
  const emailEl = $('#g-email');
  const email = emailEl.value;
  const name = $('#g-name').value || 'Friend';
  const pot = $('#g-pot').value;
  if (!email || !email.includes('@')) {
    emailEl.classList.add('is-invalid');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'Sending…';
  try {
    const res = await fetch('/save-email.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, pot, ts: formStartedAt }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.ok === false) throw new Error(data.error || 'Request failed');
  } catch (e) {
    console.error('Guide signup failed', e);
    btn.disabled = false;
    btn.textContent = 'Send me the PDF →';
    emailEl.classList.add('is-invalid');
    return;
  }
  $('#guide-form').classList.add('is-hidden');
  $('#guide-success').classList.remove('is-hidden');
  track('guide_signup');
  clarityTag('lead', 'true');
}

function wirePage() {
  $$('.faq-q').forEach(b => b.addEventListener('click', () => b.closest('.faq-item').classList.toggle('open')));
  $('[data-action="submit-guide"]').addEventListener('click', e => submitGuide(e.currentTarget));
}

const store = createStore();
const restored = restore(store);
initConfig(store);
initOutput(store);
wirePage();
// Restored settings are saved straight back, which rewrites old (v1) or tampered values in the clean v2 shape.
if (restored) store.update(() => {});
else store.applyPreset('strict');

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => console.warn('Service worker registration failed', err));
  });
}
