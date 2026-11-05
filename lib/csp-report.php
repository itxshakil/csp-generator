<?php

declare(strict_types=1);

// Stores CSP violation reports sent by browsers visiting this site.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

function append_report(string $body, string $logPath, int $maxBodyBytes = 16384, int $maxLogBytes = 1048576): bool
{
    if ($body === '' || strlen($body) > $maxBodyBytes) {
        return false;
    }
    try {
        $decoded = json_decode($body, true, 32, JSON_THROW_ON_ERROR);
    } catch (JsonException) {
        return false;
    }
    if (!is_array($decoded)) {
        return false;
    }
    clearstatcache(true, $logPath);
    if (file_exists($logPath) && filesize($logPath) >= $maxLogBytes) {
        return false;
    }
    $line = date('c') . ' ' . json_encode($decoded, JSON_UNESCAPED_SLASHES) . "\n";
    return file_put_contents($logPath, $line, FILE_APPEND | LOCK_EX) !== false;
}

function report_rate_limited(string $rateFile, string $ip, int $max = 30, int $window = 3600): bool
{
    $dir = dirname($rateFile);
    if (!is_dir($dir) && !mkdir($dir, 0750, true) && !is_dir($dir)) {
        throw new RuntimeException("Cannot create {$dir}");
    }
    $fp = fopen($rateFile, 'c+');
    if ($fp === false) {
        throw new RuntimeException("Cannot open {$rateFile}");
    }
    try {
        flock($fp, LOCK_EX);
        $map = json_decode(stream_get_contents($fp) ?: '{}', true) ?: [];
        $now = time();
        $map = array_filter($map, fn ($v) => is_array($v) && ($v[1] ?? 0) > $now);
        $key = hash('sha256', $ip);
        $entry = $map[$key] ?? [0, $now + $window];
        if ($entry[0] >= $max) {
            return true;
        }
        $entry[0]++;
        $map[$key] = $entry;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($map));
        return false;
    } finally {
        flock($fp, LOCK_UN);
        fclose($fp);
    }
}
