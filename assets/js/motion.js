// Motion helpers. Every animation is an enhancement: without support, or with reduced motion, changes apply at once.

export function prefersReducedMotion(win = globalThis) {
  return Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
}

export function withTransition(update, doc = globalThis.document, win = globalThis) {
  if (typeof doc?.startViewTransition !== 'function' || prefersReducedMotion(win)) {
    update();
    return;
  }
  doc.startViewTransition(update);
}
