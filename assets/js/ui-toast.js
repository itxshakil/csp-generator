// Reset with a 6 second undo toast. The toast never takes focus: it follows Reset in the DOM, so Undo is
// the next Tab stop, and Ctrl/Cmd+Z works while it is open. Hovering or focusing it pauses the countdown.
import { $ } from './dom.js';
import { announce } from './announce.js';
import { isTyping } from './shortcuts.js';

const UNDO_MS = 6000;
const MAC = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function initUndoToast(store) {
  const toast = $('#toast');
  let timer = 0;

  const isOpen = () => toast.matches(':popover-open');
  const startTimer = () => { clearTimeout(timer); timer = setTimeout(hide, UNDO_MS); };
  const hide = () => {
    clearTimeout(timer);
    if (isOpen()) toast.hidePopover();
  };
  const undo = () => {
    if (store.undo()) announce('Settings restored');
    hide();
  };

  $('[data-action="reset"]').addEventListener('click', () => {
    store.reset();
    hide();
    toast.showPopover();
    announce(`Settings reset. Press Undo, or ${MAC ? 'Command' : 'Control'} Z, to bring them back.`);
    startTimer();
  });
  toast.addEventListener('pointerenter', () => clearTimeout(timer));
  toast.addEventListener('focusin', () => clearTimeout(timer));
  toast.addEventListener('pointerleave', () => { if (!toast.contains(document.activeElement)) startTimer(); });
  toast.addEventListener('focusout', e => { if (isOpen() && !toast.contains(e.relatedTarget)) startTimer(); });
  $('.toast-undo', toast).addEventListener('click', undo);
  // Any other change ends the chance to undo, so the toast goes with it.
  store.onChange(() => { if (!store.canUndo) hide(); });
  document.addEventListener('keydown', e => {
    if (!isTyping(e.target) && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && isOpen()) {
      e.preventDefault();
      undo();
    }
  });
}
