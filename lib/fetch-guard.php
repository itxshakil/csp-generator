<?php

declare(strict_types=1);

// Fetches a page for "Scan my site" without becoming an open proxy or an SSRF vector.
// Every hop is validated, every host is resolved here, and the connection is pinned to the checked IP.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

const SCAN_MAX_REDIRECTS = 3;
const SCAN_MAX_BYTES = 1048576;
const SCAN_TIMEOUT = 5;
const SCAN_USER_AGENT = 'CSP-Generator-Scanner/1.0 (+https://csp-generator.shakiltech.com)';
const SCAN_HOST = '/^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)*[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.?$/i';

function scan_url_error(string $url): ?string
{
    if (strlen($url) > 2048) {
        return 'That URL is too long.';
    }
    $parts = parse_url($url);
    if ($parts === false && preg_match('#^https?://#i', $url)) {
        return 'The URL has no host.';
    }
    $scheme = strtolower((string) ($parts['scheme'] ?? ''));
    if ($parts === false || !in_array($scheme, ['http', 'https'], true)) {
        return 'Only http:// and https:// URLs can be scanned.';
    }
    if (isset($parts['user']) || isset($parts['pass'])) {
        return 'URLs with credentials (user:password@) are not allowed.';
    }
    if (isset($parts['port']) && !in_array($parts['port'], [80, 443], true)) {
        return 'Only the standard ports 80 and 443 can be scanned.';
    }
    $host = (string) ($parts['host'] ?? '');
    if ($host === '') {
        return 'The URL has no host.';
    }
    if (strlen($host) > 253) {
        return 'The host name is too long.';
    }
    if (str_starts_with($host, '[')) {
        return filter_var(trim($host, '[]'), FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) ? null : 'That is not a valid host.';
    }
    if (preg_match('/[^\x00-\x7F]/', $host)) {
        return 'Enter international host names in their punycode form (xn--...).';
    }
    // Browsers and curl read 127.1, 0x7f000001, 2130706433 and a numeric last label as IPv4.
    // Only the standard dotted form is allowed, so the address we check is the address curl connects to.
    $labels = explode('.', rtrim($host, '.'));
    if (preg_match('/^(0x[0-9a-f]*|[0-9]+)$/i', end($labels))) {
        $ip = filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4);
        return $ip !== false && long2ip((int) ip2long($ip)) === $host ? null : 'Use a host name or a standard IP address such as 93.184.215.14.';
    }
    if (!preg_match(SCAN_HOST, $host)) {
        return 'That is not a valid host.';
    }
    return null;
}

/** @param list<array{0: string, 1: int}> $ranges binary network and prefix length */
function ip_in_ranges(string $packed, array $ranges): bool
{
    foreach ($ranges as [$network, $bits]) {
        if (strlen($network) !== strlen($packed)) {
            continue;
        }
        $bytes = intdiv($bits, 8);
        $rest = $bits % 8;
        if (substr($packed, 0, $bytes) !== substr($network, 0, $bytes)) {
            continue;
        }
        if ($rest === 0) {
            return true;
        }
        $mask = (0xff << (8 - $rest)) & 0xff;
        if ((ord($packed[$bytes]) & $mask) === (ord($network[$bytes]) & $mask)) {
            return true;
        }
    }
    return false;
}

function cidrs(array $list): array
{
    return array_map(function (string $cidr): array {
        [$ip, $bits] = explode('/', $cidr);
        return [inet_pton($ip), (int) $bits];
    }, $list);
}

