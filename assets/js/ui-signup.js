// The PDF guide signup. Without scripts the form posts to save-email.php as plain HTML.
import { track, clarityTag } from './analytics.js';
import { $ } from './dom.js';
import { emailError } from './signup.js';

// Only a validation error marks the field invalid; a server or network error is not the address's fault.
// The text is cleared first, so the alert is read again when the same message repeats.
function showError(input, message, invalid = Boolean(message)) {
  const box = $('#g-error');
  box.textContent = '';
  if (message) requestAnimationFrame(() => { box.textContent = message; });
  if (invalid) input.setAttribute('aria-invalid', 'true');
  else input.removeAttribute('aria-invalid');
}

export function initSignup() {
  const form = $('#guide-form');
  const input = $('#g-email');
  const btn = $('.form-submit', form);
  const startedAt = Date.now();
  input.addEventListener('input', () => { if (input.hasAttribute('aria-invalid')) showError(input, ''); });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const error = emailError(input.value);
    showError(input, error);
    if (error) { input.focus(); return; }
    const label = [...btn.childNodes];
    btn.disabled = true;
    btn.textContent = 'Sending…';
    let failure = null;
    try {
      const res = await fetch('/save-email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.value.trim(), pot: $('#g-pot').value, ts: startedAt }),
      });
      // Anything but {"ok": true} is a failure, including a 200 HTML page from a proxy or captive portal.
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok !== true) {
        failure = res.status === 422 && data.error
          ? { message: data.error, invalid: true }
          : { message: 'Something went wrong on our side. Please try again in a minute.', invalid: false };
        console.error('Guide signup failed', res.status, data);
      }
    } catch (err) {
      console.error('Guide signup failed', err);
      failure = { message: 'Could not reach the server. Check your connection and try again.', invalid: false };
    }
    if (failure) {
      showError(input, failure.message, failure.invalid);
      btn.disabled = false;
      btn.replaceChildren(...label);
      return;
    }
    form.hidden = true;
    $('#guide-success').classList.remove('is-hidden');
    $('#guide-success').focus();
    track('guide_signup');
    clarityTag('lead', 'true');
  });
}
