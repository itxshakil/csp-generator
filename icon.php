<?php
$s = in_array((int)($_GET['s'] ?? 192), [192, 512]) ? (int)$_GET['s'] : 192;
header('Content-Type: image/png');
header('Cache-Control: public, max-age=31536000, immutable');
$img = imagecreatetruecolor($s, $s);
$bg  = imagecolorallocate($img, 26, 21, 35);
$red = imagecolorallocate($img, 232, 37, 26);
$wht = imagecolorallocate($img, 248, 247, 244);
imagefilledrectangle($img, 0, 0, $s - 1, $s - 1, $bg);
$cx = (int)($s / 2);
$cy = (int)($s / 2);
imagefilledellipse($img, $cx, $cy, (int)($s * 0.40), (int)($s * 0.40), $red);
imagefilledellipse($img, $cx, $cy, (int)($s * 0.14), (int)($s * 0.14), $wht);
imagepng($img);
imagedestroy($img);
