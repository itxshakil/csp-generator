<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laravel CSP Generator — Free Content Security Policy Builder</title>
<meta name="description" content="Generate a production-ready Content Security Policy for your Laravel app. Nonce-based, Vite-ready, Livewire-aware. Free and instant.">
<link rel="canonical" href="https://csp-generator.shakiltech.com">
<meta property="og:title" content="Laravel CSP Generator">
<meta property="og:description" content="Generate a production-ready CSP for your Laravel app — nonce-based, Vite-ready, Livewire-aware. Free and instant.">
<meta property="og:url" content="https://csp-generator.shakiltech.com">
<meta name="twitter:card" content="summary_large_image">
<!-- Open Graph — complete set -->
<meta property="og:type"        content="website">
<meta property="og:site_name"   content="CSP Generator by Shakil">
<meta property="og:image"       content="https://csp-generator.shakiltech.com/favicon.svg">
<meta property="og:image:alt"   content="Laravel CSP Generator — Free Content Security Policy Builder">
<!-- Twitter card — complete set -->
<meta name="twitter:title"       content="Laravel CSP Generator — Free CSP Builder">
<meta name="twitter:description" content="Generate a production-ready CSP for your Laravel app — nonce-based, Vite-ready, Livewire-aware. Free and instant.">
<meta name="twitter:image"       content="https://csp-generator.shakiltech.com/favicon.svg">
<meta name="twitter:image:alt"   content="Laravel CSP Generator">
<!-- Favicon -->
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="apple-touch-icon" href="/favicon.svg">
<!-- PWA -->
<link rel="manifest" href="/manifest.json">
<meta name="mobile-web-app-capable"               content="yes">
<meta name="apple-mobile-web-app-capable"         content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="default">
<meta name="apple-mobile-web-app-title"           content="CSP Generator">
<meta name="author"  content="Shakil Alam">
<meta name="creator" content="ShakilTech">
<!-- theme-color: dual light/dark -->
<meta name="theme-color" content="#F8F7F4" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#18151F"  media="(prefers-color-scheme: dark)">
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebApplication","name":"Laravel CSP Generator","url":"https://csp-generator.shakiltech.com","description":"Free tool to generate production-ready Content Security Policy for Laravel","applicationCategory":"DeveloperApplication","operatingSystem":"Any","featureList":["Nonce-based CSP","Vite HMR support","Livewire-aware","Policy strength scoring","Violation reporting"],"offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"creator":{"@type":"Person","name":"Shakil","url":"https://blog.shakiltech.com"}}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"FAQPage","mainEntity":[{"@type":"Question","name":"What is a Content Security Policy (CSP)?","acceptedAnswer":{"@type":"Answer","text":"A Content Security Policy is an HTTP response header that tells browsers which sources of scripts, styles, images, and other content are allowed to load on your page. It is your primary defense against cross-site scripting (XSS) attacks — if a malicious script is injected, the browser refuses to run it because it comes from an unapproved source."}},{"@type":"Question","name":"Should I use report-only mode first?","acceptedAnswer":{"@type":"Answer","text":"Yes, always. Use Content-Security-Policy-Report-Only with a report-to endpoint before enforcing. The browser logs violations but blocks nothing. Run it for 1–2 weeks, fix any legitimate sources being blocked, then switch to enforcing mode."}},{"@type":"Question","name":"Can I use CSP with CDNs or third-party scripts?","acceptedAnswer":{"@type":"Answer","text":"Yes, but carefully. Add the CDN domain to the appropriate directive (e.g. script-src cdn.example.com). Avoid unsafe-inline or wildcard * as they defeat the purpose. Use Subresource Integrity (SRI) hashes for extra protection when loading third-party scripts."}},{"@type":"Question","name":"Does CSP break my existing Laravel app?","acceptedAnswer":{"@type":"Answer","text":"It can — if you have inline scripts or styles without nonces. Use Report-Only mode first. The browser reports violations but blocks nothing. Run it for a week, fix your templates, then enforce."}},{"@type":"Question","name":"My Vite HMR stopped working after adding CSP.","acceptedAnswer":{"@type":"Answer","text":"Two things. First, make sure localhost:5173 (or your Vite port) is in connect-src and script-src. Second, enable the Local Dev toggle in this tool — it adds the WebSocket source automatically."}},{"@type":"Question","name":"Do I need CSP if I already have CSRF protection?","acceptedAnswer":{"@type":"Answer","text":"Yes. They protect against different attacks. CSRF prevents forged requests from other origins. CSP prevents injected scripts from running in your page. Both are needed."}},{"@type":"Question","name":"What's the difference between report-uri and Report-To?","acceptedAnswer":{"@type":"Answer","text":"report-uri is the original directive, widely supported. Report-To is the modern replacement using the Reporting API and supports batching. Use both for maximum coverage until Report-To is universally supported."}},{"@type":"Question","name":"How do I handle CSP with Livewire?","acceptedAnswer":{"@type":"Answer","text":"For Livewire v2, enable the Livewire toggle — it adds the alpine.js nonce and wire: event sources. For Livewire v3, nonce support is built-in via the @nonce blade directive."}}]}</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap"></noscript>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --bg:#F8F7F4;
  --white:#FFFFFF;
  --surface:#F2F1EE;
  --border:#E5E3DC;
  --border2:#D4D1C8;
  --red:#E8251A;
  --red-bg:#FEF2F1;
  --red-border:#FCCAC7;
  --dark:#1A1523;
  --mid:#4A4560;
  --light:#8B86A0;
  --light2:#C5C2D4;
  --green:#16A34A;
  --green-bg:#F0FDF4;
  --amber:#D97706;
  --blue:#2563EB;
  --sans:'Inter',sans-serif;
  --mono:'JetBrains Mono',monospace;
  --r:8px;
  --r-lg:12px;
}
html{font-size:15px;scroll-behavior:smooth}
::selection{background:rgba(232,37,26,0.2);color:inherit}
::-moz-selection{background:rgba(232,37,26,0.2);color:inherit}
body{background:var(--bg);color:var(--dark);font-family:var(--sans);line-height:1.6;min-height:100vh}

/* scrollbar */
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border2);border-radius:2px}

/* ── Nav ── */
nav{
  background:var(--white);
  border-bottom:1px solid var(--border);
  padding:0 2rem;
  display:flex;align-items:center;justify-content:space-between;
  height:56px;position:sticky;top:0;z-index:100;
}
.logo{display:flex;align-items:center;gap:0.6rem;font-weight:600;font-size:0.95rem;color:var(--dark);text-decoration:none}
.logo-dot{width:8px;height:8px;border-radius:50%;background:var(--red)}
.nav-right{display:flex;align-items:center;gap:0.5rem}
.nav-link{font-size:0.82rem;color:var(--mid);text-decoration:none;padding:0.3rem 0.65rem;border-radius:6px;transition:background 0.15s,color 0.15s}
.nav-link:hover{background:var(--surface);color:var(--dark)}
.nav-pill{font-size:0.72rem;background:var(--red-bg);color:var(--red);border:1px solid var(--red-border);padding:0.2rem 0.65rem;border-radius:20px;font-weight:500}

/* ── Hero ── */
.hero{text-align:center;padding:4rem 1.5rem 3rem;max-width:640px;margin:0 auto}
.hero-badge{display:inline-flex;align-items:center;gap:0.4rem;font-size:0.72rem;font-weight:500;letter-spacing:0.06em;text-transform:uppercase;color:var(--red);margin-bottom:1rem;padding:0.3rem 0.8rem;border-radius:20px;background:var(--red-bg);border:1px solid var(--red-border)}
.hero-badge-dot{width:5px;height:5px;border-radius:50%;background:var(--red)}
h1{font-size:2.2rem;font-weight:600;letter-spacing:-0.03em;line-height:1.15;color:var(--dark);margin-bottom:0.85rem}
h1 em{font-style:normal;color:var(--red)}
.hero-sub{font-size:1rem;color:var(--mid);line-height:1.65;margin-bottom:1.75rem}
.hero-tags{display:flex;flex-wrap:wrap;justify-content:center;gap:0.45rem}
.tag{font-size:0.78rem;color:var(--mid);background:var(--white);border:1px solid var(--border);padding:0.28rem 0.75rem;border-radius:20px}

