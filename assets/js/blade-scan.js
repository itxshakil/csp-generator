// Finds inline code a nonce-based CSP will block. Text in, findings out: nothing is parsed into a DOM or run.

const TAG = /<([a-zA-Z][\w:.-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*\/?>/g;
const ATTR = /([^\s=>/]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s>]+))?/g;
const COMMENTS = /\{\{--[\s\S]*?--\}\}|<!--[\s\S]*?-->/g;
// Script types the browser executes, so they need the nonce. Data blocks such as application/ld+json do not run.
const EXECUTABLE = new Set(['', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript', 'module', 'importmap']);
const URL_ATTRS = new Set(['href', 'src', 'action', 'formaction']);

const FIX = {
  'inline-script': 'Add nonce="{{ $cspNonce }}" to the <script> tag, or move the code into a file loaded with @vite.',
  'inline-style': 'Add nonce="{{ $cspNonce }}" to the <style> tag, or move the CSS into your stylesheet.',
  handler: 'Move the handler into a script file and attach it with addEventListener (or use Alpine\'s x-on / @click).',
  'style-attr': 'Replace the style="" attribute with a CSS class. Dynamic values can be set from JavaScript through element.style.',
  'js-url': 'Replace the javascript: URL with a real link or a button that has a listener attached with addEventListener.',
};

const unquote = v => (v ?? '').replace(/^(["'])([\s\S]*)\1$/, '$2');

// Blanks out comments but keeps their newlines, so offsets and line numbers stay right.
const blankComments = text => text.replace(COMMENTS, m => m.replace(/[^\n]/g, ' '));

export function scanBlade(text, file = 'template.blade.php') {
  const source = String(text ?? '');
  const lines = source.split('\n');
  const scrubbed = blankComments(source);
  const findings = [];
  const lineAt = index => source.slice(0, index).split('\n').length;

  for (const tag of scrubbed.matchAll(TAG)) {
    const name = tag[1].toLowerCase();
    const attrs = [...(tag[2] ?? '').matchAll(ATTR)].map(a => [a[1].toLowerCase(), unquote(a[2])]);
    const has = key => attrs.some(([k]) => k === key);
    const line = lineAt(tag.index);
    const add = kind => findings.push({ file, line, kind, snippet: lines[line - 1].trim().slice(0, 120), fix: FIX[kind] });

    if (name === 'script' && !has('src') && !has('nonce')) {
      const type = (attrs.find(([k]) => k === 'type')?.[1] ?? '').trim().toLowerCase();
      if (EXECUTABLE.has(type)) add('inline-script');
    }
    if (name === 'style' && !has('nonce')) add('inline-style');
    for (const [key, value] of attrs) {
      if (/^on[a-z]+$/.test(key)) add('handler');
      else if (key === 'style') add('style-attr');
      else if (URL_ATTRS.has(key) && /^\s*javascript:/i.test(value)) add('js-url');
    }
  }
  return findings;
}
