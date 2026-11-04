<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/site-headers.php';

function render_index(): array
{
    ob_start();
    $cspNonce = null;
    (function () use (&$cspNonce) {
        include __DIR__ . '/../../index.php';
        $cspNonce = $nonce ?? null;
    })();
    return [ob_get_clean(), $cspNonce];
}

return [
    'site_nonce is 16 random bytes in base64' => function () {
        $a = site_nonce();
        assert_same(16, strlen(base64_decode($a, true)));
        assert_true($a !== site_nonce(), 'nonce must differ per call');
    },
    'site_csp is strict and complete' => function () {
        $csp = site_csp('abc', 'https://x');
        foreach ([
            "script-src 'self' 'nonce-abc'",
            "style-src-attr 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "frame-ancestors 'none'",
            'upgrade-insecure-requests',
            'report-to csp',
            'report-uri /csp-report.php',
        ] as $needle) {
            assert_true(str_contains($csp, $needle), "missing: {$needle}");
        }
        assert_true(!str_contains($csp, 'unsafe-inline'), 'must not contain unsafe-inline');
        assert_true(!str_contains($csp, 'unsafe-eval'), 'must not contain unsafe-eval');
    },
    'index.php has no inline handlers, style attributes, or un-nonced scripts' => function () {
        [$html, $nonce] = render_index();
        assert_true(is_string($nonce) && $nonce !== '', 'index.php must expose $nonce');
        assert_true(preg_match('/<[^>]+\son[a-z]+\s*=/i', $html) === 0, 'inline event handler found');
        assert_true(preg_match('/<[^>]+\sstyle\s*=/i', $html) === 0, 'style attribute found');
        preg_match_all('/<script\b[^>]*>/i', $html, $m);
        foreach ($m[0] as $tag) {
            if (str_contains($tag, 'application/ld+json')) {
                continue;
            }
            assert_true(str_contains($tag, 'nonce="' . htmlspecialchars($nonce) . '"'), "script without nonce: {$tag}");
        }
        preg_match_all('/<link\b[^>]*rel="stylesheet"[^>]*>/i', $html, $l);
        foreach ($l[0] as $tag) {
            assert_true(str_contains($tag, 'nonce="' . htmlspecialchars($nonce) . '"'), "stylesheet without nonce: {$tag}");
        }
    },
];
