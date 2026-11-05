// Tiny DOM helpers shared by the UI modules. Text always goes in as text nodes, never as HTML.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') node.className = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  node.append(...children.flat().filter(c => c !== null && c !== undefined && c !== false));
  return node;
}

// Replaces a list's children and marks the items that were not there before with `is-new`, so CSS can animate
// only real additions. The first render of a list marks nothing.
export function replaceKeyed(container, nodes, keyOf) {
  const before = container.dataset.keyed ? new Set([...container.children].map(keyOf)) : null;
  if (before) nodes.filter(n => !before.has(keyOf(n))).forEach(n => n.classList.add('is-new'));
  container.replaceChildren(...nodes);
  container.dataset.keyed = 'true';
}
