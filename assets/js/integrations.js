// The integration catalog: data only. Each source carries the reason it is needed.
// Source lists follow each vendor's CSP documentation (see `docs`).

export const CATEGORIES = [
  { id: 'payments', label: 'Payments' },
  { id: 'analytics', label: 'Analytics and ads' },
  { id: 'chat', label: 'Chat and support' },
  { id: 'media', label: 'Maps and media' },
  { id: 'realtime', label: 'Realtime' },
  { id: 'cdn', label: 'CDNs and fonts' },
  { id: 'bot', label: 'Bot protection' },
  { id: 'errors', label: 'Error tracking' },
];

const each = (hosts, reason) => hosts.map(h => [h, reason]);

export const INTEGRATIONS = [
  {
    id: 'stripe', name: 'Stripe', category: 'payments',
    docs: 'https://docs.stripe.com/security/guide#content-security-policy',
    sources: {
      script: [...each(['https://js.stripe.com', 'https://*.js.stripe.com'], 'Stripe.js'), ['https://maps.googleapis.com', 'Address Element autocomplete']],
      frame: [...each(['https://js.stripe.com', 'https://*.js.stripe.com'], 'Payment Element and Checkout iframes'), ['https://hooks.stripe.com', '3D Secure authentication']],
      connect: [['https://api.stripe.com', 'Stripe API calls from Stripe.js'], ['https://maps.googleapis.com', 'Address Element autocomplete']],
      img: [['https://*.stripe.com', 'Card brand and wallet images']],
    },
  },
  {
    id: 'paypal', name: 'PayPal', category: 'payments',
    docs: 'https://developer.paypal.com/sdk/js/csp/',
    sources: {
      script: [['https://*.paypal.com', 'PayPal JS SDK'], ['https://*.paypalobjects.com', 'PayPal SDK assets'], ['https://*.venmo.com', 'Venmo button']],
      style: [['https://*.paypal.com', 'PayPal button styles'], ['https://*.paypalobjects.com', 'PayPal SDK styles'], ['https://*.venmo.com', 'Venmo button styles']],
      frame: [['https://*.paypal.com', 'PayPal buttons and checkout window'], ['https://*.paypalobjects.com', 'PayPal SDK frames'], ['https://*.venmo.com', 'Venmo checkout']],
      connect: [['https://*.paypal.com', 'PayPal API calls'], ['https://*.paypalobjects.com', 'PayPal SDK assets'], ['https://*.venmo.com', 'Venmo API calls']],
      img: [['https://*.paypal.com', 'PayPal button images'], ['https://*.paypalobjects.com', 'PayPal logos'], ['https://*.venmo.com', 'Venmo logos']],
    },
    note: 'Pass the nonce to the SDK script tag with both nonce="{{ $cspNonce }}" and data-csp-nonce="{{ $cspNonce }}".',
  },
  {
    id: 'ga4', name: 'Google Analytics 4', category: 'analytics',
    docs: 'https://developers.google.com/tag-platform/security/guides/csp',
    sources: {
      script: [['https://www.googletagmanager.com', 'gtag.js']],
      img: each(['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'], 'GA4 collection pixels'),
      connect: each(['https://*.google-analytics.com', 'https://*.analytics.google.com', 'https://*.googletagmanager.com'], 'GA4 collection requests'),
    },
  },
  {
    id: 'gtm', name: 'Google Tag Manager', category: 'analytics',
    docs: 'https://developers.google.com/tag-platform/security/guides/csp',
    sources: {
      script: [['https://www.googletagmanager.com', 'gtm.js container']],
      img: [['https://www.googletagmanager.com', 'GTM preview and noscript pixel']],
      connect: [['https://www.googletagmanager.com', 'Container requests'], ['https://www.google.com', 'Google tag requests']],
    },
    note: 'Custom HTML tags need the nonce (enable nonce-aware GTM). Custom JavaScript variables need \'unsafe-eval\': avoid them. Preview mode also needs tagmanager.google.com.',
  },
  {
    id: 'google-ads', name: 'Google Ads', category: 'analytics',
    docs: 'https://developers.google.com/tag-platform/security/guides/csp',
    sources: {
      script: [['https://www.googletagmanager.com', 'Google tag'], ['https://www.googleadservices.com', 'Conversion tracking'], ['https://www.google.com', 'Conversion linker']],
      img: [...each(['https://www.googletagmanager.com', 'https://www.googleadservices.com', 'https://www.google.com'], 'Conversion pixels'), ...each(['https://googleads.g.doubleclick.net', 'https://pagead2.googlesyndication.com'], 'Remarketing pixels')],
      connect: [...each(['https://www.googletagmanager.com', 'https://www.googleadservices.com', 'https://www.google.com'], 'Conversion requests'), ...each(['https://googleads.g.doubleclick.net', 'https://pagead2.googlesyndication.com', 'https://ad.doubleclick.net'], 'Remarketing requests')],
      frame: [['https://www.googletagmanager.com', 'Google tag iframe']],
    },
    note: 'Google Ads also pings your visitor\'s country domain (for example www.google.co.uk). Add those under Advanced if reports show them.',
  },
  {
    id: 'meta-pixel', name: 'Meta Pixel', category: 'analytics',
    docs: 'https://developers.facebook.com/docs/meta-pixel/advanced/',
    sources: {
      script: [['https://connect.facebook.net', 'fbevents.js']],
      img: [['https://www.facebook.com', 'Pixel events']],
      connect: [['https://www.facebook.com', 'Pixel events']],
      frame: [['https://www.facebook.com', 'Pixel helper iframe']],
    },
  },
  {
    id: 'microsoft-uet', name: 'Microsoft Advertising (UET)', category: 'analytics',
    docs: 'https://help.ads.microsoft.com/#apex/ads/en/56686/2',
    sources: {
      script: [['https://bat.bing.com', 'UET tag']],
      img: [['https://bat.bing.com', 'UET events'], ['https://c.bing.com', 'UET user sync']],
      connect: [['https://bat.bing.com', 'UET events'], ['https://c.bing.com', 'UET user sync']],
    },
  },
  {
    id: 'clarity', name: 'Microsoft Clarity', category: 'analytics',
    docs: 'https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-csp',
    sources: {
      script: [['https://www.clarity.ms', 'Clarity tag'], ['https://*.clarity.ms', 'Clarity script']],
      connect: [['https://*.clarity.ms', 'Session data upload'], ['https://c.bing.com', 'Clarity user sync']],
      img: [['https://*.clarity.ms', 'Clarity pixels'], ['https://c.bing.com', 'Clarity user sync']],
    },
  },
  {
    id: 'hotjar', name: 'Hotjar', category: 'analytics',
    docs: 'https://help.hotjar.com/hc/en-us/articles/36820026388881',
    sources: {
      script: [['https://static.hotjar.com', 'Hotjar tracking code'], ['https://script.hotjar.com', 'Hotjar modules']],
      img: [['https://static.hotjar.com', 'Widget images'], ['https://script.hotjar.com', 'Widget images'], ['https://survey-images.hotjar.com', 'Survey images']],
      font: [['https://script.hotjar.com', 'Widget fonts']],
      frame: [['https://vars.hotjar.com', 'Cross-domain tracking iframe']],
      connect: [['https://*.hotjar.com', 'Session data'], ['https://*.hotjar.io', 'Session data'], ['wss://*.hotjar.com', 'Live session stream']],
    },
  },
  {
    id: 'plausible', name: 'Plausible', category: 'analytics',
    docs: 'https://plausible.io/docs/troubleshoot-integration',
    sources: {
      script: [['https://plausible.io', 'Plausible script']],
      connect: [['https://plausible.io', 'Pageview events']],
    },
  },
  {
    id: 'fathom', name: 'Fathom', category: 'analytics',
    docs: 'https://usefathom.com/docs/troubleshooting/csp',
    sources: {
      script: [['https://cdn.usefathom.com', 'Fathom script']],
      img: [['https://cdn.usefathom.com', 'Pageview pixel']],
      connect: [['https://cdn.usefathom.com', 'Pageview events']],
    },
  },
  {
    id: 'tawk', name: 'Tawk.to', category: 'chat',
    docs: 'https://help.tawk.to/article/why-are-images-not-showing-up-in-the-widget',
    sources: {
      script: [['https://*.tawk.to', 'Chat widget'], ['https://cdn.jsdelivr.net', 'Widget libraries']],
      style: [['https://*.tawk.to', 'Chat widget styles'], ['https://fonts.googleapis.com', 'Widget font styles'], ['https://cdn.jsdelivr.net', 'Widget library styles']],
      font: [['https://*.tawk.to', 'Chat widget fonts'], ['https://fonts.gstatic.com', 'Widget fonts']],
      img: [['https://*.tawk.to', 'Agent avatars and attachments'], ['https://tawk.link', 'Shared file previews'], ['https://cdn.jsdelivr.net', 'Emoji images'], ['https://s3.amazonaws.com', 'Uploaded files']],
      media: [['https://*.tawk.to', 'Notification sounds']],
      frame: [['https://*.tawk.to', 'Chat window']],
      connect: [['https://*.tawk.to', 'Chat API'], ['wss://*.tawk.to', 'Live chat connection']],
      form: [['https://*.tawk.to', 'Offline message form']],
    },
  },
  {
    id: 'crisp', name: 'Crisp', category: 'chat',
    docs: 'https://docs.crisp.chat/guides/others/whitelisting-our-systems/crisp-domain-names/',
    sources: {
      script: [['https://*.crisp.chat', 'Chat widget']],
      style: [['https://*.crisp.chat', 'Chat widget styles']],
      font: [['https://*.crisp.chat', 'Chat widget fonts']],
      img: [['https://*.crisp.chat', 'Avatars and attachments']],
      media: [['https://*.crisp.chat', 'Notification sounds']],
      frame: [['https://*.crisp.chat', 'Chat frames'], ['https://*.crisp.help', 'Helpdesk articles']],
      connect: [['https://*.crisp.chat', 'Chat API and uploads'], ['wss://*.relay.crisp.chat', 'Live chat connection'], ['wss://*.relay.rescue.crisp.chat', 'Fallback chat connection']],
      worker: [['https://*.crisp.chat', 'Background workers']],
    },
    needs: { inlineStyleAttrs: 'The chatbox sets its color theme with inline styles', workerBlob: 'Runs background checks in blob: workers' },
  },
  {
    id: 'intercom', name: 'Intercom', category: 'chat',
    docs: 'https://www.intercom.com/help/en/articles/3894-using-intercom-with-content-security-policy',
    sources: {
      script: [['https://app.intercom.io', 'Messenger settings'], ['https://widget.intercom.io', 'Messenger loader'], ['https://js.intercomcdn.com', 'Messenger bundle']],
      connect: [
        ['https://*.intercom.io', 'Messenger API'], ['wss://*.intercom.io', 'Live messenger connection'],
        ['https://*.intercom-messenger.com', 'Messenger API'], ['wss://*.intercom-messenger.com', 'Live messenger connection'],
        ['https://uploads.intercomcdn.com', 'File uploads'], ['https://uploads.intercomusercontent.com', 'File uploads'],
      ],
      img: [['blob:', 'Uploaded image previews'], ['https://*.intercomcdn.com', 'Messenger images and GIFs'], ['https://static.intercomassets.com', 'Avatars'], ['https://uploads.intercomusercontent.com', 'Attachments'], ['https://messenger-apps.intercom.io', 'Messenger app images']],
      font: [['https://js.intercomcdn.com', 'Messenger fonts'], ['https://fonts.intercomcdn.com', 'Messenger fonts']],
      media: [['https://js.intercomcdn.com', 'Notification sounds'], ['https://downloads.intercomcdn.com', 'Video messages']],
      frame: [['https://intercom-sheets.com', 'Messenger apps'], ['https://www.intercom-reporting.com', 'Messenger reporting'], ['https://www.youtube.com', 'Videos in articles'], ['https://player.vimeo.com', 'Videos in articles'], ['https://fast.wistia.net', 'Videos in articles']],
      form: [['https://intercom.help', 'Help center search'], ['https://api-iam.intercom.io', 'Messenger forms']],
    },
    needs: { inlineStyleAttrs: 'The Messenger positions and themes itself with inline styles' },
    note: 'Attachments are served from *.intercom-attachments-1.com to -9.com, and EU and Australian workspaces use their own API hosts. Add them under Advanced if reports show them.',
  },
  {
    id: 'google-maps', name: 'Google Maps', category: 'media',
    docs: 'https://developers.google.com/maps/documentation/javascript/content-security-policy',
    sources: {
      script: each(['https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com', 'https://*.ggpht.com', 'https://*.googleusercontent.com'], 'Maps JavaScript API'),
      img: [...each(['https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'], 'Map tiles and markers'), ...each(['https://*.ggpht.com', 'https://*.googleusercontent.com'], 'Street View and place photos')],
      connect: [...each(['https://*.googleapis.com', 'https://*.gstatic.com', 'https://*.google.com'], 'Maps API requests'), ['data:', 'Inline map data'], ['blob:', 'Vector map tiles']],
      frame: [['https://*.google.com', 'Map embeds']],
      font: [['https://fonts.gstatic.com', 'Map label fonts']],
      style: [['https://fonts.googleapis.com', 'Map label font styles']],
    },
    needs: { unsafeEval: 'Google\'s published Maps policy includes \'unsafe-eval\'', workerBlob: 'Renders vector maps in a blob: worker' },
  },
  {
    id: 'youtube', name: 'YouTube', category: 'media',
    docs: 'https://developers.google.com/youtube/player_parameters',
    sources: {
      frame: [['https://www.youtube-nocookie.com', 'Privacy-enhanced embeds'], ['https://www.youtube.com', 'Video embeds']],
      img: [['https://i.ytimg.com', 'Video thumbnails']],
    },
  },
  {
    id: 'vimeo', name: 'Vimeo', category: 'media',
    docs: 'https://help.vimeo.com/hc/en-us/articles/12426260232977',
    sources: {
      frame: [['https://player.vimeo.com', 'Video embeds']],
      img: [['https://i.vimeocdn.com', 'Video thumbnails']],
    },
  },
  {
    id: 'pusher', name: 'Pusher or Laravel Reverb', category: 'realtime',
    docs: 'https://bird.com/docs/pusher/connecting/what-content-security-policy-csp-do-i-need-for-channels',
    sources: {
      script: [['https://js.pusher.com', 'pusher-js from the Pusher CDN']],
      connect: [['https://*.pusher.com', 'Pusher HTTP fallback and stats'], ['wss://*.pusher.com', 'Pusher WebSocket connection'], ['https://*.pusherapp.com', 'Pusher HTTP fallback (mt1 cluster)'], ['wss://*.pusherapp.com', 'Pusher WebSocket connection (mt1 cluster)']],
    },
    note: 'Laravel Reverb on another host needs its wss:// origin under Advanced, connect-src.',
  },
  {
    id: 'google-fonts', name: 'Google Fonts', category: 'cdn',
    docs: 'https://developers.google.com/fonts/docs/getting_started',
    sources: {
      style: [['https://fonts.googleapis.com', 'Font stylesheets']],
      font: [['https://fonts.gstatic.com', 'Font files']],
    },
  },
  {
    id: 'bunny-fonts', name: 'Bunny Fonts', category: 'cdn',
    docs: 'https://fonts.bunny.net/about',
    sources: {
      style: [['https://fonts.bunny.net', 'Font stylesheets']],
      font: [['https://fonts.bunny.net', 'Font files']],
    },
  },
  {
    id: 'jsdelivr', name: 'jsDelivr', category: 'cdn',
    docs: 'https://www.jsdelivr.com/documentation',
    sources: {
      script: [['https://cdn.jsdelivr.net', 'Scripts from jsDelivr']],
      style: [['https://cdn.jsdelivr.net', 'Stylesheets from jsDelivr']],
    },
    note: 'Serves any npm package, so an attacker can load a script gadget from it. Pin versions and add integrity hashes.',
  },
  {
    id: 'cdnjs', name: 'cdnjs', category: 'cdn',
    docs: 'https://cdnjs.com/about',
    sources: {
      script: [['https://cdnjs.cloudflare.com', 'Scripts from cdnjs']],
      style: [['https://cdnjs.cloudflare.com', 'Stylesheets from cdnjs']],
      font: [['https://cdnjs.cloudflare.com', 'Icon fonts from cdnjs']],
      img: [['https://cdnjs.cloudflare.com', 'Images from cdnjs']],
    },
    note: 'Hosts libraries with known CSP bypasses (old AngularJS). Pin versions and add integrity hashes.',
  },
  {
    id: 'unpkg', name: 'unpkg', category: 'cdn',
    docs: 'https://unpkg.com',
    sources: {
      script: [['https://unpkg.com', 'Scripts from unpkg']],
      style: [['https://unpkg.com', 'Stylesheets from unpkg']],
    },
    note: 'Serves any npm package, so an attacker can load a script gadget from it. Pin versions and add integrity hashes.',
  },
  {
    id: 'recaptcha', name: 'reCAPTCHA', category: 'bot',
    docs: 'https://developers.google.com/recaptcha/docs/faq#im-using-content-security-policy-csp-on-my-website.-how-can-i-configure-it-to-work-with-recaptcha',
    sources: {
      script: [['https://www.google.com', 'reCAPTCHA API'], ['https://www.gstatic.com', 'reCAPTCHA scripts']],
      frame: [['https://www.google.com', 'reCAPTCHA challenge'], ['https://recaptcha.google.com', 'reCAPTCHA challenge']],
      connect: [['https://www.google.com', 'reCAPTCHA verification']],
    },
  },
  {
    id: 'turnstile', name: 'Cloudflare Turnstile', category: 'bot',
    docs: 'https://developers.cloudflare.com/turnstile/reference/content-security-policy/',
    sources: {
      script: [['https://challenges.cloudflare.com', 'Turnstile script']],
      frame: [['https://challenges.cloudflare.com', 'Turnstile widget']],
    },
  },
  {
    id: 'hcaptcha', name: 'hCaptcha', category: 'bot',
    docs: 'https://docs.hcaptcha.com/#content-security-policy-settings',
    sources: {
      script: each(['https://hcaptcha.com', 'https://*.hcaptcha.com'], 'hCaptcha script'),
      frame: each(['https://hcaptcha.com', 'https://*.hcaptcha.com'], 'hCaptcha challenge'),
      style: each(['https://hcaptcha.com', 'https://*.hcaptcha.com'], 'hCaptcha styles'),
      connect: each(['https://hcaptcha.com', 'https://*.hcaptcha.com'], 'hCaptcha verification'),
    },
  },
  {
    id: 'sentry', name: 'Sentry', category: 'errors',
    docs: 'https://docs.sentry.io/platforms/javascript/install/loader/#content-security-policy',
    sources: {
      script: [['https://js.sentry-cdn.com', 'Sentry Loader Script'], ['https://browser.sentry-cdn.com', 'Sentry SDK bundle']],
      connect: [['https://*.sentry.io', 'Error and replay upload']],
    },
    needs: { workerBlob: 'Session Replay compresses recordings in a blob: worker' },
  },
];

