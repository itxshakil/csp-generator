# [Laravel CSP Generator](https://csp-generator.shakiltech.com)

**A free Content Security Policy builder for Laravel apps, configured by the services you actually use.**

Pick your integrations (Stripe, GA4, Intercom, Sentry and more), your stack and your hosting.
You get an explained policy, a ready-to-paste middleware, a report controller, a Pest test, and a checklist.
The generator runs in your browser and nothing you configure is sent anywhere.

**[→ Open the tool](https://csp-generator.shakiltech.com)** · [Blog post](https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel) · [Report a bug](https://github.com/itxshakil/csp-generator/issues)

---

## Why this exists

Our pentest came back with one finding:

> *"Application does not implement Content-Security-Policy headers. XSS payloads executed without restriction."*

We had Sanctum, CSRF tokens, input validation.
What we didn't have was a CSP header.

The implementation turned out to have several non-obvious failure modes that aren't in the Laravel docs:

- `Vite::useCspNonce($nonce)` must be called **before** `$next($request)`, or `@vite()` tags go out without a nonce.
- `style-src-attr` is separate from `style-src` and **cannot carry nonces**.
- The Vite dev server and its HMR WebSocket must be allowed locally and **never** in production.
- Every third-party service needs its own set of hosts across several directives, and getting one wrong breaks it silently.

This tool handles all of it so you don't debug it from scratch.

---

## What it does

**Input:**

- **Integrations:** 27 services in 8 categories (payments, analytics and ads, chat, maps and media, realtime, CDNs and fonts, bot protection, error tracking), with search.
  Each source has a one-line reason, and the lists follow each vendor's CSP documentation.
- **Stack:** Vite, Livewire 3, Inertia (Ziggy), Alpine (standard or CSP build), Filament, Telescope, Horizon, Pulse.
- **Hosting:** Cloudflare, Hostinger, nginx proxy, and full-page caching.
- **Advanced:** custom hosts for eight directives, inline style attributes, and per-path embedding exceptions.

**Output, in five tabs:**

| Tab | What you get |
|-----|-------------|
| **Header** | The policy for Production or Local, an explained score, a header size meter, and why each source is there |
| **Laravel** | `SecureHeadersMiddleware` with a reason comment per source, `bootstrap/app.php`, Blade snippets, report route and controller, and a Pest test |
| **Other formats** | spatie/laravel-csp preset, nginx, Apache, and a `<meta>` tag |
| **Checklist** | Items driven by your config, ticked off as you go and remembered |
| **Summary** | A Markdown summary for a pentest or audit, with your rollout dates |

**Tools**, from the Tools menu:

- **Import a policy:** paste your current header and start from it.
  Services it recognises are turned on, and anything the generator does not model is listed.
- **Explain a violation:** paste a console error from Chrome, Firefox or Safari, or a report body, and get a plain-English reason and a one-click fix.
- **Find inline code:** scan Blade templates for scripts and styles without a nonce, `onclick` handlers, `style=""` and `javascript:` links.
- **Discovery bookmarklet:** run it on your own site to list every origin the page loads.
- **Share this config:** a link that carries the config in its hash.
- **Scan my site** and **Check deployed headers:** fetch one page through a locked-down endpoint to propose sources or grade the live headers.

**Three presets to start from:** Strict (nothing third-party), Standard (Vite, Google Fonts and GA4), and Rollout (Standard in report-only mode).

---

## Features

- **Nonce-based by default:** never `'unsafe-inline'` for scripts.
- **One config, two environments:** the middleware branches on `app()->environment('local')`, so local sources never reach production.
- **Honest about trade-offs:** `'unsafe-eval'` and inline style attributes appear only when something you picked needs them, and the output says what.
- **Explained score:** every point lost is listed, for example a CDN that serves script gadgets or a wildcard host.
- **Header size meter:** amber above 4 KB (the default nginx proxy buffer), red above 8 KB.
- **Wildcard collapsing:** a wildcard like `https://*.google.com` absorbs the specific hosts it covers.
- **Violation reporting:** `report-uri` and `report-to` with a `Reporting-Endpoints` header, plus a controller that drops browser extension noise.
- **Quick to drive:** press `1` to `5` to switch tabs, `c` to copy, `/` to search integrations and `?` for the list.
  Hover, focus or tap any source in the Header tab to see why it is there, and undo a Reset within 6 seconds.
- **Runs in your browser:** nothing you configure is sent anywhere, except a URL you ask us to scan, and there is no signup.
  The site uses Google Analytics and Microsoft Clarity for anonymous usage stats.

---

## What the middleware looks like

```php
$directives = [
    'script-src' => [
        "'self'", // Your own origin
        "'nonce-{$nonce}'", // Inline scripts and styles you mark with the per-request nonce
        'https://js.stripe.com', // Stripe: Stripe.js
        'https://www.googletagmanager.com', // Google Analytics 4: gtag.js
        ...($local ? [
            'http://localhost:5173', // Vite dev server: scripts
        ] : []),
    ],
    // ...
    'upgrade-insecure-requests' => $local ? null : [],
];
```

The full output also generates the nonce, calls `View::share()` and `Vite::useCspNonce()`, and sets HSTS, `X-Frame-Options`, `X-Content-Type-Options` and `Referrer-Policy`.
The tests run the generated middleware under PHP and check that it builds exactly the policy the Header tab shows.

---

## The three CSS directives

| Directive | Covers | Can carry a nonce? |
|-----------|--------|-------------------|
| `style-src` | Fallback for stylesheets and `<style>` blocks | Yes |
| `style-src-elem` | `<link rel="stylesheet">` and `<style>` blocks, when it needs to differ | Yes |
| `style-src-attr` | Inline `style=""` attributes | No |

The generator sets `style-src-attr 'none'` unless you, or a service you picked, need inline style attributes.

---

## Deploy safely: report-only first

1. Pick the **Rollout** preset, or turn on **Report-only mode**.
2. Deploy and watch your violation logs for one to two weeks.
3. Fix any legitimate resources you forgot to allow.
4. Switch to enforcement and deploy again.

---

## Related resources

| Resource | Link |
|----------|------|
| Full implementation blog post | [blog.shakiltech.com](https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel) |
| Grade your response headers | [securityheaders.com](https://securityheaders.com) |
| Check your policy for weaknesses | [csp-evaluator.withgoogle.com](https://csp-evaluator.withgoogle.com) |
| Hosted violation reporting | [report-uri.com](https://report-uri.com) |
| Spatie laravel-csp package | [github.com/spatie/laravel-csp](https://github.com/spatie/laravel-csp) |
| MDN CSP Reference | [developer.mozilla.org](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy) |

---

## Development

There is no build step.
`index.php` holds the markup, `assets/app.css` the styles, and `assets/js/` native ES modules.
The integration catalog lives in `assets/js/integrations.js`.
`scan.php` fetches pages for the scan tools through `lib/fetch-guard.php`, which refuses private and reserved addresses, re-checks every redirect, and pins the connection to the checked IP.
Run the linters and tests before every commit:

```bash
./scripts/check.sh
```

It runs `php -l`, `node --check`, `node --test 'tests/js/*.test.js'` and `php tests/php/run.php`.
No npm or composer install is needed.

---

## Contributing

Bug reports and PRs are welcome.

**Common things to contribute:**

- New integrations, with a link to the vendor's CSP documentation
- Corrections when a vendor changes its hosts
- Additional checklist items

Open an issue first for anything significant so we can discuss before you build it.

---

## Licence

MIT: do whatever you want with it.
Attribution appreciated but not required.

---

Built by [Shakil](https://blog.shakiltech.com) · [Blog post](https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel) · [Live tool](https://csp-generator.shakiltech.com)
