<?php

declare(strict_types=1);

const FROM_EMAIL     = 'hello@shakiltech.com';
const FROM_NAME      = 'Shakil — CSP Generator';
const SUBJECT        = 'Your Laravel CSP Quick Reference Guide';
const PDF_PATH       = __DIR__ . '/laravel-csp-guide.pdf';
const CSV_PATH       = __DIR__ . '/data/emails.csv';
const RATE_FILE      = __DIR__ . '/data/rate.json';
const REDIRECT_URL   = 'https://csp-generator.shakiltech.com';
const ALLOWED_ORIGIN = 'https://csp-generator.shakiltech.com';
const REDIRECT_DELAY = 10;
const RATE_MAX       = 3;
const RATE_WINDOW    = 86400;
const MIN_ELAPSED_MS = 2000;

// CORS
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if ($origin === ALLOWED_ORIGIN) {
    header('Access-Control-Allow-Origin: ' . ALLOWED_ORIGIN);
}
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// Parse input
$isJson = str_contains($_SERVER['CONTENT_TYPE'] ?? '', 'application/json');
if ($isJson) {
    $body  = json_decode(file_get_contents('php://input'), true) ?? [];
    $name  = trim(strip_tags((string) ($body['name']  ?? '')));
    $email = trim(strtolower((string) ($body['email'] ?? '')));
} else {
    $name  = trim(strip_tags((string) ($_POST['name']  ?? '')));
    $email = trim(strtolower((string) ($_POST['email'] ?? '')));
}

// Validate
$error = null;
if (empty($email) || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $error = 'Please enter a valid email address.';
} elseif (strlen($name) > 100 || strlen($email) > 255) {
    $error = 'Input too long.';
}

$name      = $name ?: 'Friend';
$firstName = explode(' ', $name)[0];

// JSON request (AJAX from the tool)
if ($isJson) {
    header('Content-Type: application/json');
    if ($error) {
        http_response_code(422);
        echo json_encode(['ok' => false, 'error' => $error]);
        exit;
    }
    // Honeypot: bot filled a hidden field
    if (($body['pot'] ?? '') !== '') {
        echo json_encode(['ok' => true]);
        exit;
    }
    // Timing: submitted faster than a human could (< 2 s)
    $ts = (int) ($body['ts'] ?? 0);
    if ($ts > 0 && (int) (microtime(true) * 1000) - $ts < MIN_ELAPSED_MS) {
        echo json_encode(['ok' => true]);
        exit;
    }
    // Rate limit: too many submissions from this IP
    if (check_rate_limit()) {
        echo json_encode(['ok' => true]);
        exit;
    }
    // Dedup: email already in the list
    if (email_exists($email)) {
        echo json_encode(['ok' => true]);
        exit;
    }
    save_to_csv($name, $email);
    $sent = send_pdf($email, $name);
    echo json_encode(['ok' => true, 'sent' => $sent]);
    exit;
}

// Direct visit with no POST — redirect home
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    header('Location: ' . REDIRECT_URL);
    exit;
}

// HTML form POST
$success = false;
$sent    = false;
if (!$error) {
    save_to_csv($name, $email);
    $sent    = send_pdf($email, $name);
    $success = true;
}

// Render redirect page
$safeEmail     = htmlspecialchars($email);
$safeName      = htmlspecialchars($firstName);
$safeRedirect  = htmlspecialchars(REDIRECT_URL);
$safeError     = htmlspecialchars($error ?? '');
$delay         = REDIRECT_DELAY;

?><!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title><?= $success ? 'PDF sent — CSP Generator' : 'Something went wrong — CSP Generator' ?></title>
<?php if ($success): ?>
<meta http-equiv="refresh" content="<?= $delay ?>;url=<?= $safeRedirect ?>">
<?php endif; ?>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --red:#E8251A;--red-bg:#FEF2F1;--dark:#1A1523;--mid:#4A4560;
  --light:#8B86A0;--border:#E5E3DC;--bg:#F8F7F4;--white:#FFFFFF;
  --green:#16A34A;--green-bg:#F0FDF4;
}
html{font-size:15px}
body{
  background:var(--bg);font-family:'Inter',sans-serif;
  min-height:100vh;display:flex;flex-direction:column;
  align-items:center;justify-content:center;padding:2rem;
}
body::before{content:'';position:fixed;top:0;left:0;right:0;height:3px;background:var(--red)}

