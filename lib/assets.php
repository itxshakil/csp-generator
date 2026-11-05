<?php

declare(strict_types=1);

// Versioned asset URLs, so browsers, the CDN and the service worker can cache them forever
// and a deploy can never mix an old module with a new one.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

function asset_url(string $path): string
{
    $file = dirname(__DIR__) . $path;
    if (!is_file($file)) {
        throw new RuntimeException("Missing asset: {$path}");
    }
    return $path . '?v=' . filemtime($file);
}

// Maps every module's plain URL to its versioned URL, so relative imports between modules are versioned too.
function import_map_json(): string
{
    $imports = [];
    foreach (glob(dirname(__DIR__) . '/assets/js/*.js') ?: [] as $file) {
        $path = '/assets/js/' . basename($file);
        $imports[$path] = asset_url($path);
    }
    return json_encode(['imports' => $imports], JSON_UNESCAPED_SLASHES | JSON_HEX_TAG | JSON_THROW_ON_ERROR);
}
