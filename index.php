<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/site-headers.php';
require_once __DIR__ . '/lib/faq.php';
require_once __DIR__ . '/lib/icons.php';
require_once __DIR__ . '/lib/assets.php';

$nonce = site_nonce();
send_site_headers($nonce, request_origin());
$n = htmlspecialchars($nonce, ENT_QUOTES);
$faq = faq_items();
?>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laravel CSP Generator - Free Content Security Policy Builder</title>
<meta name="description" content="Generate a production-ready Content Security Policy for your Laravel app from the services you use: Stripe, GA4, Intercom, Sentry and more. Nonce-based, explained, free.">
<link rel="canonical" href="https://csp-generator.shakiltech.com">
<meta property="og:title" content="Laravel CSP Generator">
<meta property="og:description" content="Generate a production-ready CSP for your Laravel app from the services you use. Nonce-based, explained, free.">
<meta property="og:url" content="https://csp-generator.shakiltech.com">
<meta name="twitter:card" content="summary_large_image">
<!-- Open Graph - complete set -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="CSP Generator by Shakil">
<meta property="og:image"       content="https://csp-generator.shakiltech.com/favicon.svg">
<meta property="og:image:alt"   content="Laravel CSP Generator - Free Content Security Policy Builder">
<!-- Twitter card - complete set -->
<meta name="twitter:title"       content="Laravel CSP Generator - Free CSP Builder">
<meta name="twitter:description" content="Generate a production-ready CSP for your Laravel app from the services you use. Nonce-based, explained, free.">
<meta name="twitter:image"       content="https://csp-generator.shakiltech.com/favicon.svg">
<meta name="twitter:image:alt"   content="Laravel CSP Generator">
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/favicon.svg">
<!-- PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="mobile-web-app-capable"               content="yes">
<meta name="apple-mobile-web-app-capable"         content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title"           content="CSP Generator">
<meta name="author"  content="Shakil Alam">
<meta name="creator" content="ShakilTech">
<!-- theme-color: dual light/dark -->
<meta name="theme-color" content="#F8F7F4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#18151F"  media="(prefers-color-scheme: dark)">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Laravel CSP Generator","url":"https://csp-generator.shakiltech.com","description":"Free tool to generate production-ready Content Security Policy for Laravel","applicationCategory":"DeveloperApplication","operatingSystem":"Any","featureList":["Nonce-based CSP","27 third-party integrations","Production and local policies from one config","Explained policy score","Header size meter","Laravel middleware, spatie preset, nginx, Apache and meta tag output","Violation reporting","Import an existing header","Violation explainer","Blade inline code scanner","Live header check"],"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"creator":{"@type":"Person","name":"Shakil","url":"https://blog.shakiltech.com"}}</script>
<script type="application/ld+json"><?= faq_jsonld($faq) ?></script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" nonce="<?= $n ?>" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
<link rel="stylesheet" nonce="<?= $n ?>" href="<?= asset_url('/assets/app.css') ?>">
<script type="importmap" nonce="<?= $n ?>"><?= import_map_json() ?></script>
<script type="module" nonce="<?= $n ?>" src="<?= asset_url('/assets/js/analytics.js') ?>"></script>
<script type="module" nonce="<?= $n ?>" src="<?= asset_url('/assets/js/ui.js') ?>"></script>
</head>
<body>

<nav>
  <a class="logo" href="https://csp-generator.shakiltech.com">
    <div class="logo-dot"></div>
    CSP Generator
  </a>
  <div class="nav-right">
    <a class="nav-link" href="https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel" target="_blank">Blog Post</a>
    <a class="nav-link" href="https://securityheaders.com" target="_blank">Test Headers</a>
  </div>
</nav>

<section class="hero">
  <h1>Generate a <em>Content Security Policy</em> for Laravel</h1>
  <p class="hero-sub">Pick the services your app uses and copy a nonce-based middleware. Runs in your browser, no signup.</p>
</section>