/* ── Tool ── */
.tool{max-width:1100px;margin:0 auto;padding:0 1.5rem 3rem;display:grid;grid-template-columns:380px 1fr;gap:1.5rem;align-items:start}

/* ── Config panel ── */
.config{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);transition:border-color .2s ease,background .2s ease,box-shadow .2s ease}
.config-head{padding:1.1rem 1.4rem;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between}
.config-title{font-size:0.78rem;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--light)}
.config-reset{font-size:0.78rem;color:var(--light);background:none;border:none;cursor:pointer;padding:0.2rem 0.4rem;border-radius:4px;transition:color 0.15s}
.config-reset:hover{color:var(--dark)}

/* Sections */
.cfg-section{border-bottom:1px solid var(--border)}
.cfg-section:last-child{border-bottom:none}
.cfg-section-head{display:flex;align-items:center;justify-content:space-between;padding:0.9rem 1.4rem;cursor:pointer;user-select:none}
.cfg-section-head:hover{background:var(--surface)}
.cfg-section-label{display:flex;align-items:center;gap:0.6rem;font-size:0.88rem;font-weight:500;color:var(--dark)}
.cfg-icon{font-size:0.95rem}
.cfg-count{font-size:0.7rem;font-family:var(--mono);background:var(--surface);color:var(--light);padding:0.1rem 0.4rem;border-radius:10px}
.cfg-chevron{font-size:0.6rem;color:var(--light2);transition:transform 0.2s}
.cfg-section.open .cfg-chevron{transform:rotate(180deg)}
.cfg-body{display:none;padding:0.5rem 1.4rem 1rem}
.cfg-section.open .cfg-body{display:block}

/* Toggle rows */
.trow{display:flex;align-items:flex-start;justify-content:space-between;gap:0.75rem;padding:0.7rem 0;border-bottom:1px solid var(--border)}
.trow:last-child{border-bottom:none}
.trow-info{flex:1;min-width:0}
.trow-name{font-size:0.85rem;font-weight:500;color:var(--dark);display:flex;align-items:center;gap:0.35rem}
.trow-desc{font-size:0.76rem;color:var(--light);margin-top:0.1rem;line-height:1.4}
.tip{position:relative;display:inline-flex}
.tip-icon{width:14px;height:14px;border-radius:50%;background:var(--surface);color:var(--light);font-size:0.6rem;display:inline-flex;align-items:center;justify-content:center;cursor:help;font-weight:700;border:1px solid var(--border)}
.tip-box{display:none;position:absolute;bottom:calc(100% + 6px);left:50%;transform:translateX(-50%);z-index:99;width:220px;background:var(--dark);color:#d4d0e4;border-radius:8px;padding:0.65rem 0.8rem;font-size:0.72rem;line-height:1.5;pointer-events:none;white-space:normal;box-shadow:0 4px 16px rgba(0,0,0,0.2)}
.tip:hover .tip-box{display:block}

/* Toggle switch */
.toggle{width:36px;height:20px;border-radius:10px;background:var(--border);cursor:pointer;position:relative;transition:background 0.2s;flex-shrink:0;margin-top:2px;border:none;padding:0}
.toggle::after{content:'';position:absolute;width:14px;height:14px;border-radius:50%;background:white;top:3px;left:3px;transition:transform 0.2s;box-shadow:0 1px 3px rgba(0,0,0,0.2)}
.toggle.on{background:var(--red)}
.toggle.on::after{transform:translateX(16px)}

/* Domain inputs */
.dir-block{margin-top:0.8rem}
.dir-lbl{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.35rem}
.dir-name{font-family:var(--mono);font-size:0.72rem;color:var(--red)}
.dir-hint{font-size:0.7rem;color:var(--light2)}
.tag-wrap{display:flex;flex-wrap:wrap;gap:0.3rem;align-items:center;background:var(--bg);border:1px solid var(--border);border-radius:var(--r);padding:0.45rem 0.6rem;min-height:38px;cursor:text;transition:border-color 0.15s,box-shadow 0.15s}
.tag-wrap:focus-within{border-color:var(--red);box-shadow:0 0 0 3px var(--red-bg)}
.dtag{display:inline-flex;align-items:center;gap:0.25rem;background:var(--white);border:1px solid var(--border);border-radius:5px;padding:0.15rem 0.45rem;font-family:var(--mono);font-size:0.7rem;color:var(--dark)}
.dtag-x{background:none;border:none;cursor:pointer;color:var(--light2);font-size:0.9rem;line-height:1;padding:0;transition:color 0.1s}
.dtag-x:hover{color:var(--red)}
.tag-inp{flex:1;min-width:100px;background:none;border:none;outline:none;font-family:var(--mono);font-size:0.75rem;color:var(--dark);padding:0.1rem 0}
.tag-inp::placeholder{color:var(--light2)}

/* ── Output panel ── */
.output{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);position:sticky;top:72px;max-height:calc(100vh - 90px);display:flex;flex-direction:column;transition:border-color .2s ease,background .2s ease,box-shadow .2s ease}
.out-tabs{display:flex;border-bottom:1px solid var(--border);flex-shrink:0;overflow-x:auto}
.otab{padding:0.75rem 1.1rem;font-size:0.82rem;font-weight:500;color:var(--light);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;white-space:nowrap;user-select:none}
.otab:hover{color:var(--mid)}
.otab.active{color:var(--dark);border-bottom-color:var(--red)}
.out-body{flex:1;overflow-y:auto;padding:1.4rem}

