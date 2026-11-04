<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/site-headers.php';
require_once __DIR__ . '/lib/faq.php';

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
<link rel="stylesheet" nonce="<?= $n ?>" href="/assets/app.css">
<script type="module" nonce="<?= $n ?>" src="/assets/js/analytics.js"></script>
<script type="module" nonce="<?= $n ?>" src="/assets/js/ui.js"></script>
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

<div class="presets">
  <button type="button" class="preset active" id="preset-strict" data-preset="strict">
    <div class="preset-dot"></div>
    <div class="preset-icon">🔒</div>
    <div class="preset-name">Strict</div>
    <div class="preset-desc">Minimal CDN allowlist. Best for new apps.</div>
  </button>
  <button type="button" class="preset" id="preset-standard" data-preset="standard">
    <div class="preset-dot"></div>
    <div class="preset-icon">⚖️</div>
    <div class="preset-name">Standard</div>
    <div class="preset-desc">Common CDNs, Google Fonts, GA4 ready.</div>
  </button>
  <button type="button" class="preset" id="preset-local" data-preset="local">
    <div class="preset-dot"></div>
    <div class="preset-icon">💻</div>
    <div class="preset-name">Local Dev</div>
    <div class="preset-desc">Vite HMR enabled, report-only on.</div>
  </button>
</div>

