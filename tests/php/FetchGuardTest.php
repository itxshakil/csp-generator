<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/fetch-guard.php';
require_once __DIR__ . '/../../lib/rate-limit.php';

const PUBLIC_IP = '93.184.215.14';

function fake_resolver(array $map): callable
{
    return fn (string $host): array => $map[$host] ?? [];
}

/** A transport that answers from a script of responses keyed by URL, and records every call. */
function fake_transport(array $responses, array &$calls): callable
{
    return function (string $url, ?string $ip, int $timeoutMs = 5000) use ($responses, &$calls): array {
        $calls[] = [$url, $ip];
        return $responses[$url] ?? ['status' => 200, 'headers' => [['content-type', 'text/html']], 'body' => '<p>ok</p>', 'truncated' => false, 'error' => null];
    };
}

function redirect_to(string $location, int $status = 302): array
{
    return ['status' => $status, 'headers' => [['location', $location]], 'body' => '', 'truncated' => false, 'error' => null];
}

return [
    'scan_url_error accepts plain http and https URLs' => function () {
        foreach (['https://example.com', 'http://example.com/path?q=1', 'https://example.com:443/', 'http://sub.example.co.uk:80'] as $url) {
            assert_same(null, scan_url_error($url), $url);
        }
    },
    'scan_url_error refuses other schemes, ports, credentials and bad hosts' => function () {
        $cases = [
            'ftp://example.com' => 'http',
            'file:///etc/passwd' => 'http',
            'gopher://example.com' => 'http',
            'https://example.com:8080' => 'port',
            'https://user:pass@example.com' => 'credentials',
            'https://user@example.com' => 'credentials',
            'https://' . str_repeat('a', 250) . '.com' => 'long',
            'https://' => 'host',
            'not a url' => 'http',
            'https://exa mple.com' => 'host',
            'https://exämple.com' => 'punycode',
        ];
        foreach ($cases as $url => $needle) {
            $error = scan_url_error($url);
            assert_true($error !== null && str_contains(strtolower($error), $needle), "{$url}: " . var_export($error, true));
        }
    },
    'non-standard IPv4 spellings are refused before any lookup' => function () {
        foreach (['http://127.1', 'http://0x7f000001', 'http://2130706433', 'http://0177.0.0.1', 'http://a.0x7f', 'http://example.123'] as $url) {
            assert_true(scan_url_error($url) !== null, $url);
        }
    },
    'is_public_ip refuses private, loopback, link-local, reserved and multicast ranges' => function () {
        foreach ([
            '0.0.0.0', '10.1.2.3', '100.64.0.1', '127.0.0.1', '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.0.0.1', '192.0.2.1',
            '192.168.1.1', '198.18.0.1', '198.51.100.1', '203.0.113.1', '224.0.0.1', '240.0.0.1', '255.255.255.255',
            '::', '::1', 'fc00::1', 'fd12::1', 'fe80::1', 'fec0::1', 'ff02::1', '2001:db8::1', '100::1',
            '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::127.0.0.1', '64:ff9b::7f00:1', '2002:7f00:1::1', '2001:0:4136:e378:8000:63bf:80ff:fffe',
        ] as $ip) {
            assert_true(!is_public_ip($ip), $ip);
        }
    },
    'is_public_ip accepts public IPv4, IPv6 and mapped public addresses' => function () {
        foreach ([PUBLIC_IP, '8.8.8.8', '172.32.0.1', '2606:4700::1111', '2001:4860:4860::8888', '::ffff:8.8.8.8', '2002:0808:0808::1'] as $ip) {
            assert_true(is_public_ip($ip), $ip);
        }
        assert_true(!is_public_ip('not an ip'), 'garbage');
    },
    'resolve_public_ip refuses empty, private and mixed answers' => function () {
        $resolver = fake_resolver(['ok.test' => [PUBLIC_IP], 'none.test' => [], 'private.test' => ['10.0.0.1'], 'mixed.test' => [PUBLIC_IP, '10.0.0.1'], 'v6.test' => ['::1', PUBLIC_IP]]);
        assert_same(['ip' => PUBLIC_IP, 'error' => null], resolve_public_ip('ok.test', $resolver));
        foreach (['none.test', 'private.test', 'mixed.test', 'v6.test'] as $host) {
            $r = resolve_public_ip($host, $resolver);
            assert_true($r['ip'] === null && $r['error'] !== null, $host);
        }
    },
    'resolve_public_ip checks IP literals without the resolver' => function () {
        $never = function (): array {
            throw new RuntimeException('resolver must not be called for IP literals');
        };
        assert_same(PUBLIC_IP, resolve_public_ip(PUBLIC_IP, $never)['ip']);
        foreach (['127.0.0.1', '[::1]', '[::ffff:127.0.0.1]', '169.254.169.254'] as $host) {
            assert_true(resolve_public_ip($host, $never)['ip'] === null, $host);
        }
    },
    'guarded_fetch fetches a public page through the validated IP' => function () {
        $calls = [];
        $r = guarded_fetch('https://example.com/', fake_resolver(['example.com' => [PUBLIC_IP]]), fake_transport([], $calls));
        assert_same(true, $r['ok']);
        assert_same(200, $r['status']);
        assert_same('https://example.com/', $r['finalUrl']);
        assert_same('<p>ok</p>', $r['html']);
        assert_same([['https://example.com/', PUBLIC_IP]], $calls);
    },
    'guarded_fetch refuses a private target without calling the transport' => function () {
        $calls = [];
        foreach (['http://127.0.0.1/', 'http://169.254.169.254/latest/meta-data/', 'http://[::ffff:127.0.0.1]/', 'http://localhost/'] as $url) {
            $r = guarded_fetch($url, fake_resolver(['localhost' => ['127.0.0.1']]), fake_transport([], $calls));
            assert_same(false, $r['ok'], $url);
        }
        assert_same([], $calls);
    },
    'a redirect to a private address is stopped at the second hop' => function () {
        $calls = [];
        $resolver = fake_resolver(['example.com' => [PUBLIC_IP], 'localhost' => ['127.0.0.1']]);
        $r = guarded_fetch('https://example.com/', $resolver, fake_transport(['https://example.com/' => redirect_to('http://localhost/admin')], $calls));
        assert_same(false, $r['ok']);
        assert_true(str_contains($r['error'], 'http://localhost/admin'), $r['error']);
        assert_same(1, count($calls));
    },
    'more than 3 redirects stop with "Too many redirects"' => function () {
        $calls = [];
        $responses = [];
        for ($i = 0; $i < 5; $i++) {
            $responses["https://example.com/{$i}"] = redirect_to('https://example.com/' . ($i + 1));
        }
        $r = guarded_fetch('https://example.com/0', fake_resolver(['example.com' => [PUBLIC_IP]]), fake_transport($responses, $calls));
        assert_same(false, $r['ok']);
        assert_true(str_contains($r['error'], 'Too many redirects'), $r['error']);
        assert_same(4, count($calls));
    },
    'relative and protocol-relative redirects are resolved and followed' => function () {
        $calls = [];
        $responses = [
            'https://example.com/a/b' => redirect_to('c'),
            'https://example.com/a/c' => redirect_to('/next', 301),
            'https://example.com/next' => redirect_to('//www.example.com/final', 308),
        ];
        $r = guarded_fetch('https://example.com/a/b', fake_resolver(['example.com' => [PUBLIC_IP], 'www.example.com' => [PUBLIC_IP]]), fake_transport($responses, $calls));
        assert_same(true, $r['ok']);
        assert_same('https://www.example.com/final', $r['finalUrl']);
        assert_same(['https://example.com/a/b', 'https://example.com/a/c', 'https://example.com/next'], $r['redirects']);
    },
    'a redirect to a non-http scheme is refused' => function () {
        $calls = [];
        $r = guarded_fetch('https://example.com/', fake_resolver(['example.com' => [PUBLIC_IP]]), fake_transport(['https://example.com/' => redirect_to('file:///etc/passwd')], $calls));
        assert_same(false, $r['ok']);
    },
    'transport errors and truncation are reported' => function () {
        $calls = [];
        $resolver = fake_resolver(['example.com' => [PUBLIC_IP], 'slow.example.com' => [PUBLIC_IP]]);
        $responses = [
            'https://slow.example.com/' => ['status' => 0, 'headers' => [], 'body' => '', 'truncated' => false, 'error' => 'The site did not answer within 5 seconds.'],
            'https://example.com/' => ['status' => 200, 'headers' => [], 'body' => str_repeat('a', 100), 'truncated' => true, 'error' => null],
        ];
        $slow = guarded_fetch('https://slow.example.com/', $resolver, fake_transport($responses, $calls));
        assert_same(false, $slow['ok']);
        assert_true(str_contains($slow['error'], '5 seconds'), $slow['error']);
        $big = guarded_fetch('https://example.com/', $resolver, fake_transport($responses, $calls));
        assert_same(true, $big['truncated']);
    },
    'rate_limited allows the limit, refuses the next, and resets after the window' => function () {
        $file = sys_get_temp_dir() . '/csp-rate-test-' . bin2hex(random_bytes(4)) . '.json';
        try {
            for ($i = 0; $i < 20; $i++) {
                assert_same(false, rate_limited($file, '1.2.3.4', 20, 3600, 1000), "request {$i}");
            }
            assert_same(true, rate_limited($file, '1.2.3.4', 20, 3600, 1000));
            assert_same(false, rate_limited($file, '5.6.7.8', 20, 3600, 1000), 'other visitors are not affected');
            assert_same(false, rate_limited($file, '1.2.3.4', 20, 3600, 4601), 'window reset');
            assert_true(!str_contains((string) file_get_contents($file), '1.2.3.4'), 'IPs are stored hashed');
        } finally {
            if (is_file($file)) {
                unlink($file);
            }
        }
    },
    'I1: one 5 second budget covers every hop, and each hop gets only what is left' => function () {
        $now = 0.0;
        $clock = function () use (&$now): float {
            return $now;
        };
        $budgets = [];
        $transport = function (string $url, ?string $ip, int $timeoutMs) use (&$now, &$budgets): array {
            $budgets[] = $timeoutMs;
            $now += 2.0;
            $next = ['https://example.com/0' => '/1', 'https://example.com/1' => '/2', 'https://example.com/2' => '/3'][$url] ?? null;
            return $next ? redirect_to($next) : ['status' => 200, 'headers' => [], 'body' => '', 'truncated' => false, 'error' => null];
        };
        $r = guarded_fetch('https://example.com/0', fake_resolver(['example.com' => [PUBLIC_IP]]), $transport, $clock);
        assert_same(false, $r['ok']);
        assert_true(str_contains($r['error'], '5 seconds'), $r['error']);
        assert_same([5000, 3000, 1000], $budgets);
    },
    'I1: without a resolver, host names go to the transport unresolved and IP literals are still checked' => function () {
        $calls = [];
        $r = guarded_fetch('https://example.com/', null, fake_transport([], $calls));
        assert_same(true, $r['ok']);
        assert_same([['https://example.com/', null]], $calls);
        $calls = [];
        $r = guarded_fetch('http://127.0.0.1/', null, fake_transport([], $calls));
        assert_same(false, $r['ok']);
        assert_same(true, $r['refused']);
        assert_same([], $calls);
    },
    'I1: refusals are marked so the endpoint can answer 422' => function () {
        $calls = [];
        $r = guarded_fetch('https://example.com/', fake_resolver(['example.com' => [PUBLIC_IP], 'localhost' => ['127.0.0.1']]), fake_transport(['https://example.com/' => redirect_to('http://localhost/')], $calls));
        assert_same(true, $r['refused']);
        $down = fn (): array => ['status' => 0, 'headers' => [], 'body' => '', 'truncated' => false, 'error' => 'down'];
        assert_same(false, guarded_fetch('https://example.com/', fake_resolver(['example.com' => [PUBLIC_IP]]), $down)['refused']);
    },
    'I1: the real transport refuses a public name that resolves to loopback before sending anything' => function () {
        $r = curl_transport('http://localtest.me/', null, 3000);
        assert_true($r['error'] !== null && str_contains($r['error'], 'private'), var_export($r['error'], true));
    },
    'I2: rate keys group an IPv6 /64, keep IPv4 exact, and never store a plain hash of the IP' => function () {
        assert_same(rate_key('2001:db8:1:2:aaaa::1', 's'), rate_key('2001:db8:1:2:ffff::9', 's'));
        assert_true(rate_key('2001:db8:1:3::1', 's') !== rate_key('2001:db8:1:2::1', 's'), 'other /64');
        assert_true(rate_key('1.2.3.4', 's') !== rate_key('1.2.3.5', 's'), 'IPv4 exact');
        assert_true(rate_key('1.2.3.4', 's') !== hash('sha256', '1.2.3.4'), 'keyed, not a plain hash');
        assert_true(rate_key('1.2.3.4', 's') !== rate_key('1.2.3.4', 't'), 'secret matters');
    },
    'I2: the scan secret is created once and kept' => function () {
        $file = sys_get_temp_dir() . '/csp-secret-' . bin2hex(random_bytes(4));
        try {
            $a = scan_secret($file);
            assert_same(64, strlen($a));
            assert_same($a, scan_secret($file));
        } finally {
            if (is_file($file)) {
                unlink($file);
            }
        }
    },
];
