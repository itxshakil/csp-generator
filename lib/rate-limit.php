<?php

declare(strict_types=1);

// Fixed-window rate limit per visitor, stored in one JSON file under an exclusive lock.
// Callers pass keys from rate_key(), an HMAC with a server secret, so the file never holds a reversible IP.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

function rate_limited(string $file, string $key, int $max, int $window, ?int $now = null): bool
{
    $now ??= time();
    $dir = dirname($file);
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
        throw new RuntimeException("Cannot create {$dir}");
    }
    $fp = fopen($file, 'c+');
    if ($fp === false) {
        throw new RuntimeException("Cannot open {$file}");
    }
    try {
        flock($fp, LOCK_EX);
        $map = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];
        $map = array_filter($map, fn ($v) => is_array($v) && ($v[1] ?? 0) > $now);
        $hash = hash('sha256', $key);
        $entry = $map[$hash] ?? [0, $now + $window];
        if ($entry[0] >= $max) {
            return true;
        }
        $entry[0]++;
        $map[$hash] = $entry;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($map));
        return false;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}

// IPv6 visitors control a whole /64, so they are limited per /64. IPv4 addresses are used as they are.
function rate_key(string $ip, string $secret): string
{
    $packed = filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) ? inet_pton($ip) : false;
    $subject = $packed !== false ? 'v6:' . bin2hex(substr($packed, 0, 8)) : 'v4:' . $ip;
    return hash_hmac('sha256', $subject, $secret);
}

// A random secret created on first use and kept in data/, which is never served.
function scan_secret(string $file): string
{
    $existing = is_file($file) ? trim((string) file_get_contents($file)) : '';
    if (preg_match('/^[0-9a-f]{64}$/', $existing)) {
        return $existing;
    }
    $dir = dirname($file);
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
        throw new RuntimeException("Cannot create {$dir}");
    }
    $secret = bin2hex(random_bytes(32));
    if (file_put_contents($file, $secret, LOCK_EX) === false) {
        throw new RuntimeException("Cannot write {$file}");
    }
    chmod($file, 0600);
    return $secret;
}