<div class="tool">

  <!-- CONFIG -->
  <div class="config">
    <div class="config-head">
      <span class="config-title">Configure</span>
      <div class="seg" role="radiogroup" aria-label="Preset" title="Presets set integrations, stack and reporting. Hosting, local and embedding settings stay. Reset clears everything.">
        <button type="button" role="radio" aria-checked="false" data-preset="strict" title="Nothing third-party. Best for new apps.">Strict</button>
        <button type="button" role="radio" aria-checked="false" data-preset="standard" title="Vite, Google Fonts and GA4.">Standard</button>
        <button type="button" role="radio" aria-checked="false" data-preset="rollout" title="Standard in report-only mode, to watch before enforcing.">Rollout</button>
      </div>
      <div class="config-actions">
        <button type="button" class="config-reset" data-action="tools" aria-haspopup="dialog">Tools</button>
        <button type="button" class="config-reset" data-action="reset"><?= icon('rotate-ccw') ?> Reset</button>
      </div>
    </div>

    <section class="cfg-section open" id="sec-integrations">
      <button type="button" class="cfg-section-head" data-section="integrations" aria-expanded="true" aria-controls="body-integrations">
        <span class="cfg-section-label"><?= icon('plug', 'icon cfg-icon') ?> Integrations <span class="cfg-count is-hidden" id="count-integrations"></span></span>
        <?= icon('chevron-down', 'icon cfg-chevron') ?>
      </button>
      <div class="cfg-body" id="body-integrations">
        <input class="text-inp search-inp" id="int-search" type="search" placeholder="Search integrations" aria-label="Search integrations" autocomplete="off" spellcheck="false">
        <div class="chips" id="int-chips" aria-label="Selected integrations"></div>
        <div id="int-list"></div>
        <p class="cfg-note" id="int-empty" hidden>No integration matches. Add its hosts under Advanced.</p>
      </div>
    </section>
    <section class="cfg-section open" id="sec-stack">
      <button type="button" class="cfg-section-head" data-section="stack" aria-expanded="true" aria-controls="body-stack">
        <span class="cfg-section-label"><?= icon('blocks', 'icon cfg-icon') ?> Stack</span>
        <?= icon('chevron-down', 'icon cfg-chevron') ?>
      </button>
      <div class="cfg-body" id="body-stack">
        <div id="stack-list"></div>
      </div>
    </section>
    <section class="cfg-section" id="sec-hosting">
      <button type="button" class="cfg-section-head" data-section="hosting" aria-expanded="false" aria-controls="body-hosting">
        <span class="cfg-section-label"><?= icon('cloud', 'icon cfg-icon') ?> Hosting</span>
        <?= icon('chevron-down', 'icon cfg-chevron') ?>
      </button>
      <div class="cfg-body" id="body-hosting">
        <div id="hosting-list"></div>
      </div>
    </section>
    <section class="cfg-section" id="sec-local">
      <button type="button" class="cfg-section-head" data-section="local" aria-expanded="false" aria-controls="body-local">
        <span class="cfg-section-label"><?= icon('laptop', 'icon cfg-icon') ?> Local development</span>
        <?= icon('chevron-down', 'icon cfg-chevron') ?>
      </button>
      <div class="cfg-body" id="body-local">
        <p class="cfg-note cfg-note--top">Used only for the Local output. Production never includes these.</p>
        <div class="dir-block vite-block" id="vite-block">
          <div class="dir-lbl"><label class="dir-name" for="vite-origin">Vite dev server</label><span class="dir-hint">Herd: https://app.test:5173</span></div>
          <input class="text-inp" id="vite-origin" data-clarity-mask="true" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="http://localhost:5173" aria-describedby="vite-msg">
          <p class="field-msg" id="vite-msg" aria-live="polite"></p>
        </div>
        <div id="local-list"></div>
      </div>
    </section>
    <section class="cfg-section" id="sec-reporting">
      <button type="button" class="cfg-section-head" data-section="reporting" aria-expanded="false" aria-controls="body-reporting">
        <span class="cfg-section-label"><?= icon('bell', 'icon cfg-icon') ?> Reporting</span>
        <?= icon('chevron-down', 'icon cfg-chevron') ?>
      </button>
      <div class="cfg-body" id="body-reporting">
        <div id="reporting-list"></div>
      </div>
    </section>
    <section class="cfg-section" id="sec-advanced">
      <button type="button" class="cfg-section-head" data-section="advanced" aria-expanded="false" aria-controls="body-advanced">
        <span class="cfg-section-label"><?= icon('sliders', 'icon cfg-icon') ?> Advanced</span>
        <?= icon('chevron-down', 'icon cfg-chevron') ?>
      </button>
      <div class="cfg-body" id="body-advanced">
        <div id="custom-list"></div>
        <div id="style-attrs-row"></div>
        <p class="cfg-note" id="style-attrs-required" aria-live="polite"></p>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">Embedding exceptions</span><span class="dir-hint">frame-ancestors per path</span></div>
          <p class="cfg-note">Pages on these paths may be framed by the sites you list. Everything else stays unframeable.</p>
          <div class="embed-form">
            <input class="text-inp" id="embed-path" type="text" placeholder="widget/*" aria-label="Path pattern" autocomplete="off" spellcheck="false" aria-describedby="embed-msg" data-clarity-mask="true">
            <input class="text-inp" id="embed-origin" type="text" inputmode="url" placeholder="https://partner.com" aria-label="Sites allowed to frame it, separated by spaces" autocomplete="off" spellcheck="false" aria-describedby="embed-msg" data-clarity-mask="true">
            <button type="button" class="cbtn" data-action="add-embed">Add</button>
          </div>
          <p class="field-msg" id="embed-msg" aria-live="polite"></p>
          <ul class="embeds-list" id="embeds-list" data-clarity-mask="true"></ul>
        </div>
      </div>
    </section>

  </div><!-- /config -->

  <!-- OUTPUT -->
  <div class="output" data-clarity-mask="true">
    <div class="out-head">
      <div class="out-tabs" role="tablist" aria-label="Output">
        <button type="button" class="otab active" role="tab" id="tab-header" data-tab="header" aria-selected="true" aria-controls="out-body" tabindex="0">Header</button>
        <button type="button" class="otab" role="tab" id="tab-laravel" data-tab="laravel" aria-selected="false" aria-controls="out-body" tabindex="-1">Laravel</button>
        <button type="button" class="otab" role="tab" id="tab-formats" data-tab="formats" aria-selected="false" aria-controls="out-body" tabindex="-1">Other formats</button>
        <button type="button" class="otab" role="tab" id="tab-checklist" data-tab="checklist" aria-selected="false" aria-controls="out-body" tabindex="-1">Checklist</button>
        <button type="button" class="otab" role="tab" id="tab-summary" data-tab="summary" aria-selected="false" aria-controls="out-body" tabindex="-1">Summary</button>
      </div>
      <button type="button" class="kbd-btn" popovertarget="kbd-help" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)"><?= icon('keyboard') ?></button>
    </div>
    <div class="kbd-help" id="kbd-help" popover>
      <p class="kbd-title">Keyboard shortcuts</p>
      <dl>
        <dt><kbd>1</kbd> to <kbd>5</kbd></dt><dd>Switch output tab</dd>
        <dt><kbd>c</kbd></dt><dd>Copy the output</dd>
        <dt><kbd>/</kbd></dt><dd>Search integrations</dd>
        <dt><kbd>?</kbd></dt><dd>Show this list</dd>
        <dt><kbd>Esc</kbd></dt><dd>Close it</dd>
      </dl>
    </div>
    <div class="out-body" id="out-body" role="tabpanel" aria-labelledby="tab-header" tabindex="0"></div>
    <div class="src-tip" id="src-tip" popover="manual" role="tooltip"></div>
  </div>

