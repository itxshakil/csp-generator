<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/site-headers.php';
require_once __DIR__ . '/lib/faq.php';
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
<title>Laravel CSP Generator — Free Content Security Policy Builder</title>
<meta name="description" content="Generate a production-ready Content Security Policy for your Laravel app. Nonce-based, Vite-ready, Livewire-aware. Free and instant.">
<link rel="canonical" href="https://csp-generator.shakiltech.com">
<meta property="og:title" content="Laravel CSP Generator">
<meta property="og:description" content="Generate a production-ready CSP for your Laravel app — nonce-based, Vite-ready, Livewire-aware. Free and instant.">
<meta property="og:url" content="https://csp-generator.shakiltech.com">
<meta name="twitter:card" content="summary_large_image">
<!-- Open Graph — complete set -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="CSP Generator by Shakil">
<meta property="og:image"       content="https://csp-generator.shakiltech.com/favicon.svg">
<meta property="og:image:alt"   content="Laravel CSP Generator — Free Content Security Policy Builder">
<!-- Twitter card — complete set -->
<meta name="twitter:title"       content="Laravel CSP Generator — Free CSP Builder">
<meta name="twitter:description" content="Generate a production-ready CSP for your Laravel app — nonce-based, Vite-ready, Livewire-aware. Free and instant.">
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
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Laravel CSP Generator","url":"https://csp-generator.shakiltech.com","description":"Free tool to generate production-ready Content Security Policy for Laravel","applicationCategory":"DeveloperApplication","operatingSystem":"Any","featureList":["Nonce-based CSP","Vite HMR support","Livewire-aware","Policy strength scoring","Violation reporting"],"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"creator":{"@type":"Person","name":"Shakil","url":"https://blog.shakiltech.com"}}</script>
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
    <span class="nav-pill">Free Tool</span>
  </div>
</nav>

<section class="hero">
  <div class="hero-badge"><div class="hero-badge-dot"></div> Laravel Security</div>
  <h1>Generate a production-ready<br><em>Content Security Policy</em></h1>
  <p class="hero-sub">Configure your directives, copy the middleware, deploy with confidence. No signup needed.</p>
  <div class="hero-tags">
    <span class="tag">Nonce-based</span>
    <span class="tag">Vite-ready</span>
    <span class="tag">Livewire-aware</span>
    <span class="tag">Violation reporting</span>
    <span class="tag">Runs in your browser</span>
  </div>
</section>

<div class="tool">

  <!-- CONFIG -->
  <div class="config">
    <div class="config-head">
      <span class="config-title">Configure</span>
      <div class="seg" role="radiogroup" aria-label="Preset">
        <button type="button" role="radio" aria-checked="false" data-preset="strict" title="Nothing third-party. Best for new apps.">Strict</button>
        <button type="button" role="radio" aria-checked="false" data-preset="standard" title="Vite, Google Fonts and GA4.">Standard</button>
        <button type="button" role="radio" aria-checked="false" data-preset="rollout" title="Standard in report-only mode, to watch before enforcing.">Rollout</button>
      </div>
      <button type="button" class="config-reset" data-action="reset">↺ Reset</button>
    </div>

    <section class="cfg-section open" id="sec-integrations">
      <button type="button" class="cfg-section-head" data-section="integrations" aria-expanded="true" aria-controls="body-integrations">
        <span class="cfg-section-label"><span class="cfg-icon">🔌</span> Integrations <span class="cfg-count is-hidden" id="count-integrations"></span></span>
        <span class="cfg-chevron" aria-hidden="true">▾</span>
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
        <span class="cfg-section-label"><span class="cfg-icon">🧱</span> Stack</span>
        <span class="cfg-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="cfg-body" id="body-stack">
        <div id="stack-list"></div>
      </div>
    </section>
    <section class="cfg-section" id="sec-hosting">
      <button type="button" class="cfg-section-head" data-section="hosting" aria-expanded="false" aria-controls="body-hosting">
        <span class="cfg-section-label"><span class="cfg-icon">☁️</span> Hosting</span>
        <span class="cfg-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="cfg-body" id="body-hosting">
        <div id="hosting-list"></div>
      </div>
    </section>
    <section class="cfg-section" id="sec-local">
      <button type="button" class="cfg-section-head" data-section="local" aria-expanded="false" aria-controls="body-local">
        <span class="cfg-section-label"><span class="cfg-icon">💻</span> Local development</span>
        <span class="cfg-chevron" aria-hidden="true">▾</span>
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
        <span class="cfg-section-label"><span class="cfg-icon">🚨</span> Reporting</span>
        <span class="cfg-chevron" aria-hidden="true">▾</span>
      </button>
      <div class="cfg-body" id="body-reporting">
        <div id="reporting-list"></div>
      </div>
    </section>
    <section class="cfg-section" id="sec-advanced">
      <button type="button" class="cfg-section-head" data-section="advanced" aria-expanded="false" aria-controls="body-advanced">
        <span class="cfg-section-label"><span class="cfg-icon">⚙️</span> Advanced</span>
        <span class="cfg-chevron" aria-hidden="true">▾</span>
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
    <div class="out-tabs">
      <button type="button" class="otab active" data-tab="header">HTTP Header</button>
      <button type="button" class="otab" data-tab="php">PHP Middleware</button>
      <button type="button" class="otab" data-tab="checklist">Checklist</button>
      <button type="button" class="otab" data-tab="reference">Reference</button>
    </div>
    <div class="out-body" id="out-body"></div>
  </div>

