<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/faq.php';
require_once __DIR__ . '/../../lib/site-headers.php';

function faq_plain(string $html): string
{
    return html_entity_decode(strip_tags($html), ENT_QUOTES | ENT_HTML5, 'UTF-8');
}

return [
    'faq items have a question and an answer' => function () {
        $items = faq_items();
        assert_true(count($items) >= 8, 'expected at least 8 FAQ items');
        foreach ($items as $item) {
            assert_true($item['q'] !== '' && $item['a_html'] !== '', 'empty FAQ field');
        }
    },
    'JSON-LD carries every question with its plain-text answer' => function () {
        $items = faq_items();
        $data  = json_decode(faq_jsonld($items), true, 32, JSON_THROW_ON_ERROR);
        assert_same('FAQPage', $data['@type']);
        foreach ($items as $i => $item) {
            assert_same($item['q'], $data['mainEntity'][$i]['name']);
            assert_same(faq_plain($item['a_html']), $data['mainEntity'][$i]['acceptedAnswer']['text']);
        }
    },
    'the page shows the same questions in the same order as the JSON-LD' => function () {
        [$html] = render_index();
        preg_match_all('/<summary class="faq-q">(.*?) <svg/s', $html, $m);
        $visible = array_map(fn ($q) => html_entity_decode($q, ENT_QUOTES | ENT_HTML5, 'UTF-8'), $m[1]);
        assert_same(array_column(faq_items(), 'q'), $visible);
        assert_true(str_contains($html, '"@type":"FAQPage"'), 'FAQ JSON-LD missing from page');
    },
];
