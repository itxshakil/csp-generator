<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/scan-endpoint.php';

const SCAN_ORIGIN = 'https://csp-generator.test';

function scan_request(array $server = [], ?string $body = null, ?callable $transport = null, ?string $rateFile = null): array
{
    $server += ['REQUEST_METHOD' => 'POST', 'HTTP_ORIGIN' => SCAN_ORIGIN, 'CONTENT_TYPE' => 'application/json', 'REMOTE_ADDR' => '203.0.113.9'];
    $body ??= json_encode(['url' => 'https://example.com/']);
    $transport ??= fn (string $url, string $ip): array => ['status' => 200, 'headers' => [['x-powered-by', 'PHP/8.1']], 'body' => '<p>hi</p>', 'truncated' => false, 'error' => null];
    $resolver = fn (string $host): array => ['example.com' => ['93.184.215.14'], 'localhost' => ['127.0.0.1']][$host] ?? [];
    $rateFile ??= sys_get_temp_dir() . '/csp-scan-test-' . bin2hex(random_bytes(4)) . '.json';
    try {
        return handle_scan($server, $body, $resolver, $transport, $rateFile, SCAN_ORIGIN);
    } finally {
        if (is_file($rateFile) && !str_contains($rateFile, 'keep')) {
            unlink($rateFile);
        }
    }
}

return [
    'a valid request returns the guard result' => function () {
        $r = scan_request();
        assert_same(200, $r['status']);
        assert_same(true, $r['body']['ok']);
        assert_same('https://example.com/', $r['body']['finalUrl']);
        assert_same([['x-powered-by', 'PHP/8.1']], $r['body']['headers']);
        assert_same('<p>hi</p>', $r['body']['html']);
    },
    'non-POST is 405' => fn () => assert_same(405, scan_request(['REQUEST_METHOD' => 'GET'])['status']),
    'a foreign or missing Origin is 403' => function () {
        assert_same(403, scan_request(['HTTP_ORIGIN' => 'https://evil.example'])['status']);
        $server = ['REQUEST_METHOD' => 'POST', 'CONTENT_TYPE' => 'application/json', 'REMOTE_ADDR' => '1.1.1.1'];
        $r = handle_scan($server, '{"url":"https://example.com"}', fn () => [], fn () => [], sys_get_temp_dir() . '/unused.json', SCAN_ORIGIN);
        assert_same(403, $r['status']);
    },
    'a non-JSON content type is 415' => fn () => assert_same(415, scan_request(['CONTENT_TYPE' => 'text/plain'])['status']),
    'bad JSON or a missing url is 400' => function () {
        assert_same(400, scan_request([], '{nope')['status']);
        assert_same(400, scan_request([], '{"u":"x"}')['status']);
        assert_same(400, scan_request([], '{"url":["x"]}')['status']);
        assert_same(400, scan_request([], str_repeat('a', 5000))['status']);
    },
    'a refused URL is 422 with the reason' => function () {
        $r = scan_request([], '{"url":"http://localhost/"}');
        assert_same(422, $r['status']);
        assert_true(str_contains($r['body']['error'], 'private'), $r['body']['error']);
    },
    'a fetch failure is 502' => function () {
        $down = fn (): array => ['status' => 0, 'headers' => [], 'body' => '', 'truncated' => false, 'error' => 'The site did not answer within 5 seconds.'];
        $r = scan_request([], null, $down);
        assert_same(502, $r['status']);
        assert_true(str_contains($r['body']['error'], '5 seconds'), $r['body']['error']);
    },
    'the 21st scan in an hour is 429' => function () {
        $file = sys_get_temp_dir() . '/csp-scan-keep-' . bin2hex(random_bytes(4)) . '.json';
        try {
            for ($i = 0; $i < 20; $i++) {
                assert_same(200, scan_request([], null, null, $file)['status'], "scan {$i}");
            }
            assert_same(429, scan_request([], null, null, $file)['status']);
        } finally {
            unlink($file);
        }
    },
    'scan.php sends JSON, nosniff and no-store, and only wires the real resolver and transport' => function () {
        $src = (string) file_get_contents(__DIR__ . '/../../scan.php');
        foreach (['application/json', 'X-Content-Type-Options: nosniff', 'Cache-Control: no-store', "'dns_resolver'", "'curl_transport'", 'request_origin()'] as $needle) {
            assert_true(str_contains($src, $needle), "scan.php must contain {$needle}");
        }
        assert_true(!preg_match('/error_log|file_put_contents|syslog/', $src), 'scan.php must not log');
    },
];
