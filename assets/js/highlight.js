// Syntax highlighting for a policy. Built from directives, never by regex over the string,
// so highlighting can never alter the text, and each source carries its reasons as a tooltip.

export function escapeHtml(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function sourceClass(source) {
  if (source === "'self'") return 'sv';
  if (source === "'none'" || source.startsWith("'unsafe-")) return 'sb';
  if (source.startsWith("'nonce-")) return 'sn';
  return 'su';
}

// innerText of the result equals policyString(directives).
export function highlightDirectives(directives) {
  return directives.map(d => {
    const name = `<span class="sk">${escapeHtml(d.name)}</span>`;
    const sources = d.sources.map(s => `<span class="${sourceClass(s)}" title="${escapeHtml((d.reasons[s] ?? []).join('\n'))}">${escapeHtml(s)}</span>`);
    return [name, ...sources].join(' ');
  }).join('; ');
}