</div><!-- /tool -->

<!-- GUIDE CTA -->
<div class="guide-section">
  <div class="guide-card">
    <div class="guide-left">
      <div class="guide-label">Free PDF Guide</div>
      <div class="guide-title">Laravel CSP Quick Reference</div>
      <p class="guide-sub">4 pages. Every directive, the checklist, common mistakes, and quick-start snippets — without keeping this tab open.</p>
      <div class="guide-items">
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>All 13 directives</strong> with values and plain-English descriptions</div></div>
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>Pre-enforcement checklist</strong> — 12 items before enforcement</div></div>
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
      <div id="guide-form">
        <div class="guide-form">
          <div class="form-field">
            <label class="form-label" for="g-name">First name</label>
            <input class="form-input" id="g-name" type="text" placeholder="Your name" autocomplete="given-name" />
          </div>
          <div class="form-field">
            <label class="form-label" for="g-email">Email address</label>
            <input class="form-input" id="g-email" type="email" placeholder="you@yourapp.com" autocomplete="email" />
          </div>
          <input class="form-pot" id="g-pot" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <button type="button" class="form-submit" data-action="submit-guide">Send me the PDF →</button>
          <p class="form-privacy">We store your email to send the guide and occasional CSP updates. Unsubscribe any time.</p>
        </div>
      </div>
      <div class="guide-success is-hidden" id="guide-success">
        <div class="success-icon">✓</div>
        <div class="success-title">You're on the list</div>
        <div class="success-sub">Thanks for signing up. Download the guide below.</div>
        <a class="download-btn" href="https://csp-generator.shakiltech.com/laravel-csp-guide.pdf" download>↓ Download PDF</a>
      </div>
    </div>
  </div>
</div>

<!-- FEATURES -->
<section class="features">
  <div class="section-intro">
    <div class="section-label">Why this tool</div>
    <div class="section-title">Everything you need to ship secure</div>
    <p class="section-sub">Not just a header builder — a complete workflow from configuration to deployment.</p>
  </div>
  <div class="feat-grid">
    <div class="feat-card">
      <div class="feat-icon">🎯</div>
      <div class="feat-title">Nonce-based by default</div>
      <div class="feat-body">Every policy uses cryptographic nonces — never unsafe-inline. The middleware handles generation, Blade sharing, and Vite registration automatically.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">🚨</div>
      <div class="feat-title">Violation reporting ready</div>
      <div class="feat-body">Adds report-uri and report-to so browsers send blocked-resource reports to your endpoint.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">⚡</div>
      <div class="feat-title">Environment-aware</div>
      <div class="feat-body">Local dev mode adds Vite's HMR WebSocket and removes upgrade-insecure-requests automatically. Nothing leaks to production.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">📋</div>
      <div class="feat-title">Dynamic checklist</div>
      <div class="feat-body">The pre-enforcement checklist adapts to your config. Livewire items appear only when Livewire is on. Report-only mode tells you what to do next.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">⚖️</div>
      <div class="feat-title">Policy strength score</div>
      <div class="feat-body">Real-time score from D to A+ that grades your policy on nonce usage, HTTPS enforcement, allowlist size, and reporting coverage.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">🔒</div>
      <div class="feat-title">Strict CSS directives</div>
      <div class="feat-body">Correctly separates style-src, style-src-elem, and style-src-attr. style-src-attr is 'none' by default, with a clear opt-in when a widget needs inline styles.</div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="faq">
  <div class="section-center">
    <div class="section-label">Common questions</div>
    <div class="section-title">FAQ</div>
  </div>
<?php foreach ($faq as $item): ?>
  <div class="faq-item"><button type="button" class="faq-q"><?= htmlspecialchars($item['q']) ?> <span class="faq-ch">▾</span></button><div class="faq-a"><?= $item['a_html'] ?></div></div>
<?php endforeach; ?>
</section>

<footer>
  <p class="footer-text">
    Built by <a href="https://blog.shakiltech.com">Shakil</a> &nbsp;·&nbsp;
    <a href="https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel">Read the blog post</a> &nbsp;·&nbsp;
    <a href="https://securityheaders.com" target="_blank">Test your headers</a> &nbsp;·&nbsp;
    <a href="https://csp-evaluator.withgoogle.com" target="_blank">CSP Evaluator</a>
  </p>
  <p class="footer-privacy">The generator runs in your browser. Nothing you configure is sent anywhere. Anonymous usage stats via Google Analytics and Microsoft Clarity.</p>
</footer>

</body>
</html>