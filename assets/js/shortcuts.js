// Keyboard shortcuts. Pure: maps a keydown to an action, so typing anywhere stays typing.

// The output tabs in order; the number keys and the tab list's arrow keys both follow it.
export const OUTPUT_TABS = ['header', 'laravel', 'formats', 'checklist', 'summary'];
const TYPING = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Keys typed into a field belong to the field, never to a page shortcut.
export const isTyping = target => TYPING.has(target?.tagName) || Boolean(target?.isContentEditable);

export function shortcutFor(event, dialogOpen) {
  if (dialogOpen || event.ctrlKey || event.metaKey || event.altKey) return null;
  if (isTyping(event.target)) return null;
  const n = Number(event.key);
  if (Number.isInteger(n) && n >= 1 && n <= OUTPUT_TABS.length) return { type: 'tab', tab: OUTPUT_TABS[n - 1] };
  return { c: { type: 'copy' }, '/': { type: 'search' }, '?': { type: 'help' } }[event.key] ?? null;
}
