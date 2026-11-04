<?php

declare(strict_types=1);

// Fixed-window rate limit per visitor, stored in one JSON file under an exclusive lock.
// Keys are hashed, so the file never holds an IP address.

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