function is_public_ip(string $ip): bool
{
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        return false;
    }
    $packed = inet_pton($ip);
    static $v4 = null;
    static $v6 = null;
    $v4 ??= cidrs([
        '0.0.0.0/8', '10.0.0.0/8', '100.64.0.0/10', '127.0.0.0/8', '169.254.0.0/16', '172.16.0.0/12', '192.0.0.0/24',
        '192.0.2.0/24', '192.168.0.0/16', '198.18.0.0/15', '198.51.100.0/24', '203.0.113.0/24', '224.0.0.0/4', '240.0.0.0/4',
    ]);
    $v6 ??= cidrs(['2001::/23', '2001:db8::/32']);
    if (strlen($packed) === 4) {
        return !ip_in_ranges($packed, $v4);
    }
    // IPv4-mapped (::ffff:a.b.c.d): judge the embedded address.
    if (str_starts_with($packed, str_repeat("\0", 10) . "\xff\xff")) {
        return is_public_ip(inet_ntop(substr($packed, 12)));
    }
    // 6to4 (2002::/16) carries an IPv4 address in bits 16 to 48.
    if (str_starts_with($packed, "\x20\x02")) {
        return is_public_ip(inet_ntop(substr($packed, 2, 4)));
    }
    // Only global unicast (2000::/3) can be public. That excludes ::, ::1, IPv4-compatible, NAT64, ULA,
    // link-local, site-local, multicast and 100::/64 in one rule. 2001::/23 (Teredo and other IETF blocks)
    // and the documentation range are refused too.
    if ((ord($packed[0]) & 0xe0) !== 0x20) {
        return false;
    }
    return !ip_in_ranges($packed, $v6);
}

/** @return array{ip: ?string, error: ?string} */
function resolve_public_ip(string $host, callable $resolver): array
{
    $literal = trim($host, '[]');
    if (filter_var($literal, FILTER_VALIDATE_IP)) {
        return is_public_ip($literal)
            ? ['ip' => $literal, 'error' => null]
            : ['ip' => null, 'error' => "{$host} is a private or reserved address."];
    }
    $ips = $resolver(rtrim($host, '.'));
    if ($ips === []) {
        return ['ip' => null, 'error' => "Could not find {$host}. Check the spelling."];
    }
    foreach ($ips as $ip) {
        if (!is_public_ip($ip)) {
            return ['ip' => null, 'error' => "{$host} points to a private or reserved address, which cannot be scanned."];
        }
    }
    $v4 = array_values(array_filter($ips, fn ($ip) => filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4)));
    return ['ip' => $v4[0] ?? $ips[0], 'error' => null];
}

function dns_resolver(string $host): array
{
    $records = dns_get_record($host, DNS_A | DNS_AAAA);
    if ($records === false) {
        return [];
    }
    $ips = [];
    foreach ($records as $r) {
        if (isset($r['ip'])) {
            $ips[] = $r['ip'];
        } elseif (isset($r['ipv6'])) {
            $ips[] = $r['ipv6'];
        }
    }
    return $ips;
}

function resolve_location(string $base, string $location): string
{
    if (preg_match('/^[a-z][a-z0-9+.-]*:/i', $location)) {
        return $location;
    }
    $b = parse_url($base);
    $origin = $b['scheme'] . '://' . $b['host'] . (isset($b['port']) ? ':' . $b['port'] : '');
    if (str_starts_with($location, '//')) {
        return $b['scheme'] . ':' . $location;
    }
    if (str_starts_with($location, '/')) {
        return $origin . $location;
    }
    $path = $b['path'] ?? '/';
    return $origin . substr($path, 0, (int) strrpos($path, '/') + 1) . $location;
}

/**
 * @param callable(string): list<string> $resolver host to IPs
 * @param callable(string, string): array{status: int, headers: list<array{0: string, 1: string}>, body: string, truncated: bool, error: ?string} $transport
 */
