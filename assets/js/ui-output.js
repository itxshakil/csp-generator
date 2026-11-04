// Output panel. Task 7 interim: the production header only; the full tabs arrive in Task 8.
import { headerName } from './policy.js';
import { headerValue } from './formats.js';
import { escapeHtml, highlightPolicy } from './highlight.js';

export function initOutput(store) {
  const body = document.querySelector('#out-body');
  store.onChange(() => {
    const s = store.state;
    body.innerHTML = `<div class="code-block"><div class="code-hdr"><span class="code-title">${escapeHtml(headerName(s))}</span></div><pre id="pre-hdr">${highlightPolicy(headerValue(s))}</pre></div>`;
  });
}
