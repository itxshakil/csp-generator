<?php

declare(strict_types=1);

return [
    'every local asset URL on the page is versioned' => function () {
        [$html] = render_index();
        preg_match_all('#(?:src|href)="(/assets/[^"]+)"#', $html, $m);
        assert_true(count($m[1]) >= 2, 'expected stylesheet and module script');
        foreach ($m[1] as $url) {
            // Font files carry their upstream version in the name, so the stylesheet can point at them directly.
            $versioned = preg_match('#\?v=\d+$#', $url) === 1 || preg_match('#^/assets/fonts/[a-z-]+-v\d+\.woff2$#', $url) === 1;
            assert_true($versioned, "unversioned asset: {$url}");
        }
    },
    'an import map versions every module' => function () {
        [$html, $nonce] = render_index();
        $ok = preg_match('#<script type="importmap" nonce="([^"]+)">(.*?)</script>#s', $html, $m);
        assert_true($ok === 1, 'import map missing or without nonce');
        assert_same(htmlspecialchars($nonce), $m[1]);
        $imports = json_decode($m[2], true, 8, JSON_THROW_ON_ERROR)['imports'];
        foreach (glob(__DIR__ . '/../../assets/js/*.js') as $file) {
            $path = '/assets/js/' . basename($file);
            assert_true(isset($imports[$path]), "module not in import map: {$path}");
            assert_same($path . '?v=' . filemtime($file), $imports[$path]);
        }
    },
];
