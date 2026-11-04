<?php

declare(strict_types=1);

require_once __DIR__ . '/../../lib/csp-report.php';

function temp_log(): string
{
    $path = sys_get_temp_dir() . '/csp-report-test-' . bin2hex(random_bytes(4)) . '.log';
    register_shutdown_function(fn () => @unlink($path));
    return $path;
}

return [
    'oversized body is rejected' => function () {
        $log = temp_log();
        assert_same(false, append_report(json_encode(['x' => str_repeat('a', 20000)]), $log));
        assert_true(!file_exists($log) || filesize($log) === 0, 'nothing written');
    },
    'valid JSON body appends one line' => function () {
        $log = temp_log();
        assert_same(true, append_report('{"csp-report":{"blocked-uri":"https://evil.test"}}', $log));
        assert_same(1, count(file($log)));
    },
    'log stops growing at the cap' => function () {
        $log = temp_log();
        file_put_contents($log, str_repeat('a', 1048576));
        assert_same(false, append_report('{"a":1}', $log));
        clearstatcache();
        assert_same(1048576, filesize($log));
    },
    'non-JSON body is rejected' => function () {
        $log = temp_log();
        assert_same(false, append_report('not json', $log));
    },
];
