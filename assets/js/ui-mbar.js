// Narrow screens stack the output below a long config panel. While the config is on screen and the output
// is not, a bar at the bottom keeps the grade and size in view and jumps to the output.
import { $ } from './dom.js';
import { buildDirectives, headerBytes, sizeLevel, scorePolicy, grade, SIZE_CLASS } from './policy.js';

export function initMobileBar(store) {
  const bar = $('#mbar');
  const narrow = matchMedia('(max-width: 900px)');
  let configVisible = false;
  let outputVisible = false;

  const fill = () => {
    const dirs = buildDirectives(store.state, 'production');
    const g = grade(scorePolicy(store.state, dirs).score);
    const bytes = headerBytes(store.state, 'production', dirs);
    const gradeEl = $('.mbar-grade', bar);
    gradeEl.className = `mbar-grade score-chip ${g.cls}`;
    gradeEl.textContent = `Grade ${g.label}`;
    const sizeEl = $('.mbar-size', bar);
    sizeEl.className = `mbar-size score-chip ${SIZE_CLASS[sizeLevel(bytes)]}`;
    sizeEl.textContent = `${bytes.toLocaleString('en')} bytes`;
  };
  // Filled only while visible: on desktop, or with the output on screen, it is never seen.
  const sync = () => {
    const show = narrow.matches && configVisible && !outputVisible;
    if (show && bar.hidden) fill();
    bar.hidden = !show;
    document.body.classList.toggle('has-mbar', !bar.hidden);
  };

  new IntersectionObserver(entries => {
    configVisible = entries.at(-1).isIntersecting;
    sync();
  }).observe($('.config'));
  // The output counts as visible once its top quarter is on screen.
  new IntersectionObserver(entries => {
    outputVisible = entries.at(-1).isIntersecting;
    sync();
  }, { rootMargin: '0px 0px -25% 0px' }).observe($('.output'));
  narrow.addEventListener('change', sync);

  $('.mbar-jump', bar).addEventListener('click', e => {
    e.preventDefault();
    $('.output').scrollIntoView({ block: 'start' });
    $('#out-body').focus({ preventScroll: true });
  });
  store.onChange(() => { if (!bar.hidden) fill(); });
}
