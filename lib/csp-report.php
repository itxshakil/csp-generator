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
