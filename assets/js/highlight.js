// Syntax highlighting for a policy. Built from directives, never by regex over the string,
// so highlighting can never alter the text, and each source carries its reasons for the tooltip.

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
// `added` holds "<directive> <source>" keys to highlight as just added.
export function highlightDirectives(directives, added = new Set()) {
  return directives.map(d => {
    const name = `<span class="sk">${escapeHtml(d.name)}</span>`;
    const sources = d.sources.map(s => {
      const reasons = d.reasons[s] ?? [];
      const tip = reasons.length ? ` tabindex="0" data-tip="${escapeHtml(reasons.join('\n'))}"` : '';
      const cls = added.has(`${d.name} ${s}`) ? `${sourceClass(s)} src-added` : sourceClass(s);
      return `<span class="${cls}"${tip}>${escapeHtml(s)}</span>`;
    });
    return [name, ...sources].join(' ');
  }).join('; ');
}
