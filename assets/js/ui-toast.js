// Reset with a 6 second undo toast. The toast never takes focus; Undo is one Tab away, or Ctrl/Cmd+Z.
import { $ } from './dom.js';
import { announce } from './announce.js';

const UNDO_MS = 6000;

export function initUndoToast(store) {
  const toast = $('#toast');
  let timer = 0;

  const hide = () => {
    clearTimeout(timer);
    if (toast.matches(':popover-open')) toast.hidePopover();
  };
  const undo = () => {
    if (store.undo()) announce('Settings restored');
    hide();
  };

  $('[data-action="reset"]').addEventListener('click', () => {
    store.reset();
    hide();
    toast.showPopover();
    announce('Settings reset. Undo is available for a few seconds.');
    timer = setTimeout(hide, UNDO_MS);
  });
  $('.toast-undo', toast).addEventListener('click', undo);
  // Any other change ends the chance to undo, so the toast goes with it.
  store.onChange(() => { if (!store.canUndo) hide(); });
  document.addEventListener('keydown', e => {
    const typing = e.target.closest?.('input, textarea, select, [contenteditable]');
    if (!typing && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && store.canUndo) {
      e.preventDefault();
      undo();
    }
  });
}
