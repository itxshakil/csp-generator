// Shared test fixtures. Not a test file itself: node --test only runs *.test.js.
import { DEFAULT_STATE, PRESETS, sanitizeState } from '../../assets/js/state.js';

// A clean state with some fields set, as the app would hold it.
export const stateWith = (extra = {}) => sanitizeState({ ...structuredClone(DEFAULT_STATE), ...extra });

// A preset's state, with optional overrides.
export const preset = (name, extra = {}) => stateWith({ ...PRESETS[name], ...extra });
