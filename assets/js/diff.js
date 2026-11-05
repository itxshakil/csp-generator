// What the last change did to the policy, so the Header tab can point at it.

const keysOf = directives => new Set(directives.flatMap(d => d.sources.filter(s => !s.startsWith("'nonce-")).map(s => `${d.name} ${s}`)));

// Keys are "<directive> <source>". A first render (prev is null) has nothing to show.
export function sourceDiff(prev, next) {
  if (!prev) return { added: new Set(), removed: [] };
  const before = keysOf(prev);
  const after = keysOf(next);
  return {
    added: new Set([...after].filter(k => !before.has(k))),
    removed: [...before].filter(k => !after.has(k)),
  };
}

const MAX_NAMED = 5;

export function removedNote(removed) {
  const sources = [...new Set(removed.map(k => k.slice(k.indexOf(' ') + 1)))];
  if (!sources.length) return '';
  const named = sources.slice(0, MAX_NAMED).join(', ');
  const rest = sources.length - MAX_NAMED;
  return `Removed: ${named}${rest > 0 ? ` and ${rest} more` : ''}`;
}