</div><!-- /tool -->

<!-- FEATURES -->
<section class="features">
  <div class="section-intro">
    <div class="section-label">Why this tool</div>
    <div class="section-title">Everything you need to ship secure</div>
    <p class="section-sub">Not just a header builder - a complete workflow from configuration to deployment.</p>
  </div>
  <div class="feat-grid">
    <div class="feat-card">
      <div class="feat-icon"><?= icon('target') ?></div>
      <div class="feat-title">Nonce-based by default</div>
      <div class="feat-body">Every policy uses per-request nonces, never 'unsafe-inline' for scripts. The middleware generates the nonce, shares it with Blade and registers it with Vite.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon"><?= icon('plug') ?></div>
      <div class="feat-title">27 integrations, explained</div>
      <div class="feat-body">Stripe, PayPal, GA4, Intercom, Google Maps, Sentry and more. Every host comes with the reason it is needed, following each vendor's CSP documentation.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon"><?= icon('layers') ?></div>
      <div class="feat-title">One config, two environments</div>
      <div class="feat-body">Production and Local output from the same settings. The middleware branches on the environment, so the Vite dev server never reaches production.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon"><?= icon('gauge') ?></div>
      <div class="feat-title">A score that explains itself</div>
      <div class="feat-body">Every point lost is listed: 'unsafe-eval', CDNs that serve script gadgets, wildcard hosts, report-only mode. A size meter warns before nginx starts returning 502.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon"><?= icon('puzzle') ?></div>
      <div class="feat-title">Laravel and beyond</div>
      <div class="feat-body">Middleware, report controller and Pest test for Laravel, plus a spatie/laravel-csp preset, nginx, Apache and a meta tag.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon"><?= icon('list-checks') ?></div>
      <div class="feat-title">A checklist that follows your stack</div>
      <div class="feat-body">Livewire, Inertia, Filament, Cloudflare and full-page caching each add the steps they need. Tick them off as you go, and export a summary for your auditor.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon"><?= icon('search') ?></div>
      <div class="feat-title">Import and explain</div>
      <div class="feat-body">Paste your current header to start from it, or paste a console error or violation report to learn why it was blocked and fix it in one click.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon"><?= icon('code') ?></div>
      <div class="feat-title">Find inline code</div>
      <div class="feat-body">Scan Blade templates for inline scripts and styles without a nonce, onclick handlers, style attributes and javascript: links, with line numbers. Nothing leaves your browser.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon"><?= icon('radar') ?></div>
      <div class="feat-title">Check what is live</div>
      <div class="feat-body">Scan a page to see what it loads, or grade its deployed headers: duplicate CSP headers, a leaked X-Powered-By, missing HSTS, and how the live policy differs from yours.</div>
    </div>
  </div>
