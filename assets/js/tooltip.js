// Source reasons in a tooltip, on hover, focus and tap. One shared popover; the reasons also stay in the
// "Why each source" list, so nothing depends on this working.

const EDGE = 8;

// Fallback placement for browsers without CSS anchor positioning: centred below the trigger, kept on screen,
// and flipped above it when there is no room below.
export function placeBelow(trigger, tip, viewport, gap = 6) {
  const centred = trigger.left + trigger.width / 2 - tip.width / 2;
  const left = Math.max(EDGE, Math.min(centred, viewport.width - tip.width - EDGE));
  const below = trigger.bottom + gap;
  const top = below + tip.height > viewport.height - EDGE ? trigger.top - tip.height - gap : below;
  return { top: Math.max(EDGE, top), left };
}

export function initTooltips(root, tip) {
  if (typeof tip.showPopover !== 'function') return;
  const anchored = CSS.supports('position-area: bottom');
  let current = null;

  const hide = () => {
    if (!current) return;
    current.removeAttribute('aria-describedby');
    current.style.removeProperty('anchor-name');
    current = null;
    if (tip.matches(':popover-open')) tip.hidePopover();
  };

  const show = trigger => {
    if (current === trigger) return;
    hide();
    current = trigger;
    tip.textContent = trigger.dataset.tip;
    trigger.setAttribute('aria-describedby', tip.id);
    if (anchored) trigger.style.setProperty('anchor-name', '--src');
    tip.showPopover();
    place();
  };

  const viewport = () => ({ width: document.documentElement.clientWidth, height: document.documentElement.clientHeight });
  // Anchored tooltips follow their source by themselves; the fallback is placed again.
  const place = () => {
    if (anchored || !current) return;
    const { top, left } = placeBelow(current.getBoundingClientRect(), tip.getBoundingClientRect(), viewport());
    tip.style.top = `${top}px`;
    tip.style.left = `${left}px`;
  };
  // Scrolling keeps the tooltip while its source is visible, and closes it once the source leaves the screen
  // or is scrolled out of the output panel.
  const onScroll = () => {
    if (!current) return;
    const r = current.getBoundingClientRect();
    const view = viewport();
    const box = root.getBoundingClientRect();
    const top = Math.max(0, box.top);
    const bottom = Math.min(view.height, box.bottom);
    if (r.bottom < top || r.top > bottom || r.right < 0 || r.left > view.width) hide();
    else place();
  };

  const triggerOf = e => e.target.closest?.('[data-tip]');
  root.addEventListener('pointerover', e => { const t = triggerOf(e); if (t && e.pointerType === 'mouse') show(t); });
  root.addEventListener('pointerout', e => {
    if (e.pointerType === 'mouse' && current && !current.contains(e.relatedTarget)) hide();
  });
  root.addEventListener('focusin', e => { const t = triggerOf(e); if (t) show(t); });
  root.addEventListener('focusout', e => { if (triggerOf(e) === current) hide(); });
  // A tap shows the reasons; a second tap on the same source hides them. The tap also focuses the source,
  // so the state is read at pointerdown, before focus opens the tooltip. WebKit reports a tap's click as a
  // mouse click, so the pointer type comes from pointerdown too.
  let press = null;
  document.addEventListener('pointerdown', e => {
    const t = triggerOf(e);
    press = t ? { t, wasOpen: t === current, touch: e.pointerType !== 'mouse' } : null;
    if (current && !t) hide();
  });
  root.addEventListener('click', e => {
    const t = triggerOf(e);
    if (!t) return;
    if (press?.t === t && press.touch && press.wasOpen) hide();
    else show(t);
    press = null;
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') hide(); });
  addEventListener('scroll', onScroll, { passive: true, capture: true });
  // The output re-renders on every change, which removes the trigger.
  new MutationObserver(() => { if (current && !current.isConnected) hide(); }).observe(root, { childList: true });
}
