<?php

declare(strict_types=1);

// Fetches one page for "Scan my site" and "Check deployed headers". See lib/fetch-guard.php for the rules.
// Nothing about the request or the response is logged.

require __DIR__ . '/lib/site-headers.php';
require __DIR__ . '/lib/scan-endpoint.php';

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header_remove('X-Powered-By');

$result = handle_scan(
    $_SERVER,
    (string) file_get_contents('php://input', length: SCAN_MAX_REQUEST + 1),
    'dns_resolver',
    'curl_transport',
    __DIR__ . '/data/scan-rate.json',
    request_origin(),
);

http_response_code($result['status']);
echo json_encode($result['body'], JSON_UNESCAPED_SLASHES | JSON_INVALID_UTF8_SUBSTITUTE | JSON_THROW_ON_ERROR);
