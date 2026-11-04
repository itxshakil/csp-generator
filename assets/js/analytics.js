// GA4 and Microsoft Clarity loaders, moved out of inline scripts so the site's CSP needs no 'unsafe-inline'.

const GA_ID = 'G-E8LV1M7ZXS';
const CLARITY_ID = 'wnwlwuuhc3';

function loadScript(src) {
  const el = document.createElement('script');
  el.async = true;
  el.src = src;
  document.head.appendChild(el);
}

window.dataLayer = window.dataLayer || [];
window.gtag = function gtag() { window.dataLayer.push(arguments); };
window.gtag('js', new Date());
window.gtag('config', GA_ID);
loadScript(`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`);

window.clarity = window.clarity || function clarity() { (window.clarity.q = window.clarity.q || []).push(arguments); };
loadScript(`https://www.clarity.ms/tag/${CLARITY_ID}`);

export function track(event, params = {}) {
  window.gtag('event', event, params);
  window.clarity('event', event);
}

export function clarityTag(key, value) {
  window.clarity('set', key, value);
}