export const INTEGRATION_BY_ID = Object.fromEntries(INTEGRATIONS.map(i => [i.id, i]));

export const STACK = [
  { id: 'vite', name: 'Vite', desc: 'Local output allows the dev server and its HMR WebSocket' },
  { id: 'livewire', name: 'Livewire 3', desc: 'Nonce on Livewire scripts', needs: { unsafeEval: 'Bundles Alpine, whose standard build evaluates expressions with new Function()' } },
  { id: 'inertia', name: 'Inertia (Ziggy)', desc: 'Nonce on the @routes script' },
  { id: 'alpine', name: 'Alpine.js', desc: 'The standard build needs \'unsafe-eval\'', needs: { unsafeEval: 'The standard build evaluates expressions with new Function()' } },
  { id: 'alpineCsp', name: 'Alpine CSP build', desc: 'Uses @alpinejs/csp, so no \'unsafe-eval\'' },
  { id: 'filament', name: 'Filament', desc: 'Admin panel built on Livewire and Alpine', needs: { unsafeEval: 'Runs on Livewire and the standard Alpine build', inlineStyleAttrs: 'Livewire, Alpine and TipTap set inline styles', workerBlob: 'File uploads create blob: workers' }, sources: { img: [['blob:', 'File upload previews']] } },
  { id: 'debugbar', name: 'Laravel Debugbar', desc: 'Local only. Picks up the Vite nonce from v4.3', localOnly: true },
  { id: 'telescope', name: 'Telescope', desc: 'Skips the CSP on /telescope' },
  { id: 'horizon', name: 'Horizon', desc: 'Skips the CSP on /horizon' },
  { id: 'pulse', name: 'Pulse', desc: 'Skips the CSP on /pulse' },
];

export const HOSTING = [
  {
    id: 'cloudflare', name: 'Cloudflare', desc: 'Web Analytics beacon, Rocket Loader and email obfuscation warnings',
    sources: { script: [['https://static.cloudflareinsights.com', 'Web Analytics beacon']], connect: [['https://cloudflareinsights.com', 'Web Analytics events']] },
  },
  { id: 'hostinger', name: 'Hostinger', desc: 'Warns about the extra CSP header its CDN adds' },
  { id: 'nginxProxy', name: 'Behind an nginx proxy', desc: 'Warns when the header outgrows the default proxy buffer' },
];