</section>

<!-- GUIDE CTA -->
<div class="guide-section">
  <div class="guide-card">
    <div class="guide-left">
      <div class="guide-label">Free PDF Guide</div>
      <div class="guide-title">Laravel CSP Quick Reference</div>
      <p class="guide-sub">4 pages. Every directive, the checklist, common mistakes, and quick-start snippets - without keeping this tab open.</p>
      <div class="guide-items">
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>All 13 directives</strong> with values and plain-English descriptions</div></div>
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>Pre-enforcement checklist</strong> - 12 items before enforcement</div></div>
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>5 common mistakes</strong> and how to avoid them</div></div>
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>Blade, Vite & Livewire</strong> quick-start snippets</div></div>
      </div>
    </div>
    <div class="guide-right">
      <div class="pdf-card">
        <div class="pdf-icon"><span>PDF</span></div>
        <div class="grow">
          <div class="pdf-name">laravel-csp-guide.pdf</div>
          <div class="pdf-meta">4 pages · Free · Instant download</div>
        </div>
        <span class="pdf-pages">4 pages</span>
      </div>
      <form class="guide-form" id="guide-form" action="/save-email.php" method="post" novalidate>
        <div class="form-field">
          <label class="form-label" for="g-email">Email address</label>
          <input class="form-input" id="g-email" name="email" type="email" placeholder="you@yourapp.com" autocomplete="email" required aria-describedby="g-error" data-clarity-mask="true">
          <p class="form-error" id="g-error" role="alert"></p>
        </div>
        <input class="form-pot" id="g-pot" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true">
        <button type="submit" class="form-submit">Send me the PDF <?= icon('arrow-right') ?></button>
        <p class="form-privacy" id="g-privacy">We store your email to send the guide and occasional CSP updates. Unsubscribe any time.</p>
      </form>
      <div class="guide-success is-hidden" id="guide-success" tabindex="-1">
        <div class="success-icon"><?= icon('check') ?></div>
        <div class="success-title">You're on the list</div>
        <div class="success-sub">Thanks for signing up. Download the guide below.</div>
        <a class="download-btn" href="https://csp-generator.shakiltech.com/laravel-csp-guide.pdf" download><?= icon('download') ?> Download PDF</a>
      </div>
    </div>
  </div>
</div>

<!-- FAQ -->
<section class="faq">
  <div class="section-center">
    <div class="section-label">Common questions</div>
    <div class="section-title">FAQ</div>
  </div>
