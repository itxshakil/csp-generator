<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/icons.php';

return [
    'icon() returns a decorative inline SVG drawn in the text color' => function () {
        $svg = icon('check');
        assert_true(str_starts_with($svg, '<svg'), 'must start with <svg');
        assert_true(str_contains($svg, 'aria-hidden="true"'), 'must be hidden from assistive tech');
        assert_true(str_contains($svg, 'focusable="false"'), 'must not be focusable');
        assert_true(str_contains($svg, 'currentColor'), 'must use currentColor');
        assert_true(str_contains(icon('x', 'icon big'), 'class="icon big"'), 'class is passed through');
    },
    'icon() refuses an unknown name' => function () {
        try {
            icon('nope');
        } catch (InvalidArgumentException) {
            return;
        }
        throw new RuntimeException('expected InvalidArgumentException');
    },
    'the page has no emoji or glyph icons outside scripts' => function () {
        [$html] = render_index();
        $visible = preg_replace('#<script\b[^>]*>.*?</script>#si', '', $html);
        $found = preg_match_all('/[\x{1F300}-\x{1FAFF}\x{2600}-\x{27BF}\x{2190}-\x{21FF}\x{25BE}\x{00D7}]/u', $visible, $m);
        assert_same(0, $found, 'glyphs found: ' . implode(' ', array_unique($m[0])));
    },
];
