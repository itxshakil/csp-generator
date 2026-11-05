// Screen reader announcements through one polite live region, and copy buttons that confirm what they did.
import { iconSvg } from './icons.js';

const RESET_MS = 1800;
const timers = new WeakMap();

// Cleared first and filled on the next frame, so the same message twice in a row is read twice.
export function announce(text) {
  const region = document.getElementById('announcer');
  if (!region) return;
  region.textContent = '';
  requestAnimationFrame(() => { region.textContent = text; });
}

// Buttons may carry a `.cbtn-icon` and a `.cbtn-label`; plain text buttons work too.
export async function copyWithFeedback(btn, text, what) {
  const label = btn.querySelector('.cbtn-label') ?? btn;
  const icon = btn.querySelector('.cbtn-icon');
  if (!timers.has(btn)) btn.dataset.label = label.textContent;
  clearTimeout(timers.get(btn));
  let ok = true;
  try {
    await navigator.clipboard.writeText(text);
  } catch (err) {
    console.error('Clipboard write failed', err);
    ok = false;
  }
  btn.classList.toggle('ok', ok);
  btn.classList.toggle('failed', !ok);
  label.textContent = ok ? 'Copied' : 'Copy failed';
  if (icon) icon.innerHTML = iconSvg(ok ? 'check' : 'copy');
  announce(ok ? `${what} copied` : 'Copy failed. Select the text and copy it yourself.');
  timers.set(btn, setTimeout(() => {
    label.textContent = btn.dataset.label;
    if (icon) icon.innerHTML = iconSvg('copy');
    btn.classList.remove('ok', 'failed');
    timers.delete(btn);
  }, ok ? RESET_MS : RESET_MS * 2));
  return ok;
}
