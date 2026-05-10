# Laravel CSP Generator

**A free, visual Content Security Policy builder for Laravel apps.**

Configure your directives with toggles, get the full policy string, a ready-to-paste PHP middleware method, and a pre-enforcement checklist — all in your browser, nothing sent anywhere.

**[→ Open the tool](https://csp-generator.shakiltech.com)** · [Blog post](https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel) · [Report a bug](https://github.com/shakil/laravel-csp-generator/issues)

---

## Why this exists

Our pentest came back with one finding:

> *"Application does not implement Content-Security-Policy headers. XSS payloads executed without restriction."*

We had Sanctum, CSRF tokens, input validation. What we didn't have was a CSP header.

The implementation turned out to have several non-obvious failure modes that aren't in the Laravel docs:

- `Vite::useCspNonce($nonce)` must be called **before** `$next($request)` — skip it and `@vite()` silently fails to load
- `style-src-attr` is a separate directive from `style-src` and **cannot carry nonces** — must always be `'none'`
- `ws://localhost:5173` (Vite HMR) must **never** appear in production `connect-src`
- `style-src`, `style-src-elem`, and `style-src-attr` are three distinct directives, not aliases

This tool handles all of it so you don't debug it from scratch.

---

## What it does

**Input:** toggle your CDNs, integrations, and environment settings.

**Output — three tabs:**

| Tab | What you get |
|-----|-------------|
| **HTTP Header** | Full `Content-Security-Policy` string with policy strength score (A+ to D) and directive breakdown |
| **PHP Middleware** | Complete `SecureHeadersMiddleware` method + `bootstrap/app.php` registration + Blade nonce usage |
| **Checklist** | 12-item pre-enforcement checklist that adapts to your config |

**Three presets to start from:**

- **Strict** — minimal allowlist, nonce-only, recommended for new apps
- **Standard** — common CDNs, Google Fonts, GA4-ready
- **Local Dev** — Vite HMR WebSocket, report-only mode on

---

## Features

- **Nonce-based by default** — never `unsafe-inline`
- **Vite-aware** — generates `Vite::useCspNonce()` in the correct position
- **Livewire support** — nonce reminders for `@livewireScripts` and `@livewireScriptConfig`
- **Environment-aware** — Vite HMR WebSocket only in local, `upgrade-insecure-requests` skipped in local dev
- **Custom domains** — tag inputs for `script-src`, `style-src`, `img-src`, `frame-src`, `connect-src`
- **Violation reporting** — `report-uri` in the policy, `Report-To` header for modern browsers
- **Report-only mode** — swap header name for safe testing before enforcing
- **Policy strength score** — real-time A+ to D grade based on nonce usage, HTTPS, allowlist size
- **Copy + Download** — copy any output block or download the PHP file directly
- **100% client-side** — no data sent anywhere, no signup, no backend

---

## What the PHP output looks like

```php
protected function addContentSecurityPolicy(
    Response $response,
    string $nonce,
    Request $request
): void {
    $isLocal = app()->environment('local');

    $policy = [
        "default-src 'self'",
        "script-src 'self' 'nonce-{$nonce}' https://cdn.jsdelivr.net",
        "style-src 'self' 'nonce-{$nonce}' https://fonts.googleapis.com",
        "style-src-elem 'self' 'nonce-{$nonce}' https://fonts.googleapis.com",
        "style-src-attr 'none'",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data:",
        "frame-src 'self'",
        "connect-src 'self'" . ($isLocal ? " ws://localhost:5173 wss://localhost:5173" : ""),
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
        'report-uri /api/csp-violation-report',
    ];

    $response->headers->set(
        'Content-Security-Policy',
        implode('; ', $policy)
    );
}
```

The full output also includes the nonce generation, `View::share()`, `Vite::useCspNonce()`, HSTS, `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and header cleanup — all in one middleware.

---

## The three CSS directives — why they're separate

Most CSP implementations get this wrong. A quick reference:

| Directive | Covers | Can carry a nonce? |
|-----------|--------|-------------------|
| `style-src` | CSS `@import` rules inside stylesheets · base fallback | N/A (external files) |
| `style-src-elem` | `<link rel="stylesheet">` and `<style>` blocks | ✓ Yes |
| `style-src-attr` | Inline `style=""` attributes | ✗ No — always `'none'` |

Setting `style-src 'nonce-x'` without explicitly setting `style-src-attr` means the browser applies nonce gating to `style=""` attributes — which can never satisfy it. The generator always sets all three explicitly.

---

## Violation reporting

The generated middleware includes `report-uri /api/csp-violation-report` in the policy. The companion blog post covers building the full `CspReportController` — including browser extension noise filtering, low-risk vs high-risk classification, and rate-limited threshold alerting that fires when the same IP triggers the same directive violation 10+ times in 60 seconds.

→ [Read the violation reporting implementation](https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel#csp-violation-reporting)

---

## Deploy safely — report-only first

Before enforcing, use `Content-Security-Policy-Report-Only`. The generator has a toggle for this — it swaps the header name in the PHP output.

1. Toggle **Report-only mode** on
2. Deploy and watch your violation logs for 1–2 weeks
3. Fix any legitimate resources you forgot to allowlist
4. Toggle off and re-deploy with enforcement on

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

## Contributing

Bug reports and PRs are welcome.

**Common things to contribute:**
- New integration toggles (e.g. Stripe, Intercom, Sentry)
- Additional checklist items
- Corrections to directive descriptions
- Translations

Open an issue first for anything significant so we can discuss before you build it.

---

## Licence

MIT — do whatever you want with it. Attribution appreciated but not required.

---

Built by [Shakil](https://blog.shakiltech.com) · [Blog post](https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel) · [Live tool](https://csp-generator.shakiltech.com)