.card{
  background:var(--white);border:1px solid var(--border);
  border-radius:16px;padding:3rem 2.5rem;max-width:480px;width:100%;text-align:center;
}

.brand{
  display:flex;align-items:center;justify-content:center;
  gap:0.5rem;margin-bottom:2rem;text-decoration:none;
}
.brand-dot{width:8px;height:8px;border-radius:50%;background:var(--red)}
.brand-name{font-size:0.95rem;font-weight:600;color:var(--dark)}

.icon-wrap{
  width:64px;height:64px;border-radius:50%;
  display:flex;align-items:center;justify-content:center;
  margin:0 auto 1.5rem;font-size:1.75rem;
}
.icon-wrap.ok{background:var(--green-bg);border:1px solid #BBF7D0}
.icon-wrap.err{background:var(--red-bg);border:1px solid #FCCAC7}

h1{font-size:1.5rem;font-weight:600;letter-spacing:-0.025em;color:var(--dark);margin-bottom:0.6rem}
.sub{font-size:0.92rem;color:var(--mid);line-height:1.65;margin-bottom:2rem}
.sub strong{color:var(--dark)}

.checklist{
  text-align:left;background:var(--bg);border:1px solid var(--border);
  border-radius:10px;padding:1rem 1.25rem;margin-bottom:2rem;
}
.ci{display:flex;align-items:flex-start;gap:0.6rem;font-size:0.84rem;color:var(--mid);
    padding:0.45rem 0;border-bottom:1px solid var(--border);line-height:1.45}
.ci:last-child{border-bottom:none}
.ci-dot{width:5px;height:5px;border-radius:50%;background:var(--red);flex-shrink:0;margin-top:6px}

/* Progress */
.prog-wrap{background:var(--bg);border:1px solid var(--border);border-radius:20px;height:6px;margin-bottom:0.75rem;overflow:hidden}
.prog-bar{height:100%;border-radius:20px;background:var(--green);
  animation:drain <?= $delay ?>s linear forwards;transform-origin:left}
@keyframes drain{from{transform:scaleX(1)}to{transform:scaleX(0)}}
.prog-label{font-size:0.78rem;color:var(--light);margin-bottom:1.75rem}
.prog-label strong{color:var(--mid)}

/* Buttons */
.btn-group{display:flex;flex-direction:column;align-items:center;gap:0.55rem}
.btn-p{
  display:inline-block;background:var(--red);color:white;
  text-decoration:none;border-radius:8px;padding:0.7rem 1.4rem;
  font-size:0.9rem;font-weight:600;transition:opacity 0.15s;
}
.btn-p:hover{opacity:0.88}
.btn-s{color:var(--mid);text-decoration:none;font-size:0.84rem;transition:color 0.15s}
.btn-s:hover{color:var(--dark)}

/* Error */
.err-box{
  font-size:0.8rem;color:var(--light);font-family:monospace;
  background:var(--bg);border:1px solid var(--border);border-radius:8px;
  padding:0.75rem 1rem;margin-bottom:1.75rem;text-align:left;
}
</style>
</head>
<body>

<?php if ($success): ?>
<div class="card">
  <a class="brand" href="<?= $safeRedirect ?>">
    <div class="brand-dot"></div>
    <span class="brand-name">CSP Generator</span>
  </a>

  <div class="icon-wrap ok">✓</div>
  <h1>Check your inbox, <?= $safeName ?>!</h1>
  <p class="sub">
    The Laravel CSP Quick Reference is on its way to <strong><?= $safeEmail ?></strong>.<?= $sent ? '' : "<br>Use the download link below if it doesn't arrive." ?>
  </p>

  <div class="checklist">
    <div class="ci"><div class="ci-dot"></div>All 13 CSP directives with plain-English descriptions</div>
    <div class="ci"><div class="ci-dot"></div>12-item pre-enforcement checklist</div>
    <div class="ci"><div class="ci-dot"></div>5 common mistakes and how to avoid them</div>
    <div class="ci"><div class="ci-dot"></div>Quick-start snippets for Blade, Vite and Livewire</div>
  </div>

  <div class="prog-wrap"><div class="prog-bar"></div></div>
  <p class="prog-label">Redirecting you back in <strong><span id="cd"><?= $delay ?></span> seconds</strong></p>

  <div class="btn-group">
    <a class="btn-p" href="<?= $safeRedirect ?>/laravel-csp-guide.pdf" download>↓ Download PDF now</a>
    <a class="btn-s" href="<?= $safeRedirect ?>">← Back to the generator</a>
  </div>
</div>
<script>
let n=<?= $delay ?>;const el=document.getElementById('cd');
const iv=setInterval(()=>{n--;if(el)el.textContent=n;if(n<=0){clearInterval(iv);location.href='<?= REDIRECT_URL ?>';}},1000);
</script>

<?php else: ?>
<div class="card">
  <a class="brand" href="<?= $safeRedirect ?>">
    <div class="brand-dot"></div>
    <span class="brand-name">CSP Generator</span>
  </a>

  <div class="icon-wrap err">!</div>
  <h1>Something went wrong</h1>
  <p class="sub">We couldn't process your request. Please go back and try again.</p>
  <div class="err-box"><?= $safeError ?></div>

  <div class="btn-group">
    <a class="btn-p" href="javascript:history.back()">← Go back</a>
    <a class="btn-s" href="<?= $safeRedirect ?>">Return to the generator</a>
  </div>
</div>
<?php endif; ?>

</body>
</html>
<?php

// Functions
function check_rate_limit(): bool
{
    $dir = dirname(RATE_FILE);
    if (!is_dir($dir)) mkdir($dir, 0750, true);
    $key = hash('sha256', $_SERVER['REMOTE_ADDR'] ?? '');
    $fp  = fopen(RATE_FILE, 'c+');
    if (!$fp) return false;
    flock($fp, LOCK_EX);
    $raw = stream_get_contents($fp);
    $map = json_decode($raw ?: '{}', true) ?? [];
    $now = time();
    $map = array_filter($map, fn($v) => isset($v[1]) && $v[1] > $now);
    $entry   = $map[$key] ?? [0, $now + RATE_WINDOW];
    $blocked = $entry[0] >= RATE_MAX;
    if (!$blocked) {
        $entry[0]++;
        $map[$key] = $entry;
        ftruncate($fp, 0);
        rewind($fp);
        fwrite($fp, json_encode($map));
    }
    flock($fp, LOCK_UN);
    fclose($fp);
    return $blocked;
}

function email_exists(string $email): bool
{
    if (!file_exists(CSV_PATH)) return false;
    $fp = fopen(CSV_PATH, 'r');
    if (!$fp) return false;
    fgets($fp); // skip header row
    while (($row = fgetcsv($fp, 512, ',', '"', '\\')) !== false) {
        if (isset($row[1]) && $row[1] === $email) {
            fclose($fp);
            return true;
        }
    }
    fclose($fp);
    return false;
}

function save_to_csv(string $name, string $email): void
{
    $dir = dirname(CSV_PATH);
    if (!is_dir($dir)) mkdir($dir, 0750, true);
    $isNew = !file_exists(CSV_PATH) || filesize(CSV_PATH) === 0;
    $fp    = fopen(CSV_PATH, 'a');
    if (!$fp) return;
    if (flock($fp, LOCK_EX)) {
        if ($isNew) fputcsv($fp, ['name', 'email', 'source', 'subscribed_at'], ',', '"', '\\');
        fputcsv($fp, [$name, $email, 'csp-generator', date('Y-m-d H:i:s')], ',', '"', '\\');
        flock($fp, LOCK_UN);
    }
    fclose($fp);
}

function send_pdf(string $to, string $name): bool
{
    if (!file_exists(PDF_PATH)) return false;
    $firstName  = explode(' ', $name)[0];
    $pdf        = file_get_contents(PDF_PATH);
    if ($pdf === false) return false;
    $b64        = base64_encode($pdf);
    $boundary   = '----=_Part_' . md5(uniqid('', true));
    $alt        = "alt_{$boundary}";

    $headers  = "From: " . FROM_NAME . " <" . FROM_EMAIL . ">\r\n";
    $headers .= "Reply-To: " . FROM_EMAIL . "\r\n";
    $headers .= "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: multipart/mixed; boundary=\"{$boundary}\"\r\n";

    $txt = "Hi {$firstName},\n\nYour Laravel CSP Quick Reference Guide is attached.\n\nWhat's inside:\n• All 13 directives with plain-English descriptions\n• 12-item pre-enforcement checklist\n• 5 common mistakes and how to avoid them\n• Quick-start snippets for Blade, Vite and Livewire\n\nConfigure your policy:\n→ https://csp-generator.shakiltech.com\n\n— Shakil";

    $htm = "<!DOCTYPE html><html><head><meta charset='UTF-8'><style>body{font-family:Helvetica,Arial,sans-serif;background:#F8F7F4;margin:0;padding:0}.w{max-width:500px;margin:0 auto;padding:24px 16px}.c{background:#fff;border:1px solid #E5E3DC;border-radius:12px;overflow:hidden}.bar{height:3px;background:#E8251A}.b{padding:28px}h1{color:#1A1523;font-size:19px;font-weight:600;margin:0 0 5px}h1 span{color:#E8251A}.s{color:#4A4560;font-size:14px;line-height:1.6;margin:0 0 18px}.i{display:flex;gap:8px;margin-bottom:9px}.d{width:5px;height:5px;border-radius:50%;background:#E8251A;flex-shrink:0;margin-top:6px}.t{color:#4A4560;font-size:13.5px;line-height:1.5}.cta{display:block;text-align:center;background:#E8251A;color:#fff;text-decoration:none;border-radius:8px;padding:11px 18px;font-size:14px;font-weight:600;margin:20px 0 0}.f{margin-top:20px;padding-top:16px;border-top:1px solid #E5E3DC}.f p{color:#8B86A0;font-size:12px;line-height:1.6;margin:0}.f a{color:#6B6487}</style></head><body><div class='w'><div class='c'><div class='bar'></div><div class='b'><h1>Laravel CSP <span>Quick Reference</span></h1><p class='s'>Hi {$firstName}, your guide is attached.</p><div class='i'><div class='d'></div><div class='t'>All 13 CSP directives with descriptions</div></div><div class='i'><div class='d'></div><div class='t'>12-item pre-enforcement checklist</div></div><div class='i'><div class='d'></div><div class='t'>5 common mistakes to avoid</div></div><div class='i'><div class='d'></div><div class='t'>Quick-start Blade, Vite & Livewire snippets</div></div><a class='cta' href='https://csp-generator.shakiltech.com'>Configure your policy →</a><div class='f'><p>You signed up at csp-generator.shakiltech.com. <a href='https://blog.shakiltech.com'>Read the full blog post</a>.</p></div></div></div></div></body></html>";

    $msg  = "--{$boundary}\r\nContent-Type: multipart/alternative; boundary=\"{$alt}\"\r\n\r\n";
    $msg .= "--{$alt}\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: 7bit\r\n\r\n{$txt}\r\n\r\n";
    $msg .= "--{$alt}\r\nContent-Type: text/html; charset=UTF-8\r\nContent-Transfer-Encoding: quoted-printable\r\n\r\n";
    $msg .= quoted_printable_encode($htm) . "\r\n\r\n--{$alt}--\r\n";
    $msg .= "--{$boundary}\r\nContent-Type: application/pdf; name=\"laravel-csp-guide.pdf\"\r\n";
    $msg .= "Content-Transfer-Encoding: base64\r\nContent-Disposition: attachment; filename=\"laravel-csp-guide.pdf\"\r\n\r\n";
    $msg .= chunk_split($b64) . "\r\n--{$boundary}--";

    return mail($to, SUBJECT, $msg, $headers);
}