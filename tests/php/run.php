<?php

declare(strict_types=1);

// Minimal test runner: each tests/php/*Test.php returns array<string, callable>.
// A test fails by throwing. Exit code 1 when any test fails.

function assert_true(bool $condition, string $message): void
{
    if (!$condition) {
        throw new RuntimeException($message);
    }
}

function assert_same(mixed $expected, mixed $actual, string $message = ''): void
{
    if ($expected !== $actual) {
        throw new RuntimeException(trim($message . ' expected ' . var_export($expected, true) . ', got ' . var_export($actual, true)));
    }
}

function render_index(): array
{
    ob_start();
    $cspNonce = null;
    (function () use (&$cspNonce) {
        include __DIR__ . '/../../index.php';
        $cspNonce = $nonce ?? null;
    })();
    return [ob_get_clean(), $cspNonce];
}

$failed = 0;
$files  = glob(__DIR__ . '/*Test.php') ?: [];

foreach ($files as $file) {
    $tests = require $file;
    foreach ($tests as $name => $test) {
        try {
            $test();
            echo "PASS {$name}\n";
        } catch (Throwable $e) {
            $failed++;
            echo "FAIL {$name}: {$e->getMessage()}\n";
        }
    }
}

echo $failed === 0 ? "OK\n" : "{$failed} failed\n";
exit($failed === 0 ? 0 : 1);
