// Syntax highlighting for a CSP string. Tokenizes instead of chaining regex replacements,
// so highlighting can never alter the text that gets copied.

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function sourceClass(token) {
  if (token === "'self'") return 'sv';
  if (token === "'none'") return 'sb';
  if (token.startsWith("'nonce-")) return 'sn';
  if (/^(https?|wss?):\/\//.test(token) || token.startsWith('/')) return 'su';
  return '';
}

const span = (cls, token) => (cls ? `<span class="${cls}">${escapeHtml(token)}</span>` : escapeHtml(token));

export function highlightPolicy(policy) {
  return policy.split('; ').map(directive => {
    const [name, ...sources] = directive.split(' ');
    return [span('sk', name), ...sources.map(s => span(sourceClass(s), s))].join(' ');
  }).join('; ');
}