<?php foreach ($faq as $item): ?>
  <details class="faq-item" name="faq"><summary class="faq-q"><?= htmlspecialchars($item['q']) ?> <?= icon('chevron-down', 'icon faq-ch') ?></summary><div class="faq-a"><?= $item['a_html'] ?></div></details>
<?php endforeach; ?>
</section>

<footer>
  <p class="footer-text">
    Built by <a href="https://blog.shakiltech.com">Shakil</a> &nbsp;·&nbsp;
    <a href="https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel">Read the blog post</a> &nbsp;·&nbsp;
    <a href="https://securityheaders.com" target="_blank">Test your headers</a> &nbsp;·&nbsp;
    <a href="https://csp-evaluator.withgoogle.com" target="_blank">CSP Evaluator</a>
  </p>
  <p class="footer-privacy">The generator runs in your browser. Nothing you configure is sent anywhere, except a URL you ask us to scan. Anonymous usage stats via Google Analytics and Microsoft Clarity.</p>
</footer>

<div id="announcer" class="sr-only" aria-live="polite" aria-atomic="true"></div>

<div class="toast" id="toast" popover="manual" role="status">
  <span>Settings reset.</span>
  <button type="button" class="toast-undo">Undo</button>
</div>

<!-- TOOLS -->
<dialog class="tool-dialog" id="tool-menu" aria-labelledby="tool-menu-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-menu-title">Tools</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <ul class="tool-list">
    <li><button type="button" class="tool-item" data-tool="import"><span class="tool-item-name">Import a policy</span><span class="tool-item-desc">Paste an existing CSP header to start from it.</span></button></li>
    <li><button type="button" class="tool-item" data-tool="explain"><span class="tool-item-name">Explain a violation</span><span class="tool-item-desc">Paste a console error or a violation report.</span></button></li>
    <li><button type="button" class="tool-item" data-tool="blade"><span class="tool-item-name">Find inline code</span><span class="tool-item-desc">Scan Blade templates for code a nonce policy blocks.</span></button></li>
    <li><button type="button" class="tool-item" data-tool="bookmarklet"><span class="tool-item-name">Discovery bookmarklet</span><span class="tool-item-desc">See what your live site loads, from your own browser.</span></button></li>
    <li><button type="button" class="tool-item" data-tool="share"><span class="tool-item-name">Share this config</span><span class="tool-item-desc">A link that carries the config. It never reaches a server.</span></button></li>
    <li><button type="button" class="tool-item" data-tool="scan"><span class="tool-item-name">Scan my site</span><span class="tool-item-desc">Fetch a page and propose the sources it needs.</span></button></li>
    <li><button type="button" class="tool-item" data-tool="headers"><span class="tool-item-name">Check deployed headers</span><span class="tool-item-desc">Grade a site's live security headers against this policy.</span></button></li>
    </ul>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-import" aria-labelledby="tool-import-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-import-title">Import a policy</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <p class="tool-sub">Services it recognises are turned on. Hosts it does not recognise go to Advanced, and anything the generator does not model is listed so you can keep it in mind.</p>
    <label class="tool-label" for="import-text">Your current header, a header value, or a &lt;meta&gt; tag</label>
    <textarea class="text-inp tool-text" id="import-text" rows="6" spellcheck="false" data-clarity-mask="true" placeholder="Content-Security-Policy: default-src 'self'; script-src 'self' https://js.stripe.com"></textarea>
    <div class="tool-actions"><button type="button" class="cbtn cbtn-primary" data-action="import-read">Read policy</button></div>
    <div class="tool-result" id="import-result" aria-live="polite" data-clarity-mask="true"></div>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-explain" aria-labelledby="tool-explain-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-explain-title">Explain a violation</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <label class="tool-label" for="explain-text">Console message or report JSON</label>
    <textarea class="text-inp tool-text" id="explain-text" rows="5" spellcheck="false" data-clarity-mask="true" placeholder="Refused to load the script 'https://...' because it violates the following Content Security Policy directive: ..."></textarea>
    <div class="tool-actions"><button type="button" class="cbtn cbtn-primary" data-action="explain">Explain</button></div>
    <div class="tool-result" id="explain-result" aria-live="polite" data-clarity-mask="true"></div>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-blade" aria-labelledby="tool-blade-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-blade-title">Find inline code</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <p class="tool-sub">Nothing leaves your browser.</p>
    <label class="tool-label" for="blade-text">Paste a template</label>
    <textarea class="text-inp tool-text" id="blade-text" rows="7" spellcheck="false" data-clarity-mask="true" placeholder="Paste the contents of a .blade.php file"></textarea>
    <label class="tool-label" for="blade-files">or choose .blade.php files</label>
    <input class="tool-file" id="blade-files" type="file" multiple accept=".php,.html,.htm">
    <div class="tool-actions">
      <button type="button" class="cbtn cbtn-primary" data-action="blade-scan">Scan</button>
      <button type="button" class="cbtn" data-action="blade-copy" hidden>Copy as Markdown</button>
    </div>
    <div class="tool-result" id="blade-result" aria-live="polite" data-clarity-mask="true"></div>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-bookmarklet" aria-labelledby="tool-bookmarklet-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-bookmarklet-title">Discovery bookmarklet</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <p class="tool-sub">It runs in your browser on your site and sends the list here in the URL hash, which never reaches a server.</p>
    <ol class="tool-steps">
      <li>Drag this link to your bookmarks bar: <a class="bookmarklet" id="bookmarklet-link" href="#">CSP discovery</a></li>
      <li>Open your own site and click the bookmark.</li>
      <li>Click around for three seconds. A new tab opens here with every origin the page loaded, grouped by type.</li>
    </ol>
    <p class="field-msg" id="bookmarklet-msg" aria-live="polite"></p>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-share" aria-labelledby="tool-share-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-share-title">Share this config</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <p class="tool-sub">Anyone who opens it is asked before it replaces their settings.</p>
    <label class="tool-label" for="share-url">Link</label>
    <div class="tool-row">
      <input class="text-inp" id="share-url" type="text" readonly data-clarity-mask="true">
      <button type="button" class="cbtn cbtn-primary" data-action="share-copy">Copy</button>
    </div>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-scan" aria-labelledby="tool-scan-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-scan-title">Scan my site</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <p class="tool-sub">We fetch the page HTML once (no scripts run, nothing is stored or logged), and your browser reads it. Up to 20 scans an hour.</p>
    <label class="tool-label" for="scan-url">Page URL</label>
    <div class="tool-row">
      <input class="text-inp" id="scan-url" type="url" inputmode="url" placeholder="https://your-app.com" autocomplete="url" spellcheck="false" data-clarity-mask="true">
      <button type="button" class="cbtn cbtn-primary" data-action="scan">Scan</button>
    </div>
    <p class="field-msg" data-offline-note hidden>You are offline. Scanning needs a connection.</p>
    <div class="tool-result" id="scan-result" aria-live="polite" data-clarity-mask="true"></div>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-headers" aria-labelledby="tool-headers-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-headers-title">Check deployed headers</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <p class="tool-sub">Compares the live headers with the Production policy you configured here.</p>
    <label class="tool-label" for="headers-url">Page URL</label>
    <div class="tool-row">
      <input class="text-inp" id="headers-url" type="url" inputmode="url" placeholder="https://your-app.com" autocomplete="url" spellcheck="false" data-clarity-mask="true">
      <button type="button" class="cbtn cbtn-primary" data-action="check-headers">Check</button>
    </div>
    <p class="field-msg" data-offline-note hidden>You are offline. Checking needs a connection.</p>
    <div class="tool-result" id="headers-result" aria-live="polite" data-clarity-mask="true"></div>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-shared" aria-labelledby="tool-shared-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-shared-title">Load a shared config?</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <div class="tool-result" id="shared-result" data-clarity-mask="true"></div>
    <div class="tool-actions"><button type="button" class="cbtn cbtn-primary" data-action="load-shared">Load it</button><button type="button" class="cbtn" data-close>Keep mine</button></div>
  </div>
</dialog>
<dialog class="tool-dialog" id="tool-discover" aria-labelledby="tool-discover-title">
  <div class="tool-head">
    <h2 class="tool-title" id="tool-discover-title">What your site loads</h2>
    <button type="button" class="tool-close" data-close aria-label="Close"><?= icon('x') ?></button>
  </div>
  <div class="tool-body">
    <div class="tool-result" id="discover-result" data-clarity-mask="true"></div>
  </div>
</dialog>

</body>
</html>