<div class="tool">

  <!-- CONFIG -->
  <div class="config">
    <div class="config-head">
      <span class="config-title">Configure</span>
      <button type="button" class="config-reset" data-action="reset">↺ Reset</button>
    </div>

    <!-- Environment -->
    <div class="cfg-section open" id="sec-env">
      <div class="cfg-section-head" data-section="env">
        <span class="cfg-section-label"><span class="cfg-icon">🌍</span> Environment</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Local development <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Adds the Vite dev server to script-src and style-src, its HMR WebSocket to connect-src, and removes upgrade-insecure-requests. Never ship this to production.</div></div></div>
            <div class="trow-desc">Allows the Vite dev server and its HMR WebSocket</div>
          </div>
          <button type="button" class="toggle" id="t-local" data-toggle="local"></button>
        </div>
        <div class="dir-block vite-block is-hidden" id="vite-block">
          <div class="dir-lbl"><label class="dir-name" for="vite-origin">Vite dev server</label><span class="dir-hint">Herd: https://app.test:5173</span></div>
          <input class="text-inp" id="vite-origin" data-clarity-mask="true" type="text" inputmode="url" autocomplete="off" spellcheck="false" placeholder="http://localhost:5173" aria-describedby="vite-msg">
          <p class="field-msg" id="vite-msg" aria-live="polite"></p>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Report-only mode <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Uses Content-Security-Policy-Report-Only. Violations are reported but nothing is blocked. Run this for 1–2 weeks before enforcing.</div></div></div>
            <div class="trow-desc">Reports violations without blocking</div>
          </div>
          <button type="button" class="toggle" id="t-reportonly" data-toggle="reportonly"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Violation reporting <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Adds report-uri to the policy. Set up CspReportController to receive and classify reports.</div></div></div>
            <div class="trow-desc">Sends blocked resource reports to your endpoint</div>
          </div>
          <button type="button" class="toggle on" id="t-reporting" data-toggle="reporting"></button>
        </div>
      </div>
    </div>

    <!-- Scripts -->
    <div class="cfg-section open" id="sec-scripts">
      <div class="cfg-section-head" data-section="scripts">
        <span class="cfg-section-label"><span class="cfg-icon">⚡</span> Scripts <span class="cfg-count" id="count-scripts"></span></span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="trow">
          <div class="trow-info"><div class="trow-name">cdn.jsdelivr.net</div></div>
          <button type="button" class="toggle on" id="t-jsdelivr" data-toggle="jsdelivr"></button>
        </div>
        <div class="trow">
          <div class="trow-info"><div class="trow-name">cdnjs.cloudflare.com</div></div>
          <button type="button" class="toggle on" id="t-cdnjs" data-toggle="cdnjs"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Tawk.to live chat</div>
            <div class="trow-desc">*.tawk.to in scripts, styles, fonts, images, media, frames and WebSockets</div>
          </div>
          <button type="button" class="toggle" id="t-tawk" data-toggle="tawk"></button>
        </div>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">script-src custom</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" data-clarity-mask="true">
            <div id="tags-script" class="tags-list"></div>
            <input class="tag-inp" placeholder="https://cdn.example.com" data-dir="script" aria-label="Add a script-src host" aria-describedby="msg-script" />
          </div>
          <p class="field-msg" id="msg-script" aria-live="polite"></p>
        </div>
      </div>
    </div>

    <!-- Styles -->
    <div class="cfg-section" id="sec-styles">
      <div class="cfg-section-head" data-section="styles">
        <span class="cfg-section-label"><span class="cfg-icon">🎨</span> Styles</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Google Fonts <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Adds fonts.googleapis.com to style-src-elem and fonts.gstatic.com to font-src.</div></div></div>
            <div class="trow-desc">fonts.googleapis.com + fonts.gstatic.com</div>
          </div>
          <button type="button" class="toggle on" id="t-gfonts" data-toggle="gfonts"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Allow inline style attributes <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Sets style-src-attr to 'unsafe-inline'. Inline style="" attributes cannot carry a nonce, so 'none' is strictest. Turn this on only if a widget breaks without it.</div></div></div>
            <div class="trow-desc">Needed by some widgets (PayPal, Tawk.to, Stripe) that set <code class="code-plain">style=""</code></div>
          </div>
          <button type="button" class="toggle" id="t-inlineStyleAttrs" data-toggle="inlineStyleAttrs"></button>
        </div>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">style-src custom</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" data-clarity-mask="true">
            <div id="tags-style" class="tags-list"></div>
            <input class="tag-inp" placeholder="https://cdn.example.com" data-dir="style" aria-label="Add a style-src host" aria-describedby="msg-style" />
          </div>
          <p class="field-msg" id="msg-style" aria-live="polite"></p>
        </div>
      </div>
    </div>

    <!-- Media -->
    <div class="cfg-section" id="sec-media">
      <div class="cfg-section-head" data-section="media">
        <span class="cfg-section-label"><span class="cfg-icon">🖼</span> Images & Frames</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="dir-block dir-block--first">
          <div class="dir-lbl"><span class="dir-name">img-src</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" data-clarity-mask="true">
            <div id="tags-img" class="tags-list"></div>
            <input class="tag-inp" placeholder="https://your-cdn.com" data-dir="img" aria-label="Add a img-src host" aria-describedby="msg-img" />
          </div>
          <p class="field-msg" id="msg-img" aria-live="polite"></p>
        </div>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">frame-src</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" data-clarity-mask="true">
            <div id="tags-frame" class="tags-list"></div>
            <input class="tag-inp" placeholder="https://video.example.com" data-dir="frame" aria-label="Add a frame-src host" aria-describedby="msg-frame" />
          </div>
          <p class="field-msg" id="msg-frame" aria-live="polite"></p>
        </div>
      </div>
    </div>

    <!-- Connect -->
    <div class="cfg-section" id="sec-connect">
      <div class="cfg-section-head" data-section="connect">
        <span class="cfg-section-label"><span class="cfg-icon">🔗</span> Connect & APIs</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <p class="cfg-note cfg-note--top">Controls <code class="code-plain">fetch()</code>, XHR, WebSockets and SSE. Vite HMR WebSocket is added automatically when local dev is on.</p>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">connect-src custom</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" data-clarity-mask="true">
            <div id="tags-connect" class="tags-list"></div>
            <input class="tag-inp" placeholder="https://api.example.com" data-dir="connect" aria-label="Add a connect-src host" aria-describedby="msg-connect" />
          </div>
          <p class="field-msg" id="msg-connect" aria-live="polite"></p>
        </div>
      </div>
    </div>

    <!-- Integrations -->
    <div class="cfg-section" id="sec-integrations">
      <div class="cfg-section-head" data-section="integrations">
        <span class="cfg-section-label"><span class="cfg-icon">🔌</span> Integrations</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Google Analytics / GA4</div>
            <div class="trow-desc">gtag.js plus the GA4 collection endpoints</div>
          </div>
          <button type="button" class="toggle" id="t-ga" data-toggle="ga"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Google Tag Manager <div class="tip"><span class="tip-icon">?</span><div class="tip-box">GTM custom HTML tags require unsafe-inline which weakens your policy. Consider server-side GTM instead.</div></div></div>
          </div>
          <button type="button" class="toggle" id="t-gtm" data-toggle="gtm"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Livewire</div>
            <div class="trow-desc">Adds nonce reminders to the checklist</div>
          </div>
          <button type="button" class="toggle" id="t-livewire" data-toggle="livewire"></button>
        </div>
      </div>
    </div>

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