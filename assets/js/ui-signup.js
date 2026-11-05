// The PDF guide signup. Without scripts the form posts to save-email.php as plain HTML.
import { track, clarityTag } from './analytics.js';
import { $ } from './dom.js';
import { emailError } from './signup.js';

function showError(input, message) {
  $('#g-error').textContent = message;
  if (message) input.setAttribute('aria-invalid', 'true');
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
    try {
      const res = await fetch('/save-email.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: input.value.trim(), pot: $('#g-pot').value, ts: startedAt }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `The server answered ${res.status}.`);
    } catch (err) {
      console.error('Guide signup failed', err);
      const message = err instanceof TypeError ? 'Could not reach the server. Check your connection and try again.' : err.message;
      showError(input, message.startsWith('The server answered') ? 'Something went wrong on our side. Please try again in a minute.' : message);
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
