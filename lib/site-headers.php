<?php

declare(strict_types=1);

// Security headers for this site. It ships the same kind of strict, nonce-based policy it recommends.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

const SITE_ORIGIN = 'https://csp-generator.shakiltech.com';

function site_nonce(): string
{
    return base64_encode(random_bytes(16));
}

function site_csp(string $nonce, string $origin): string
{
    // GA4 (gtag) and Microsoft Clarity are the only third parties. Fonts are self-hosted.
    $ga      = 'https://*.google-analytics.com https://*.analytics.google.com https://*.googletagmanager.com';
    $clarity = 'https://www.clarity.ms https://*.clarity.ms';

    $directives = [
        "default-src 'self'",
        "script-src 'self' 'nonce-{$nonce}' https://www.googletagmanager.com {$clarity}",
        "style-src 'self' 'nonce-{$nonce}'",
        "style-src-attr 'none'",
        "font-src 'self'",
        "img-src 'self' data: {$ga} {$clarity} https://c.bing.com",
        "connect-src 'self' {$ga} {$clarity} https://c.bing.com",
        "manifest-src 'self'",
        "worker-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self' " . SITE_ORIGIN,
        "frame-ancestors 'none'",
        'upgrade-insecure-requests',
        'report-to csp',
        'report-uri /csp-report.php',
    ];

    return implode('; ', $directives);
}

function send_site_headers(string $nonce, string $origin): void
{
    header('Content-Security-Policy: ' . site_csp($nonce, $origin));
    header('Reporting-Endpoints: csp="' . $origin . '/csp-report.php"');
    header('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    header('X-Content-Type-Options: nosniff');
    header('Referrer-Policy: strict-origin-when-cross-origin');
    header('Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=()');
    header('X-Frame-Options: DENY');
    header_remove('X-Powered-By');
}

function request_origin(): string
{
    $host = $_SERVER['HTTP_HOST'] ?? '';
    // Only trust hosts we serve; anything else falls back to production.
    if (preg_match('/^[a-z0-9.-]+\.(test|localhost)(:\d+)?$/i', $host) === 1) {
        return 'https://' . strtolower($host);
    }
    return SITE_ORIGIN;
}
