// Keyboard shortcuts. Pure: maps a keydown to an action, so typing anywhere stays typing.

export const SHORTCUT_TABS = ['header', 'laravel', 'formats', 'checklist', 'summary'];
const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

export function shortcutFor(event, dialogOpen) {
  if (dialogOpen || event.ctrlKey || event.metaKey || event.altKey) return null;
  const target = event.target ?? {};
  if (TYPING.has(target.tagName) || target.isContentEditable) return null;
  const n = Number(event.key);
  if (Number.isInteger(n) && n >= 1 && n <= SHORTCUT_TABS.length) return { type: 'tab', tab: SHORTCUT_TABS[n - 1] };
  return { c: { type: 'copy' }, '/': { type: 'search' }, '?': { type: 'help' } }[event.key] ?? null;
}
