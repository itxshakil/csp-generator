// The icons the scripts render, the same shapes as lib/icons.php. Constant markup, never built from input.
const SHAPES = {
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
};

export function iconSvg(name, cls = 'icon') {
  if (!SHAPES[name]) throw new Error(`Unknown icon: ${name}`);
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${SHAPES[name]}</svg>`;
}

// A parsed copy of the icon, for code that builds nodes rather than HTML strings.
export function iconNode(name, cls = 'icon') {
  const t = document.createElement('template');
  t.innerHTML = iconSvg(name, cls);
  return t.content.firstChild;
}