function guarded_fetch(string $url, callable $resolver, callable $transport): array
{
    $fail = fn (string $error, array $redirects = []) => ['ok' => false, 'error' => $error, 'redirects' => $redirects];
    $redirects = [];
    for ($hop = 0; $hop <= SCAN_MAX_REDIRECTS; $hop++) {
        $error = scan_url_error($url);
        if ($error !== null) {
            return $fail($hop === 0 ? $error : "The site redirected to {$url}: {$error}", $redirects);
        }
        $resolved = resolve_public_ip((string) parse_url($url, PHP_URL_HOST), $resolver);
        if ($resolved['error'] !== null) {
            return $fail($hop === 0 ? $resolved['error'] : "The site redirected to {$url}: {$resolved['error']}", $redirects);
        }
        $response = $transport($url, $resolved['ip']);
        if ($response['error'] !== null) {
            return $fail($response['error'], $redirects);
        }
        $location = null;
        foreach ($response['headers'] as [$name, $value]) {
            if (strtolower($name) === 'location') {
                $location = trim($value);
            }
        }
        if (in_array($response['status'], [301, 302, 303, 307, 308], true) && $location !== null && $location !== '') {
            $redirects[] = $url;
            $url = resolve_location($url, $location);
            continue;
        }
        return [
            'ok' => true, 'error' => null, 'status' => $response['status'], 'finalUrl' => $url, 'redirects' => $redirects,
            'headers' => $response['headers'], 'html' => $response['body'], 'truncated' => $response['truncated'],
        ];
    }
    return $fail('Too many redirects (more than ' . SCAN_MAX_REDIRECTS . ').', $redirects);
}

/** One GET, pinned to the IP that was checked, no redirects, no cookies, capped in time and size. */
function curl_transport(string $url, string $ip): array
{
    $parts = parse_url($url);
    $port = $parts['port'] ?? (strtolower($parts['scheme']) === 'https' ? 443 : 80);
    $pinned = str_contains($ip, ':') ? "[{$ip}]" : $ip;
    $headers = [];
    $body = '';
    $truncated = false;
    $ch = curl_init();
    curl_setopt_array($ch, [
        CURLOPT_URL => $url,
        CURLOPT_RESOLVE => ["{$parts['host']}:{$port}:{$pinned}"],
        CURLOPT_HTTPGET => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
        CURLOPT_PROXY => '',
        CURLOPT_NOPROXY => '*',
        CURLOPT_TIMEOUT => SCAN_TIMEOUT,
        CURLOPT_CONNECTTIMEOUT => SCAN_TIMEOUT,
        CURLOPT_USERAGENT => SCAN_USER_AGENT,
        CURLOPT_ENCODING => '',
        CURLOPT_HEADERFUNCTION => function ($ch, string $line) use (&$headers): int {
            $pos = strpos($line, ':');
            if ($pos !== false) {
                $headers[] = [strtolower(trim(substr($line, 0, $pos))), trim(substr($line, $pos + 1))];
            }
            return strlen($line);
        },
        CURLOPT_WRITEFUNCTION => function ($ch, string $chunk) use (&$body, &$truncated): int {
            $room = SCAN_MAX_BYTES - strlen($body);
            if (strlen($chunk) >= $room) {
                $body .= substr($chunk, 0, $room);
                $truncated = true;
                return -1;
            }
            $body .= $chunk;
            return strlen($chunk);
        },
    ]);
    curl_exec($ch);
    $errno = curl_errno($ch);
    $status = (int) curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $connected = (string) curl_getinfo($ch, CURLINFO_PRIMARY_IP);
    $message = curl_error($ch);

    if ($connected !== '' && inet_pton($connected) !== inet_pton($ip)) {
        return ['status' => 0, 'headers' => [], 'body' => '', 'truncated' => false, 'error' => 'The connection did not go to the checked address.'];
    }
    if ($errno === CURLE_OPERATION_TIMEDOUT) {
        return ['status' => 0, 'headers' => [], 'body' => '', 'truncated' => false, 'error' => 'The site did not answer within ' . SCAN_TIMEOUT . ' seconds.'];
    }
    if ($errno !== 0 && !($errno === CURLE_WRITE_ERROR && $truncated)) {
        return ['status' => 0, 'headers' => [], 'body' => '', 'truncated' => false, 'error' => "Could not fetch the page ({$message})."];
    }
    return ['status' => $status, 'headers' => $headers, 'body' => $body, 'truncated' => $truncated, 'error' => null];
}
