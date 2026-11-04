<?php

declare(strict_types=1);

// The logic behind scan.php, kept free of globals so the tests can drive it.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

require_once __DIR__ . '/fetch-guard.php';
require_once __DIR__ . '/rate-limit.php';

const SCAN_RATE_MAX = 20;
const SCAN_RATE_WINDOW = 3600;
// Bounds the whole site, so spoofed Origins and many addresses still cannot turn this into a proxy.
const SCAN_RATE_GLOBAL = 300;
const SCAN_MAX_REQUEST = 4096;

/** @return array{status: int, body: array<string, mixed>} */
function handle_scan(array $server, string $body, ?callable $resolver, callable $transport, string $rateFile, string $siteOrigin): array
{
    $reply = fn (int $status, array $data) => ['status' => $status, 'body' => $data];
    $error = fn (int $status, string $message) => $reply($status, ['ok' => false, 'error' => $message]);

    if (($server['REQUEST_METHOD'] ?? '') !== 'POST') {
        return $error(405, 'Use POST.');
    }
    if (($server['HTTP_ORIGIN'] ?? '') !== $siteOrigin) {
        return $error(403, 'Scans can only be started from the generator.');
    }
    if (strtolower(trim(explode(';', $server['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
        return $error(415, 'Send JSON.');
    }
    if (strlen($body) > SCAN_MAX_REQUEST) {
        return $error(400, 'The request is too large.');
    }
    try {
        $data = json_decode($body, true, 4, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return $error(400, 'The request is not valid JSON.');
    }
    if (!is_array($data) || !is_string($data['url'] ?? null) || trim($data['url']) === '') {
        return $error(400, 'Send {"url": "https://..."}.');
    }
    $visitor = rate_key((string) ($server['REMOTE_ADDR'] ?? ''), scan_secret(dirname($rateFile) . '/scan-secret'));
    if (rate_limited($rateFile, $visitor, SCAN_RATE_MAX, SCAN_RATE_WINDOW)) {
        return $error(429, 'You have run ' . SCAN_RATE_MAX . ' scans this hour. Try again later.');
    }
    if (rate_limited($rateFile, 'site-wide', SCAN_RATE_GLOBAL, SCAN_RATE_WINDOW)) {
        return $error(429, 'The scanner is busy. Try again later.');
    }

    $url = trim($data['url']);
    if (!preg_match('#^[a-z][a-z0-9+.-]*://#i', $url)) {
        $url = 'https://' . $url;
    }
    $result = guarded_fetch($url, $resolver, $transport);
    if (!$result['ok']) {
        return $error($result['refused'] ? 422 : 502, $result['error']);
    }
    return $reply(200, $result);
}
