<?php

declare(strict_types=1);

// Inline SVG icons, drawn for this site on a 24 px grid. Decorative only: the text next to them carries the meaning.
// assets/js/icons.js holds the few the scripts render, with the same shapes.

if (realpath($_SERVER['SCRIPT_FILENAME'] ?? '') === __FILE__) {
    http_response_code(404);
    exit;
}

const ICONS = [
    'target'       => '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    'plug'         => '<path d="M9 3v5M15 3v5M6 8h12v3a6 6 0 0 1-12 0zM12 17v4"/>',
    'layers'       => '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    'gauge'        => '<path d="M4 18a8 8 0 1 1 16 0"/><path d="m12 18 4-6"/>',
    'puzzle'       => '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M17.5 14v7M14 17.5h7"/>',
    'list-checks'  => '<path d="m3 7 2 2 4-4M3 17l2 2 4-4M13 7h8M13 17h8"/>',
    'search'       => '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    'code'         => '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    'radar'        => '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="m12 12 6-6"/>',
    'blocks'       => '<rect x="3" y="13" width="8" height="8" rx="1"/><rect x="13" y="13" width="8" height="8" rx="1"/><rect x="8" y="3" width="8" height="8" rx="1"/>',
    'cloud'        => '<path d="M7 19a5 5 0 1 1 .9-9.9A6 6 0 0 1 19.4 11 4 4 0 0 1 18 19z"/>',
    'laptop'       => '<rect x="4" y="5" width="16" height="11" rx="1"/><path d="M2 20h20"/>',
    'bell'         => '<path d="M6 16v-5a6 6 0 0 1 12 0v5l2 2H4zM10 21h4"/>',
    'sliders'      => '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    'rotate-ccw'   => '<path d="M3 12a9 9 0 1 0 2.6-6.4L3 8"/><path d="M3 3v5h5"/>',
    'chevron-down' => '<path d="m6 9 6 6 6-6"/>',
    'x'            => '<path d="M18 6 6 18M6 6l12 12"/>',
    'check'        => '<path d="M20 6 9 17l-5-5"/>',
    'download'     => '<path d="M12 3v12m-5-5 5 5 5-5M5 21h14"/>',
    'arrow-right'  => '<path d="M5 12h14m-6-6 6 6-6 6"/>',
    'copy'         => '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/>',
    'keyboard'     => '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
];

function icon(string $name, string $class = 'icon'): string
{
    if (!isset(ICONS[$name])) {
        throw new InvalidArgumentException("Unknown icon: {$name}");
    }
    $class = htmlspecialchars($class, ENT_QUOTES);
    return '<svg class="' . $class . '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' . ICONS[$name] . '</svg>';
}