/* Score */
.score-row{display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem}
.score-label{font-size:0.78rem;color:var(--mid)}
.score-chip{font-size:0.75rem;font-family:var(--mono);font-weight:500;padding:0.2rem 0.6rem;border-radius:6px}
.score-track{height:3px;background:var(--surface);border-radius:2px;margin-bottom:1.4rem;overflow:hidden}
.score-fill{height:100%;border-radius:2px;transition:width 0.4s ease, background 0.3s}
.grade-a{color:#16A34A;background:#F0FDF4;border:1px solid #BBF7D0}
.grade-b,.grade-c{color:#D97706;background:#FFFBEB;border:1px solid #FDE68A}
.grade-d{color:#DC2626;background:#FEF2F1;border:1px solid #FCCAC7}
.score-fill.grade-a{background:#16A34A}
.score-fill.grade-b,.score-fill.grade-c{background:#D97706}
.score-fill.grade-d{background:#DC2626}
.grade-ready{color:#16A34A;background:#F0FDF4;border:1px solid #BBF7D0}
.grade-partial{color:#D97706;background:#FFFBEB;border:1px solid #FDE68A}
.score-fill.grade-ready{background:#16A34A}
.score-fill.grade-partial{background:#D97706}

/* Code blocks */
.code-block{background:var(--bg);border:1px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:1rem}
.code-block:last-child{margin-bottom:0}
.code-hdr{display:flex;align-items:center;justify-content:space-between;padding:0.5rem 0.85rem;border-bottom:1px solid var(--border);background:var(--surface)}
.code-title{font-size:0.72rem;font-family:var(--mono);color:var(--light)}
.code-actions{display:flex;gap:0.35rem}
.cbtn{font-size:0.7rem;font-family:var(--mono);color:var(--light);background:var(--white);border:1px solid var(--border);border-radius:5px;padding:0.18rem 0.55rem;cursor:pointer;transition:all 0.15s}
.cbtn:hover{color:var(--dark);border-color:var(--border2)}
.cbtn.ok{color:var(--green);border-color:#BBF7D0;background:var(--green-bg)}
pre{padding:0.9rem 1rem;font-family:var(--mono);font-size:0.76rem;line-height:1.75;overflow-x:auto;white-space:pre-wrap;word-break:break-all;color:var(--dark)}
.sk{color:#1D4ED8}.sv{color:#059669}.sn{color:#D97706}.sb{color:var(--red)}.su{color:#7C3AED}.sc{color:var(--light)}

/* Checklist */
.chk-list{display:flex;flex-direction:column;gap:0.5rem}
.chk-row{display:flex;align-items:flex-start;gap:0.65rem;padding:0.7rem 0.9rem;border-radius:var(--r);border:1px solid var(--border)}
.chk-icon{width:18px;height:18px;border-radius:50%;flex-shrink:0;display:flex;align-items:center;justify-content:center;font-size:0.6rem;margin-top:1px}
.chk-icon.ok{background:var(--green-bg);color:var(--green);border:1px solid #BBF7D0}
.chk-icon.warn{background:#FFFBEB;color:var(--amber);border:1px solid #FDE68A}
.chk-icon.info{background:#EFF6FF;color:var(--blue);border:1px solid #BFDBFE}
.chk-text{font-size:0.82rem;color:var(--mid);line-height:1.45}
.chk-text strong{color:var(--dark);font-weight:500;font-family:var(--mono);font-size:0.77rem}

/* Dir table */
.dir-table{width:100%;border-collapse:collapse;font-size:0.78rem}
.dir-table td{padding:0.5rem 0.65rem;border-bottom:1px solid var(--border);vertical-align:top}
.dir-table tr:last-child td{border-bottom:none}
.dir-table tr:nth-child(even){background:var(--surface)}
.dir-table td:first-child{font-family:var(--mono);color:var(--red)}
.dir-table td:nth-child(2){font-family:var(--mono);font-size:0.72rem;color:var(--blue)}
.dir-table td:last-child{color:var(--mid)}

/* ── Guide CTA ── */
.guide-section{max-width:1100px;margin:0 auto;padding:0 1.5rem 2rem}
.guide-card{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);display:grid;grid-template-columns:1fr 1fr;overflow:hidden;position:relative}
.guide-card::before{content:'';position:absolute;left:0;top:0;bottom:0;width:3px;background:var(--red)}
.guide-left{padding:2.5rem 2rem 2.5rem 2.5rem;border-right:1px solid var(--border)}
.guide-right{padding:2.5rem 2rem;background:var(--bg)}
.guide-label{font-size:0.72rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--red);margin-bottom:0.75rem}
.guide-title{font-size:1.35rem;font-weight:600;letter-spacing:-0.02em;color:var(--dark);line-height:1.2;margin-bottom:0.6rem}
.guide-sub{font-size:0.88rem;color:var(--mid);line-height:1.6;margin-bottom:1.5rem}
.guide-items{display:flex;flex-direction:column;gap:0.55rem}
.guide-item{display:flex;align-items:flex-start;gap:0.5rem}
.guide-item-dot{width:5px;height:5px;border-radius:50%;background:var(--red);flex-shrink:0;margin-top:6px}
.guide-item-text{font-size:0.83rem;color:var(--mid);line-height:1.4}
.guide-item-text strong{color:var(--dark);font-weight:500}
.pdf-card{background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:0.9rem;display:flex;align-items:center;gap:0.75rem;margin-bottom:1.25rem}
.pdf-icon{width:36px;height:44px;background:var(--red);border-radius:4px;display:flex;align-items:flex-end;justify-content:center;padding-bottom:4px;flex-shrink:0}
.pdf-icon span{font-size:0.6rem;font-weight:700;color:white;font-family:var(--mono)}
.pdf-name{font-size:0.82rem;font-weight:600;color:var(--dark);margin-bottom:0.1rem}
.pdf-meta{font-size:0.72rem;color:var(--light)}
.pdf-pages{font-family:var(--mono);font-size:0.68rem;background:var(--red-bg);color:var(--red);border:1px solid var(--red-border);padding:0.15rem 0.5rem;border-radius:4px}
.guide-form{display:flex;flex-direction:column;gap:0.65rem}
.form-field{display:flex;flex-direction:column;gap:0.3rem}
.form-label{font-size:0.78rem;font-weight:500;color:var(--mid)}
.form-input{background:var(--white);border:1px solid var(--border);border-radius:var(--r);padding:0.6rem 0.85rem;font-size:0.88rem;color:var(--dark);font-family:var(--sans);outline:none;transition:border-color 0.15s,box-shadow 0.15s;width:100%}
.form-input:focus{border-color:var(--red);box-shadow:0 0 0 3px var(--red-bg)}
.form-submit{background:var(--red);color:white;border:none;border-radius:var(--r);padding:0.7rem 1rem;font-size:0.9rem;font-weight:600;font-family:var(--sans);cursor:pointer;transition:opacity 0.15s}
.form-submit:hover{opacity:0.88}
.form-privacy{font-size:0.72rem;color:var(--light);text-align:center}
.form-pot{position:absolute;left:-9999px;width:1px;height:1px;opacity:0}
.guide-success{display:none;text-align:center;padding:1rem 0}
.success-icon{width:44px;height:44px;border-radius:50%;background:var(--green-bg);border:1px solid #BBF7D0;display:flex;align-items:center;justify-content:center;margin:0 auto 0.75rem;font-size:1.2rem}
.success-title{font-size:1rem;font-weight:600;color:var(--dark);margin-bottom:0.35rem}
.success-sub{font-size:0.82rem;color:var(--mid);line-height:1.55;margin-bottom:1rem}
.download-btn{display:inline-flex;align-items:center;gap:0.4rem;background:var(--green);color:white;border-radius:var(--r);padding:0.6rem 1.1rem;font-size:0.88rem;font-weight:600;text-decoration:none;transition:opacity 0.15s}
.download-btn:hover{opacity:0.88}

/* ── Features ── */
.features,.faq,.guide-section{content-visibility:auto;contain-intrinsic-size:1px 1000px}
.features{max-width:1100px;margin:0 auto;padding:0 1.5rem 3rem}
.section-intro{margin-bottom:2rem}
.section-label{font-size:0.72rem;font-weight:600;letter-spacing:0.07em;text-transform:uppercase;color:var(--light);margin-bottom:0.4rem}
.section-title{font-size:1.5rem;font-weight:600;letter-spacing:-0.025em;color:var(--dark);margin-bottom:0.4rem}
.section-sub{font-size:0.9rem;color:var(--mid)}
.feat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem}
.feat-card{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.5rem;transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease}
.feat-card:hover{transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.07)}
.feat-icon{font-size:1.35rem;margin-bottom:0.75rem}
.feat-title{font-size:0.92rem;font-weight:600;color:var(--dark);margin-bottom:0.35rem}
.feat-body{font-size:0.82rem;color:var(--mid);line-height:1.6}

/* ── FAQ ── */
.faq{max-width:680px;margin:0 auto;padding:0 1.5rem 4rem}
.faq-item{background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);overflow:hidden;margin-bottom:0.5rem;transition:border-color .2s ease,background .2s ease,box-shadow .2s ease}
.faq-q{width:100%;display:flex;align-items:center;justify-content:space-between;padding:1rem 1.25rem;background:none;border:none;cursor:pointer;color:var(--dark);font-family:var(--sans);font-size:0.9rem;font-weight:500;text-align:left;transition:background 0.15s}
.faq-q:hover{background:var(--surface)}
.faq-ch{color:var(--light2);transition:transform 0.2s;flex-shrink:0;margin-left:0.5rem;font-size:0.75rem}
.faq-item.open .faq-ch{transform:rotate(180deg)}
.faq-a{display:none;padding:0 1.25rem 1rem;font-size:0.85rem;color:var(--mid);line-height:1.65;border-top:1px solid var(--border);padding-top:0.85rem}
.faq-item.open .faq-a{display:block}
.faq-a code{font-family:var(--mono);font-size:0.8rem;background:var(--red-bg);color:var(--red);padding:0.1rem 0.35rem;border-radius:4px}

/* ── Footer ── */
footer{border-top:1px solid var(--border);background:var(--white);padding:1.75rem 1.5rem;text-align:center}
.footer-text{font-size:0.82rem;color:var(--light)}
.footer-text a{color:var(--mid);text-decoration:none;transition:color 0.15s}
.footer-text a:hover{color:var(--dark)}

/* ── Presets bar ── */
.presets{max-width:1100px;margin:0 auto;padding:0 1.5rem 1.5rem;display:flex;gap:0.65rem}
.preset{flex:1;background:var(--white);border:1px solid var(--border);border-radius:var(--r-lg);padding:1.1rem 1.25rem;cursor:pointer;transition:transform .2s ease,border-color .2s ease,background .2s ease,box-shadow .2s ease;text-align:left;position:relative}
.preset:hover{border-color:var(--border2);background:var(--surface);transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,0.07)}
.preset.active{border-color:var(--red);background:var(--red-bg)}
.preset-dot{position:absolute;top:0.75rem;right:0.75rem;width:7px;height:7px;border-radius:50%;background:var(--red);display:none}
.preset.active .preset-dot{display:block}
.preset-icon{font-size:1.15rem;margin-bottom:0.4rem}
.preset-name{font-size:0.9rem;font-weight:600;color:var(--dark);margin-bottom:0.2rem}
.preset-desc{font-size:0.76rem;color:var(--mid);line-height:1.4}

@media(max-width:900px){
  .tool,.guide-card{grid-template-columns:1fr}
  .output{position:static;max-height:none}
  .feat-grid{grid-template-columns:1fr}
  .presets{flex-direction:column}
}
@media(max-width:600px){
  h1{font-size:1.75rem}
  .hero{padding:2.5rem 1rem 2rem}
  nav{padding:0 1rem}
}
@media(prefers-color-scheme:dark){
  :root{
    --bg:#18151F;
    --white:#211E2A;
    --surface:#2A2635;
    --border:#3A3547;
    --border2:#4D4760;
    --dark:#EDE9F8;
    --mid:#A09AB8;
    --light:#6E687F;
    --light2:#4D4760;
    --red:#F4534A;
    --red-bg:#2D1A1A;
    --red-border:#5C2828;
    --green:#22C55E;
    --green-bg:#0D2318;
    --amber:#F59E0B;
    --blue:#60A5FA;
  }
  .sk{color:#93C5FD}
  .sv{color:#34D399}
  .sn{color:#FCD34D}
  .sb{color:#F87171}
  .su{color:#C4B5FD}
  .chk-icon.warn{background:#2A1F00;border-color:#78350F}
  .chk-icon.info{background:#172554;border-color:#1E40AF}
  .chk-icon.ok{border-color:#14532D}
  .success-icon{border-color:#14532D}
  .tip-box{background:#2A2635;color:var(--mid);box-shadow:0 4px 16px rgba(0,0,0,0.5)}
  .grade-a{color:#22C55E;background:#0D2318;border-color:#14532D}
  .grade-b,.grade-c{color:#F59E0B;background:#2A1F00;border-color:#78350F}
  .grade-d{color:#F87171;background:#2D1A1A;border-color:#7F1D1D}
  .score-fill.grade-a{background:#22C55E}
  .score-fill.grade-b,.score-fill.grade-c{background:#F59E0B}
  .score-fill.grade-d{background:#F87171}
  .grade-ready{color:#22C55E;background:#0D2318;border-color:#14532D}
  .grade-partial{color:#F59E0B;background:#2A1F00;border-color:#78350F}
  .score-fill.grade-ready{background:#22C55E}
  .score-fill.grade-partial{background:#F59E0B}
}
</style>

<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-E8LV1M7ZXS"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', 'G-E8LV1M7ZXS');
</script>

<script type="text/javascript">
    (function(c,l,a,r,i,t,y){
        c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
        t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
        y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
    })(window, document, "clarity", "script", "wnwlwuuhc3");
</script>

</head>
<body>

<nav>
  <a class="logo" href="https://csp-generator.shakiltech.com">
    <div class="logo-dot"></div>
    CSP Generator
  </a>
  <div class="nav-right">
    <a class="nav-link" href="https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel" target="_blank">Blog Post</a>
    <a class="nav-link" href="https://securityheaders.com" target="_blank">Test Headers</a>
    <span class="nav-pill">Free Tool</span>
  </div>
</nav>

<section class="hero">
  <div class="hero-badge"><div class="hero-badge-dot"></div> Laravel Security</div>
  <h1>Generate a production-ready<br><em>Content Security Policy</em></h1>
  <p class="hero-sub">Configure your directives, copy the middleware, deploy with confidence. No signup needed.</p>
  <div class="hero-tags">
    <span class="tag">Nonce-based</span>
    <span class="tag">Vite-ready</span>
    <span class="tag">Livewire-aware</span>
    <span class="tag">Violation reporting</span>
    <span class="tag">100% client-side</span>
  </div>
</section>

<div class="presets">
  <div class="preset active" id="preset-strict" onclick="applyPreset('strict')">
    <div class="preset-dot"></div>
    <div class="preset-icon">🔒</div>
    <div class="preset-name">Strict</div>
    <div class="preset-desc">Minimal CDN allowlist. Best for new apps.</div>
  </div>
  <div class="preset" id="preset-standard" onclick="applyPreset('standard')">
    <div class="preset-dot"></div>
    <div class="preset-icon">⚖️</div>
    <div class="preset-name">Standard</div>
    <div class="preset-desc">Common CDNs, Google Fonts, GA4 ready.</div>
  </div>
  <div class="preset" id="preset-local" onclick="applyPreset('local')">
    <div class="preset-dot"></div>
    <div class="preset-icon">💻</div>
    <div class="preset-name">Local Dev</div>
    <div class="preset-desc">Vite HMR enabled, report-only on.</div>
  </div>
</div>

<div class="tool">

  <!-- CONFIG -->
  <div class="config">
    <div class="config-head">
      <span class="config-title">Configure</span>
      <button class="config-reset" onclick="applyPreset(currentPreset)">↺ Reset</button>
    </div>

    <!-- Environment -->
    <div class="cfg-section open" id="sec-env">
      <div class="cfg-section-head" onclick="toggleSec('env')">
        <span class="cfg-section-label"><span class="cfg-icon">🌍</span> Environment</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Local development <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Adds Vite's HMR WebSocket to connect-src and removes upgrade-insecure-requests. Never ship this to production.</div></div></div>
            <div class="trow-desc">Enables Vite HMR WebSocket</div>
          </div>
          <button class="toggle" id="t-local" onclick="tog('local')"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Report-only mode <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Uses Content-Security-Policy-Report-Only. Violations are reported but nothing is blocked. Run this for 1–2 weeks before enforcing.</div></div></div>
            <div class="trow-desc">Reports violations without blocking</div>
          </div>
          <button class="toggle" id="t-reportonly" onclick="tog('reportonly')"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Violation reporting <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Adds report-uri to the policy. Set up CspReportController to receive and classify reports.</div></div></div>
            <div class="trow-desc">Sends blocked resource reports to your endpoint</div>
          </div>
          <button class="toggle on" id="t-reporting" onclick="tog('reporting')"></button>
        </div>
      </div>
    </div>

    <!-- Scripts -->
    <div class="cfg-section open" id="sec-scripts">
      <div class="cfg-section-head" onclick="toggleSec('scripts')">
        <span class="cfg-section-label"><span class="cfg-icon">⚡</span> Scripts <span class="cfg-count" id="count-scripts"></span></span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="trow">
          <div class="trow-info"><div class="trow-name">cdn.jsdelivr.net</div></div>
          <button class="toggle on" id="t-jsdelivr" onclick="tog('jsdelivr')"></button>
        </div>
        <div class="trow">
          <div class="trow-info"><div class="trow-name">cdnjs.cloudflare.com</div></div>
          <button class="toggle on" id="t-cdnjs" onclick="tog('cdnjs')"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Tawk.to live chat</div>
            <div class="trow-desc">embed.tawk.to</div>
          </div>
          <button class="toggle" id="t-tawk" onclick="tog('tawk')"></button>
        </div>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">script-src custom</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" onclick="focusLast(this)">
            <div id="tags-script" style="display:contents"></div>
            <input class="tag-inp" placeholder="https://cdn.example.com" data-dir="script" onkeydown="tagKey(event)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Styles -->
    <div class="cfg-section" id="sec-styles">
      <div class="cfg-section-head" onclick="toggleSec('styles')">
        <span class="cfg-section-label"><span class="cfg-icon">🎨</span> Styles</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Google Fonts <div class="tip"><span class="tip-icon">?</span><div class="tip-box">Adds fonts.googleapis.com to style-src-elem and fonts.gstatic.com to font-src.</div></div></div>
            <div class="trow-desc">fonts.googleapis.com + fonts.gstatic.com</div>
          </div>
          <button class="toggle on" id="t-gfonts" onclick="tog('gfonts')"></button>
        </div>
        <div style="padding:0.7rem 0;border-bottom:1px solid var(--border);font-size:0.8rem;color:var(--light);line-height:1.5">
          <code style="font-family:var(--mono);font-size:0.76rem;background:var(--red-bg);color:var(--red);padding:0.1rem 0.3rem;border-radius:4px">style-src-attr</code> is always set to <code style="font-family:var(--mono);font-size:0.76rem;background:var(--red-bg);color:var(--red);padding:0.1rem 0.3rem;border-radius:4px">'none'</code> — inline <code style="font-family:var(--mono);font-size:0.74rem;color:var(--mid)">style=""</code> attributes cannot carry a nonce.
        </div>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">style-src custom</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" onclick="focusLast(this)">
            <div id="tags-style" style="display:contents"></div>
            <input class="tag-inp" placeholder="https://cdn.example.com" data-dir="style" onkeydown="tagKey(event)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Media -->
    <div class="cfg-section" id="sec-media">
      <div class="cfg-section-head" onclick="toggleSec('media')">
        <span class="cfg-section-label"><span class="cfg-icon">🖼</span> Images & Frames</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="dir-block" style="margin-top:0">
          <div class="dir-lbl"><span class="dir-name">img-src</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" onclick="focusLast(this)">
            <div id="tags-img" style="display:contents"></div>
            <input class="tag-inp" placeholder="https://your-cdn.com" data-dir="img" onkeydown="tagKey(event)" />
          </div>
        </div>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">frame-src</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" onclick="focusLast(this)">
            <div id="tags-frame" style="display:contents"></div>
            <input class="tag-inp" placeholder="https://video.example.com" data-dir="frame" onkeydown="tagKey(event)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Connect -->
    <div class="cfg-section" id="sec-connect">
      <div class="cfg-section-head" onclick="toggleSec('connect')">
        <span class="cfg-section-label"><span class="cfg-icon">🔗</span> Connect & APIs</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <p style="font-size:0.8rem;color:var(--light);line-height:1.5;padding:0.4rem 0 0.75rem;border-bottom:1px solid var(--border)">Controls <code style="font-family:var(--mono);color:var(--mid)">fetch()</code>, XHR, WebSockets and SSE. Vite HMR WebSocket is added automatically when local dev is on.</p>
        <div class="dir-block">
          <div class="dir-lbl"><span class="dir-name">connect-src custom</span><span class="dir-hint">Enter to add</span></div>
          <div class="tag-wrap" onclick="focusLast(this)">
            <div id="tags-connect" style="display:contents"></div>
            <input class="tag-inp" placeholder="https://api.example.com" data-dir="connect" onkeydown="tagKey(event)" />
          </div>
        </div>
      </div>
    </div>

    <!-- Integrations -->
    <div class="cfg-section" id="sec-integrations">
      <div class="cfg-section-head" onclick="toggleSec('integrations')">
        <span class="cfg-section-label"><span class="cfg-icon">🔌</span> Integrations</span>
        <span class="cfg-chevron">▾</span>
      </div>
      <div class="cfg-body">
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Google Analytics / GA4</div>
            <div class="trow-desc">Adds google-analytics.com to script-src + connect-src</div>
          </div>
          <button class="toggle" id="t-ga" onclick="tog('ga')"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Google Tag Manager <div class="tip"><span class="tip-icon">?</span><div class="tip-box">GTM custom HTML tags require unsafe-inline which weakens your policy. Consider server-side GTM instead.</div></div></div>
          </div>
          <button class="toggle" id="t-gtm" onclick="tog('gtm')"></button>
        </div>
        <div class="trow">
          <div class="trow-info">
            <div class="trow-name">Livewire</div>
            <div class="trow-desc">Adds nonce reminders to the checklist</div>
          </div>
          <button class="toggle" id="t-livewire" onclick="tog('livewire')"></button>
        </div>
      </div>
    </div>

  </div><!-- /config -->

  <!-- OUTPUT -->
  <div class="output">
    <div class="out-tabs">
      <div class="otab active" onclick="setTab('header')">HTTP Header</div>
      <div class="otab" onclick="setTab('php')">PHP Middleware</div>
      <div class="otab" onclick="setTab('checklist')">Checklist</div>
      <div class="otab" onclick="setTab('reference')">Reference</div>
    </div>
    <div class="out-body" id="out-body"></div>
  </div>

</div><!-- /tool -->

<!-- GUIDE CTA -->
<div class="guide-section">
  <div class="guide-card">
    <div class="guide-left">
      <div class="guide-label">Free PDF Guide</div>
      <div class="guide-title">Laravel CSP Quick Reference</div>
      <p class="guide-sub">4 pages. Every directive, the checklist, common mistakes, and quick-start snippets — without keeping this tab open.</p>
      <div class="guide-items">
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>All 13 directives</strong> with values and plain-English descriptions</div></div>
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>Pre-enforcement checklist</strong> — 12 items before enforcement</div></div>
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>5 common mistakes</strong> and how to avoid them</div></div>
        <div class="guide-item"><div class="guide-item-dot"></div><div class="guide-item-text"><strong>Blade, Vite & Livewire</strong> quick-start snippets</div></div>
      </div>
    </div>
    <div class="guide-right">
      <div class="pdf-card">
        <div class="pdf-icon"><span>PDF</span></div>
        <div style="flex:1;min-width:0">
          <div class="pdf-name">laravel-csp-guide.pdf</div>
          <div class="pdf-meta">4 pages · Free · Instant download</div>
        </div>
        <span class="pdf-pages">4 pages</span>
      </div>
      <div id="guide-form">
        <div class="guide-form">
          <div class="form-field">
            <label class="form-label" for="g-name">First name</label>
            <input class="form-input" id="g-name" type="text" placeholder="Your name" autocomplete="given-name" />
          </div>
          <div class="form-field">
            <label class="form-label" for="g-email">Email address</label>
            <input class="form-input" id="g-email" type="email" placeholder="you@yourapp.com" autocomplete="email" />
          </div>
          <input class="form-pot" id="g-pot" name="website" type="text" tabindex="-1" autocomplete="off" aria-hidden="true" />
          <button class="form-submit" onclick="submitGuide()">Send me the PDF →</button>
          <p class="form-privacy">No spam. Unsubscribe any time. PDF delivered immediately.</p>
        </div>
      </div>
      <div class="guide-success" id="guide-success">
        <div class="success-icon">✓</div>
        <div class="success-title">You're on the list</div>
        <div class="success-sub">Thanks for signing up. Download the guide below.</div>
        <a class="download-btn" href="https://csp-generator.shakiltech.com/laravel-csp-guide.pdf" download>↓ Download PDF</a>
      </div>
    </div>
  </div>
</div>

<!-- FEATURES -->
<section class="features">
  <div class="section-intro">
    <div class="section-label">Why this tool</div>
    <div class="section-title">Everything you need to ship secure</div>
    <p class="section-sub">Not just a header builder — a complete workflow from configuration to deployment.</p>
  </div>
  <div class="feat-grid">
    <div class="feat-card">
      <div class="feat-icon">🎯</div>
      <div class="feat-title">Nonce-based by default</div>
      <div class="feat-body">Every policy uses cryptographic nonces — never unsafe-inline. The middleware handles generation, Blade sharing, and Vite registration automatically.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">🚨</div>
      <div class="feat-title">Violation reporting included</div>
      <div class="feat-body">The PHP output includes a complete reporting pipeline — route, controller, log channels, extension filtering, and threshold alerting.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">⚡</div>
      <div class="feat-title">Environment-aware</div>
      <div class="feat-body">Local dev mode adds Vite's HMR WebSocket and removes upgrade-insecure-requests automatically. Nothing leaks to production.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">📋</div>
      <div class="feat-title">Dynamic checklist</div>
      <div class="feat-body">The pre-enforcement checklist adapts to your config. Livewire items appear only when Livewire is on. Report-only mode tells you what to do next.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">⚖️</div>
      <div class="feat-title">Policy strength score</div>
      <div class="feat-body">Real-time score from D to A+ that grades your policy on nonce usage, HTTPS enforcement, allowlist size, and reporting coverage.</div>
    </div>
    <div class="feat-card">
      <div class="feat-icon">🔒</div>
      <div class="feat-title">Strict CSS directives</div>
      <div class="feat-body">Correctly separates style-src, style-src-elem, and style-src-attr. style-src-attr is always set to 'none' — the only safe option.</div>
    </div>
  </div>
</section>

<!-- FAQ -->
<section class="faq">
  <div style="text-align:center;margin-bottom:2rem">
    <div class="section-label">Common questions</div>
    <div class="section-title">FAQ</div>
  </div>
  <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">What is a Content Security Policy (CSP)? <span class="faq-ch">▾</span></button><div class="faq-a">A CSP is an HTTP response header that tells browsers which sources of scripts, styles, images, and other resources are allowed to load on your page. It's your primary defense against <strong>cross-site scripting (XSS)</strong> — if malicious code is injected into your HTML, the browser refuses to execute it because it doesn't come from an approved source.</div></div>
  <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Should I use report-only mode before enforcing? <span class="faq-ch">▾</span></button><div class="faq-a">Yes — always. Set <code>Content-Security-Policy-Report-Only</code> with a <code>report-to</code> endpoint first. Browsers log violations but block nothing. Run it in production for 1–2 weeks, review the reports, fix any legitimate sources, then switch to enforcement mode.</div></div>
  <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Can I use CSP with CDNs or third-party scripts? <span class="faq-ch">▾</span></button><div class="faq-a">Yes, but carefully. Add the CDN hostname to the correct directive — e.g. <code>script-src cdn.example.com</code>. Avoid <code>'unsafe-inline'</code> or <code>*</code> wildcards — they defeat the purpose. For extra protection, add <strong>Subresource Integrity (SRI)</strong> hashes to your <code>&lt;script&gt;</code> and <code>&lt;link&gt;</code> tags.</div></div>
  <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Does CSP break my existing Laravel app? <span class="faq-ch">▾</span></button><div class="faq-a">It can — if you have inline scripts or styles without nonces. Use <code>Report-Only</code> mode first. The browser reports violations but blocks nothing. Run it for a week, fix your templates, then enforce.</div></div>
  <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">My Vite HMR stopped working after adding CSP. <span class="faq-ch">▾</span></button><div class="faq-a">Two things. First, make sure <code>Vite::useCspNonce($nonce)</code> is called before <code>$next($request)</code>. Second, make sure <code>connect-src</code> includes <code>ws://localhost:5173</code> in your local environment. Enable Local Dev mode above — it handles both.</div></div>
  <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">Do I need CSP if I already have CSRF protection? <span class="faq-ch">▾</span></button><div class="faq-a">Yes. They protect against different attacks. CSRF prevents forged requests from other domains. CSP prevents injected scripts from running on your domain. One doesn't substitute for the other.</div></div>
  <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">What's the difference between report-uri and Report-To? <span class="faq-ch">▾</span></button><div class="faq-a"><code>report-uri</code> is the original, widely supported mechanism. <code>Report-To</code> is the newer Reporting API — reports are batched and the endpoint is cached. Use both for maximum coverage, or use <a href="https://report-uri.com" target="_blank" style="color:var(--red)">report-uri.com</a> as a hosted alternative.</div></div>
  <div class="faq-item"><button class="faq-q" onclick="toggleFaq(this)">How do I handle CSP with Livewire? <span class="faq-ch">▾</span></button><div class="faq-a">For Livewire v2: <code>@livewireScripts(['nonce' => $cspNonce])</code>. For Livewire v3: <code>@livewireScriptConfig(['nonce' => $cspNonce])</code>. Enable the Livewire integration above and the checklist will remind you.</div></div>
</section>

<footer>
  <p class="footer-text">
    Built by <a href="https://blog.shakiltech.com">Shakil</a> &nbsp;·&nbsp;
    <a href="https://blog.shakiltech.com/how-we-implemented-content-security-policy-csp-laravel">Read the blog post</a> &nbsp;·&nbsp;
    <a href="https://securityheaders.com" target="_blank">Test your headers</a> &nbsp;·&nbsp;
    <a href="https://csp-evaluator.withgoogle.com" target="_blank">CSP Evaluator</a>
  </p>
</footer>

<script>
// ── State ─────────────────────────────────────────────────────────────────────
const S = {
  local:false,reportonly:false,reporting:true,
  jsdelivr:true,cdnjs:true,tawk:false,
  gfonts:true,ga:false,gtm:false,livewire:false,
  tags:{script:[],style:[],img:[],frame:[],connect:[]}
};

let currentTab = 'header';
let currentPreset = 'strict';

// ── Presets ───────────────────────────────────────────────────────────────────
const PRESETS = {
  strict:   {local:false,reportonly:false,reporting:true,jsdelivr:false,cdnjs:false,tawk:false,gfonts:false,ga:false,gtm:false,livewire:false},
  standard: {local:false,reportonly:false,reporting:true,jsdelivr:true,cdnjs:true,tawk:false,gfonts:true,ga:false,gtm:false,livewire:false},
  local:    {local:true,reportonly:true,reporting:true,jsdelivr:true,cdnjs:true,tawk:false,gfonts:true,ga:false,gtm:false,livewire:false},
};

function saveState(){try{localStorage.setItem('csp-state',JSON.stringify(S));}catch(e){}}

function applyPreset(name) {
  currentPreset = name;
  const p = PRESETS[name];
  Object.assign(S, p);
  S.tags = {script:[],style:[],img:[],frame:[],connect:[]};
  ['script','style','img','frame','connect'].forEach(d => {
    const c = document.getElementById('tags-'+d);
    if(c) [...c.querySelectorAll('.dtag')].forEach(t=>t.remove());
  });
  ['local','reportonly','reporting','jsdelivr','cdnjs','tawk','gfonts','ga','gtm','livewire'].forEach(k => {
    const el = document.getElementById('t-'+k);
    if(el) el.classList.toggle('on', S[k]);
  });
  document.querySelectorAll('.preset').forEach(c=>c.classList.remove('active'));
  const pc = document.getElementById('preset-'+name);
  if(pc) pc.classList.add('active');
  render();
  saveState();
}

function tog(key) {
  S[key] = !S[key];
  document.getElementById('t-'+key).classList.toggle('on', S[key]);
  currentPreset = '';
  document.querySelectorAll('.preset').forEach(c=>c.classList.remove('active'));
  render();
  saveState();
}

function toggleSec(id) {
  document.getElementById('sec-'+id).classList.toggle('open');
}

function toggleFaq(btn) { btn.closest('.faq-item').classList.toggle('open'); }

function setTab(t) {
  currentTab = t;
  document.querySelectorAll('.otab').forEach((el,i)=>el.classList.toggle('active',['header','php','checklist','reference'][i]===t));
  render();
}

// ── Tag inputs ────────────────────────────────────────────────────────────────
function tagKey(e) {
  if(e.key==='Enter'||e.key===',') {
    e.preventDefault();
    const inp=e.target,val=inp.value.trim().replace(/,$/,''),dir=inp.dataset.dir;
    if(val&&val.length>3&&!S.tags[dir].includes(val)) {
      S.tags[dir].push(val);
      const c=document.getElementById('tags-'+dir);
      const t=document.createElement('span');
      t.className='dtag';
      t.innerHTML=`${esc(val)}<button class="dtag-x" onclick="rmTag('${dir}','${esc(val)}',this.parentElement)">×</button>`;
      c.appendChild(t);
      render();
      saveState();
    }
    inp.value='';
  }
  if(e.key==='Backspace'&&!e.target.value) {
    const dir=e.target.dataset.dir;
    if(S.tags[dir].length>0) {
      S.tags[dir].pop();
      const c=document.getElementById('tags-'+dir);
      const tags=c.querySelectorAll('.dtag');
      if(tags.length) tags[tags.length-1].remove();
      render();
      saveState();
    }
  }
}

function rmTag(dir,val,el) { S.tags[dir]=S.tags[dir].filter(v=>v!==val);el.remove();render();saveState(); }
function focusLast(w) { w.querySelector('.tag-inp').focus(); }
function esc(s) { return s.replace(/'/g,"&#39;").replace(/</g,'&lt;'); }

// ── Build policy ──────────────────────────────────────────────────────────────
function buildDirs() {
  const n="'nonce-{$nonce}'",sf="'self'";
  const sc=[sf,n,...(S.jsdelivr?['https://cdn.jsdelivr.net']:[]),...(S.cdnjs?['https://cdnjs.cloudflare.com']:[]),
    ...(S.tawk?['https://embed.tawk.to']:[]),...(S.ga?['https://www.google-analytics.com']:[]),
    ...(S.gtm?['https://www.googletagmanager.com']:[]),...S.tags.script];
  const st2=[sf,n,...(S.gfonts?['https://fonts.googleapis.com']:[]),...(S.cdnjs?['https://cdnjs.cloudflare.com']:[]),...S.tags.style];
  const fn=[sf,'data:',...(S.gfonts?['https://fonts.gstatic.com']:[]),...(S.cdnjs?['https://cdnjs.cloudflare.com']:[])];
  const im=[sf,'data:',...(S.cdnjs?['https://cdnjs.cloudflare.com']:[]),...S.tags.img];
  const fr=[sf,...S.tags.frame];
  const cn=[sf,...(S.local?['ws://localhost:5173','wss://localhost:5173']:[]),...(S.ga?['https://www.google-analytics.com']:[]),...S.tags.connect];

  const dirs=[
    {k:"default-src",v:[sf]},{k:"script-src",v:sc},{k:"style-src",v:st2},
    {k:"style-src-elem",v:st2},{k:"style-src-attr",v:["'none'"]},
    {k:"font-src",v:fn},{k:"img-src",v:im},{k:"frame-src",v:fr},
    {k:"connect-src",v:cn},{k:"object-src",v:["'none'"]},
    {k:"base-uri",v:[sf]},{k:"frame-ancestors",v:["'none'"]},
  ];
  if(!S.local) dirs.push({k:'upgrade-insecure-requests',v:[]});
  if(S.reporting) dirs.push({k:'report-uri',v:['/api/csp-violation-report']});
  return dirs;
}

function dirStr(dirs) { return dirs.map(d=>d.v.length?`${d.k} ${d.v.join(' ')}`:d.k).join('; '); }

function score() {
  let s=30;
  if(!S.local) s+=15;if(S.reporting) s+=20;
  if(!S.gtm&&!S.tawk&&S.tags.script.length===0) s+=15;if(!S.gtm) s+=10;if(!S.local) s+=10;
  return Math.min(s,100);
}

function scoreMeta(n) {
  if(n>=90)return{l:'A+',cls:'grade-a'};
  if(n>=75)return{l:'A', cls:'grade-a'};
  if(n>=60)return{l:'B', cls:'grade-b'};
  if(n>=40)return{l:'C', cls:'grade-c'};
  return      {l:'D',  cls:'grade-d'};
}

function hl(s) {
  return s
    .replace(/([a-z][-a-z]+(?:-src|-ancestors|-uri|-requests|-content)*)(?=\s|;|$)/g,'<span class="sk">$1</span>')
    .replace(/'self'/g,"<span class='sv'>'self'</span>")
    .replace(/'none'/g,"<span class='sb'>'none'</span>")
    .replace(/'nonce-\{\$nonce\}'/g,"<span class='sn'>'nonce-{$nonce}'</span>")
    .replace(/(https?:\/\/[^\s;]+)/g,"<span class='su'>$1</span>")
    .replace(/(wss?:\/\/[^\s;]+)/g,"<span class='su'>$1</span>")
    .replace(/\/api\/csp-violation-report/g,"<span class='su'>/api/csp-violation-report</span>");
}

function copyEl(id,btnId) {
  const t=document.getElementById(id).innerText;
  navigator.clipboard.writeText(t).then(()=>{
    const b=document.getElementById(btnId);if(!b)return;
    const o=b.textContent;b.textContent='Copied!';b.classList.add('ok');
    setTimeout(()=>{b.textContent=o;b.classList.remove('ok');},1800);
  });
}

function dlFile(id,name) {
  const a=document.createElement('a');
  a.href='data:text/plain;charset=utf-8,'+encodeURIComponent(document.getElementById(id).innerText);
  a.download=name;a.click();
}

function pad(s,n){return s+' '.repeat(Math.max(0,n-s.length));}

// ── Render ────────────────────────────────────────────────────────────────────
function render() {
  const dirs=buildDirs(),pol=dirStr(dirs),sc=score(),sm=scoreMeta(sc);
  const hn=S.reportonly?'Content-Security-Policy-Report-Only':'Content-Security-Policy';
  const body=document.getElementById('out-body');

  const scoreHTML=`
    <div class="score-row">
      <span class="score-label">Policy strength</span>
      <span class="score-chip ${sm.cls}">${sm.l} · ${sc}/100</span>
    </div>
    <div class="score-track"><div class="score-fill ${sm.cls}" style="width:${sc}%"></div></div>`;

  if(currentTab==='header') {
    body.innerHTML=scoreHTML+`
    <div class="code-block">
      <div class="code-hdr">
        <span class="code-title">${hn}</span>
        <div class="code-actions"><button class="cbtn" id="btn-hdr" onclick="copyEl('pre-hdr','btn-hdr')">Copy</button></div>
      </div>
      <pre id="pre-hdr">${hl(pol)}</pre>
    </div>
    <div class="code-block">
      <div class="code-hdr"><span class="code-title">Directive breakdown</span></div>
      <pre>${dirs.map(d=>`<span class="sk">${pad(d.k,24)}</span> <span class="sv">${d.v.length?d.v.join(' '):'(flag)'}</span>`).join('\n')}</pre>
    </div>`;

  } else if(currentTab==='php') {
    const php=`<span class="sc">private bool $allowReporting;</span>

<span class="sc">public function __construct()
{
    $this->allowReporting = !app()->environment(['local', 'testing']);
}</span>

public function handle(Request $request, Closure $next): Response
{
    $nonce = base64_encode(random_bytes(16));
    View::share(<span class="sn">'cspNonce'</span>, $nonce);
    Vite::useCspNonce($nonce); <span class="sc">// Don't skip this — @vite() needs it</span>

    $response = $next($request);

    $this->addContentSecurityPolicy($response, $nonce, $request);
    <span class="sc">// ... addClickjackingProtection, addStrictTransportSecurity, etc.</span>

    return $response;
}

protected function addContentSecurityPolicy(Response $response, string $nonce, Request $request): void
{
    $isLocal = app()->environment('local');

    $policy = [
${dirs.map(d=>{const v=d.v.length?`"${d.k} ${d.v.join(' ')}"`:(`'${d.k}'`);return`        ${v},`;}).join('\n')}
    ];

    $response->headers->set(<span class="sn">'${hn}'</span>, implode(<span class="sn">'; '</span>, $policy));
}`;

    body.innerHTML=`
    <div class="code-block">
      <div class="code-hdr">
        <span class="code-title">SecureHeadersMiddleware.php</span>
        <div class="code-actions">
          <button class="cbtn" id="btn-php" onclick="copyEl('pre-php','btn-php')">Copy</button>
          <button class="cbtn" onclick="dlFile('pre-php','SecureHeadersMiddleware.php')">Download</button>
        </div>
      </div>
      <pre id="pre-php">${php}</pre>
    </div>
    <div class="code-block">
      <div class="code-hdr"><span class="code-title">Blade — nonce usage</span><div class="code-actions"><button class="cbtn" id="btn-blade" onclick="copyEl('pre-blade','btn-blade')">Copy</button></div></div>
      <pre id="pre-blade">@vite(['resources/js/app.js'])  <span class="sc">{{-- nonce auto-handled --}}</span>
&lt;script nonce=<span class="sn">"{{ $cspNonce }}"</span>&gt;...&lt;/script&gt;
&lt;style  nonce=<span class="sn">"{{ $cspNonce }}"</span>&gt;...&lt;/style&gt;${S.livewire?`
@livewireScriptConfig(['nonce' => $cspNonce])  <span class="sc">{{-- Livewire v3 --}}</span>`:''}</pre>
    </div>`;

  } else if(currentTab==='checklist') {
    const items=[
      {t:'ok',  tx:'<strong>Vite::useCspNonce($nonce)</strong> called before $next($request)'},
      {t:'ok',  tx:'<strong>View::share(\'cspNonce\', $nonce)</strong> in middleware'},
      {t:'ok',  tx:'All inline <strong>&lt;script&gt;</strong> blocks have <strong>nonce="{{ $cspNonce }}"</strong>'},
      {t:'ok',  tx:'All inline <strong>&lt;style&gt;</strong> blocks have <strong>nonce="{{ $cspNonce }}"</strong>'},
      {t: S.livewire?'ok':'info', tx: S.livewire
        ? '<strong>@livewireScripts([\'nonce\' => $cspNonce])</strong> or <strong>@livewireScriptConfig</strong> — nonce passed'
        : 'Livewire not enabled — if you add it, pass the nonce to <strong>@livewireScripts</strong>'},
      {t:'ok',  tx:'<strong>onclick=""</strong> and event handler attributes removed from templates'},
      {t:'ok',  tx:'<strong>style=""</strong> attributes replaced with CSS classes'},
      {t: S.reporting?'ok':'warn', tx: S.reporting
        ? 'Violation report route live with <strong>middleware(\'throttle:5\')</strong>'
        : 'Reporting is off — enable it to catch misconfigurations'},
      {t: !S.local?'ok':'warn', tx: S.local
        ? '<strong>Local dev mode is on</strong> — turn this off before deploying'
        : 'Production mode — localhost WebSocket not in connect-src'},
      {t: S.reportonly?'warn':'ok', tx: S.reportonly
        ? '<strong>Report-only</strong> — nothing is blocked yet. Run 1–2 weeks then enforce.'
        : 'Enforcement mode active'},
      {t:'info', tx:'Verify headers at <strong>securityheaders.com</strong> after deploying'},
    ];
    const done=items.filter(i=>i.t==='ok').length;
    const sm2cls=done===items.length?'grade-ready':'grade-partial';
    body.innerHTML=`
    <div class="score-row">
      <span class="score-label">Readiness</span>
      <span class="score-chip ${sm2cls}">${done}/${items.length} ready</span>
    </div>
    <div class="score-track" style="margin-bottom:1.2rem"><div class="score-fill ${sm2cls}" style="width:${Math.round(done/items.length*100)}%"></div></div>
    <div class="chk-list">
      ${items.map(i=>`
      <div class="chk-row">
        <div class="chk-icon ${i.t}">${i.t==='ok'?'✓':i.t==='warn'?'!':'→'}</div>
        <div class="chk-text">${i.tx}</div>
      </div>`).join('')}
    </div>`;

  } else {
    body.innerHTML=`
    <div class="code-block">
      <div class="code-hdr"><span class="code-title">Directive reference</span></div>
      <table class="dir-table">
        <tbody>
          ${[
            ['default-src','\'self\'','Fallback for any type not explicitly listed'],
            ['script-src','\'self\' + nonce','JavaScript execution. No nonce = blocked.'],
            ['style-src','\'self\' + nonce','CSS base fallback. Also governs @import rules.'],
            ['style-src-elem','\'self\' + nonce','link rel=stylesheet tags and style blocks.'],
            ['style-src-attr','\'none\'','Inline style= attributes. Always block.'],
            ['font-src','\'self\' data:','Font files.'],
            ['img-src','\'self\' data:','Image loading.'],
            ['frame-src','\'self\'','iframe sources.'],
            ['connect-src','\'self\'','fetch(), XHR, WebSockets, SSE.'],
            ['object-src','\'none\'','Browser plugins. Always block.'],
            ['base-uri','\'self\'','Prevents base href injection.'],
            ['frame-ancestors','\'none\'','Clickjacking protection.'],
            ['upgrade-insecure-requests','(flag)','Auto-upgrade HTTP to HTTPS.'],
          ].map(([k,v,d])=>`<tr><td>${k}</td><td>${v}</td><td>${d}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
    <div class="code-block">
      <div class="code-hdr"><span class="code-title">Useful links</span></div>
      <pre style="display:flex;flex-direction:column;gap:0.5rem">
${[['MDN CSP Reference','https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/Content-Security-Policy'],
   ['Grade your headers','https://securityheaders.com'],
   ['CSP Evaluator','https://csp-evaluator.withgoogle.com'],
   ['Violation reporting','https://report-uri.com'],
   ['Spatie laravel-csp','https://github.com/spatie/laravel-csp'],
].map(([l,u])=>`        <a href="${u}" target="_blank" style="color:var(--blue);text-decoration:none;font-size:0.76rem">↗ ${l}</a>`).join('\n')}</pre>
    </div>`;
  }

  // Script count badge
  const cnt=document.getElementById('count-scripts');
  if(cnt){let n=0;if(S.jsdelivr)n++;if(S.cdnjs)n++;if(S.tawk)n++;if(S.ga)n++;if(S.gtm)n++;n+=S.tags.script.length;cnt.textContent=n||'';cnt.style.display=n?'':'none';}
}

// ── Guide form ────────────────────────────────────────────────────────────────
const _formTs=Date.now();
async function submitGuide() {
  const email=document.getElementById('g-email').value;
  const name=document.getElementById('g-name').value||'Friend';
  const pot=document.getElementById('g-pot').value;
  if(!email||!email.includes('@')) { document.getElementById('g-email').style.borderColor='var(--red)'; return; }
  const btn=document.querySelector('.form-submit');
  if(btn){btn.disabled=true;btn.textContent='Sending…';}
  try {
    const res=await fetch('https://csp-generator.shakiltech.com/save-email.php',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,email,pot,ts:_formTs}),
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok||data.ok===false){throw new Error(data.error||'Request failed');}
  } catch(e) {
    if(btn){btn.disabled=false;btn.textContent='Send me the PDF →';}
    document.getElementById('g-email').style.borderColor='var(--red)';
    return;
  }
  document.getElementById('guide-form').style.display='none';
  document.getElementById('guide-success').style.display='block';
}

(function(){
  try {
    const raw=localStorage.getItem('csp-state');
    if(raw){
      const saved=JSON.parse(raw);
      Object.keys(S).forEach(k=>{
        if(k==='tags'){if(saved.tags)Object.assign(S.tags,saved.tags);}
        else if(saved[k]!==undefined)S[k]=saved[k];
      });
      ['local','reportonly','reporting','jsdelivr','cdnjs','tawk','gfonts','ga','gtm','livewire'].forEach(k=>{
        const el=document.getElementById('t-'+k);
        if(el)el.classList.toggle('on',S[k]);
      });
      Object.keys(S.tags).forEach(dir=>{
        const c=document.getElementById('tags-'+dir);
        if(!c)return;
        S.tags[dir].forEach(val=>{
          const t=document.createElement('span');
          t.className='dtag';
          t.innerHTML=val+'<button class="dtag-x" onclick="rmTag(\''+dir+'\',\''+val+'\',this.parentElement)">×</button>';
          c.appendChild(t);
        });
      });
      render();
      return;
    }
  }catch(e){}
  applyPreset('strict');
})();

if('serviceWorker' in navigator){
  window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});
}
</script>
</body>
</html>