<?php

declare(strict_types=1);

require __DIR__ . '/lib/csp-report.php';
require __DIR__ . '/lib/rate-limit.php';

const REPORT_LOG  = __DIR__ . '/data/csp-reports.log';
const REPORT_RATE = __DIR__ . '/data/csp-rate.json';

$type = strtolower(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]);
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST' || !in_array($type, ['application/csp-report', 'application/reports+json'], true)) {
    http_response_code(405);
    exit;
}

if (rate_limited(REPORT_RATE, $_SERVER['REMOTE_ADDR'] ?? '', 30, 3600)) {
    http_response_code(429);
    exit;
}

$body = (string) file_get_contents('php://input', length: 16385);
http_response_code(append_report($body, REPORT_LOG) ? 204 : 400);
