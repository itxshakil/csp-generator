<?php

declare(strict_types=1);

return [
    'the hero is one heading and one line, without badges, tags or pills' => function () {
        [$html] = render_index();
        foreach (['hero-tags', 'hero-badge', 'nav-pill'] as $gone) {
            assert_true(!str_contains($html, $gone), "{$gone} must be removed");
        }
        preg_match('#<section class="hero">(.*?)</section>#s', $html, $m);
        assert_same(1, substr_count($m[1], '<h1'), 'one h1');
        assert_same(1, substr_count($m[1], 'class="hero-sub"'), 'one subline');
        assert_same(2, substr_count(str_replace('</em>', '', $m[1]), '</'), 'nothing else in the hero');
    },
    'the signup is a real form with an email field and a text error' => function () {
        [$html] = render_index();
        assert_true(preg_match('#<form\b[^>]*id="guide-form"[^>]*>#', $html, $m) === 1, 'form#guide-form');
        foreach (['action="/save-email.php"', 'method="post"', 'novalidate'] as $attr) {
            assert_true(str_contains($m[0], $attr), "form needs {$attr}");
        }
        assert_true(!str_contains($html, 'g-name') && !str_contains($html, 'name="name"'), 'no name field');
        assert_true(preg_match('#<input\b[^>]*id="g-email"[^>]*>#', $html, $e) === 1, 'email input');
        foreach (['required', 'name="email"', 'aria-describedby="g-error"'] as $attr) {
            assert_true(str_contains($e[0], $attr), "email input needs {$attr}");
        }
        assert_true(preg_match('#<p\b[^>]*id="g-error"[^>]*(role="alert"|aria-live)#', $html) === 1, 'error paragraph is announced');
        assert_true(str_contains($html, 'We store your email to send the guide and occasional CSP updates.'), 'privacy line');
    },
    'the signup comes after the features' => function () {
        [$html] = render_index();
        $features = strpos($html, 'class="features"');
        $guide = strpos($html, 'class="guide-section"');
        assert_true($features !== false && $guide !== false && $features < $guide, 'features before the guide');
    },
    'the FAQ is a set of exclusive details elements' => function () {
        [$html] = render_index();
        $count = count(faq_items());
        assert_same($count, substr_count($html, '<details class="faq-item" name="faq">'), 'one details per question');
        assert_same($count, substr_count($html, '<summary class="faq-q">'), 'one summary per question');
        assert_true(!str_contains($html, '<button type="button" class="faq-q"'), 'no FAQ buttons');
    },
    'one polite live region announces results' => function () {
        [$html] = render_index();
        assert_same(1, preg_match_all('#<div\b[^>]*id="announcer"[^>]*>#', $html, $m), 'one announcer');
        assert_true(str_contains($m[0][0], 'aria-live="polite"'), 'polite');
        assert_true(str_contains($m[0][0], 'class="sr-only"'), 'visually hidden');
    },
];
