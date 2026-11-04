<?php

declare(strict_types=1);

// Single source for the visible FAQ and its FAQPage JSON-LD, so the two can never drift.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

/** @return list<array{q: string, a_html: string}> */
function faq_items(): array
{
    return [
        [
            'q' => 'What is a Content Security Policy (CSP)?',
            'a_html' => 'A CSP is an HTTP response header that tells browsers which sources of scripts, styles, images, and other resources are allowed to load on your page. It\'s your primary defense against <strong>cross-site scripting (XSS)</strong> - if malicious code is injected into your HTML, the browser refuses to execute it because it doesn\'t come from an approved source.',
        ],
        [
            'q' => 'Should I use report-only mode before enforcing?',
            'a_html' => 'Yes - always. Set <code>Content-Security-Policy-Report-Only</code> with a <code>report-to</code> endpoint first. Browsers log violations but block nothing. Run it in production for 1-2 weeks, review the reports, fix any legitimate sources, then switch to enforcement mode.',
        ],
        [
            'q' => 'Can I use CSP with CDNs or third-party scripts?',
            'a_html' => 'Yes, but carefully. Add the CDN hostname to the correct directive - e.g. <code>script-src cdn.example.com</code>. Avoid <code>\'unsafe-inline\'</code> or <code>*</code> wildcards - they defeat the purpose. For extra protection, add <strong>Subresource Integrity (SRI)</strong> hashes to your <code>&lt;script&gt;</code> and <code>&lt;link&gt;</code> tags.',
        ],
        [
            'q' => 'Does CSP break my existing Laravel app?',
            'a_html' => 'It can - if you have inline scripts or styles without nonces. Use <code>Report-Only</code> mode first. The browser reports violations but blocks nothing. Run it for a week, fix your templates, then enforce.',
        ],
        [
            'q' => 'My Vite HMR stopped working after adding CSP.',
            'a_html' => 'Two things. First, make sure <code>Vite::useCspNonce($nonce)</code> is called before <code>$next($request)</code>. Second, in local development the Vite dev server must be allowed in <code>script-src</code> and <code>style-src</code>, and its WebSocket in <code>connect-src</code>. The generated middleware adds them only when <code>app()->environment(\'local\')</code> is true. Enter your Vite host under Local development above (for example <code>https://app.test:5173</code> on Herd) and switch the Header tab to Local to see that policy.',
        ],
        [
            'q' => 'Do I need CSP if I already have CSRF protection?',
            'a_html' => 'Yes. They protect against different attacks. CSRF prevents forged requests from other domains. CSP prevents injected scripts from running on your domain. One doesn\'t substitute for the other.',
        ],
        [
            'q' => 'What\'s the difference between report-uri and report-to?',
            'a_html' => '<code>report-uri</code> is the original mechanism and still the most widely supported. <code>report-to</code> is the newer Reporting API: it names an endpoint declared in a <code>Reporting-Endpoints</code> header, and browsers batch the reports. Send both until every browser you support handles <code>report-to</code>, or use a hosted collector such as <a href="https://report-uri.com" target="_blank" rel="noopener">report-uri.com</a>.',
        ],
        [
            'q' => 'How do I handle CSP with Livewire?',
            'a_html' => 'For Livewire v2: <code>@livewireScripts([\'nonce\' => $cspNonce])</code>. For Livewire v3: <code>@livewireScriptConfig([\'nonce\' => $cspNonce])</code>. Livewire 3 also bundles the standard Alpine build, which needs <code>\'unsafe-eval\'</code>. Turn on Livewire 3 under Stack above and the policy, Blade snippets and checklist follow.',
        ],
        [
            'q' => 'How do I find everything my site loads?',
            'a_html' => 'Open Tools and use the discovery bookmarklet: drag it to your bookmarks bar, open your site, and click it. It lists every origin the page loaded, grouped by type, and preselects the services it recognises. <strong>Scan my site</strong> does the same from the page HTML, but only sees what loads without interaction.',
        ],
        [
            'q' => 'Is it safe to scan my site with this tool?',
            'a_html' => 'Scanning fetches one page over HTTPS with a fixed user agent, follows at most three redirects, and stops after 5 seconds or 1 MB. Nothing about the request or the page is stored or logged, and private or internal addresses are refused. Your browser reads the HTML without running any of its scripts.',
        ],
    ];
}

function faq_jsonld(array $items): string
{
    $entities = array_map(fn (array $item) => [
        '@type' => 'Question',
        'name' => $item['q'],
        'acceptedAnswer' => ['@type' => 'Answer', 'text' => html_entity_decode(strip_tags($item['a_html']), ENT_QUOTES | ENT_HTML5, 'UTF-8')],
    ], $items);

    return json_encode(['@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $entities], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE | JSON_HEX_TAG | JSON_THROW_ON_ERROR);
}
