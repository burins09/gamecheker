// server.js
// Minimal one-file web app: Express UI + Playwright backend checker
// How to run locally:
//   npm init -y
//   npm i express playwright
//   npx playwright install
//   node server.js
// Open http://localhost:3000

const express = require('express');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const app = express();
const PORT = process.env.PORT || 3000;

// Serve artifacts (allow override via ART_DIR for Render persistent disk)
const ART_DIR = process.env.ART_DIR ? path.resolve(process.env.ART_DIR) : path.join(__dirname, 'artifacts');
fs.mkdirSync(ART_DIR, { recursive: true });
app.use('/artifacts', express.static(ART_DIR, { maxAge: '1h' }));

app.get('/', (req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>RC Game Load Checker</title>
<style>
  :root { --bg:#0b0f19; --card:#12182a; --muted:#98a2b3; --ok:#16a34a; --warn:#f59e0b; --err:#ef4444; --txt:#e5e7eb; }
  body{margin:0;background:linear-gradient(120deg,#0b0f19,#111827);font-family: ui-sans-serif,system-ui,Segoe UI,Roboto,Helvetica,Arial;color:var(--txt)}
  .wrap{max-width:1100px;margin:32px auto;padding:0 16px}
  .card{background:var(--card);border-radius:16px;box-shadow:0 10px 30px rgba(0,0,0,.25);padding:20px}
  h1{margin:0 0 12px;font-size:28px}
  .row{display:flex;gap:12px;flex-wrap:wrap}
  input[type=url]{flex:1;min-width:260px;padding:12px 14px;border-radius:12px;border:1px solid #23304f;background:#0e1425;color:var(--txt)}
  button{padding:12px 16px;border-radius:12px;border:0;background:#2563eb;color:#fff;font-weight:600;cursor:pointer}
  button:disabled{opacity:.6;cursor:default}
  .hint{color:var(--muted);font-size:14px;margin-top:6px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
  .kvs{display:grid;grid-template-columns:210px 1fr;gap:8px}
  .badge{display:inline-block;padding:4px 8px;border-radius:999px;font-size:12px}
  .ok{background:rgba(22,163,74,.15);color:#86efac}
  .warn{background:rgba(245,158,11,.15);color:#fde68a}
  .err{background:rgba(239,68,68,.15);color:#fecaca}
  pre{white-space:pre-wrap;background:#0e1425;border-radius:12px;padding:12px;overflow:auto}
  a{color:#93c5fd}
  iframe{width:100%;height:460px;border:1px solid #1f2937;border-radius:12px;background:#0e1425}
  .shots{display:flex;gap:12px;flex-wrap:wrap}
  .shots img{max-width:100%;height:160px;object-fit:cover;border-radius:12px;border:1px solid #1f2937}
</style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      <h1>RC Game Load Checker</h1>
      <div class="row">
        <input id="url" type="url" placeholder="วาง URL เกม เช่น https://dev-v5.royalcasino.dk/spilleautomater/spil-for-sjov/book-bonanza" value="https://dev-v5.royalcasino.dk/spilleautomater/spil-for-sjov/book-bonanza" />
        <button id="run">ตรวจสอบ</button>
      </div>
      <div class="hint">ทูลนี้จะเปิดเบราว์เซอร์จริง (headless) ตรวจโหลดหน้า เช็ค iframes ว่านำทางออกจาก about:blank และรอให้สถานะโหลดสำเร็จ พร้อมเก็บสกรีนช็อต</div>
    </div>

    <div id="result" class="card" style="margin-top:16px;display:none"></div>

    <div class="card" style="margin-top:16px">
      <h3>พรีวิว URL ในหน้า (ไม่ได้ใช้วัดผล เพียงเพื่อดูหน้าตา)</h3>
      <iframe id="preview" sandbox="allow-scripts allow-forms allow-same-origin allow-popups"></iframe>
    </div>
  </div>
<script>
const el = (q) => document.querySelector(q);
const resBox = el('#result');
const btn = el('#run');
const urlIn = el('#url');
const preview = el('#preview');

function badge(ok){
  return `<span class="badge ${ok===true?'ok': ok==='warn'?'warn':'err'}">${ok===true?'PASS': ok==='warn'?'WARN':'FAIL'}</span>`
}

function render(data){
  const { targetUrl, summary, pageStatus, network, consoleErrors, iframes, artifactsBase, timings, outDirName, error } = data;
  const anyFail = !summary.pageLoaded || !summary.hasIframes || !summary.iframeNavigated;

  let frameRows = '';
  for(const f of iframes){
    frameRows += `
      <div class="kvs">
        <div>ชื่อ iframe</div><div>${f.name||'-'}</div>
        <div>URL</div><div>${f.url||'-'}</div>
        <div>นำทางออกจาก about:blank</div><div>${badge(!!f.navigated)}</div>
        <div>load state</div><div>${f.loadState||'-'}</div>
        <div>สรุป frame</div><div>${badge(!!(f.navigated && f.loadOk))}</div>
        <div>บันทึก</div><div>${(f.notes||[]).join('<br>')||'-'}</div>
      </div>
      ${f.screenshot?`<div class="shots"><a href="${f.screenshot}" target="_blank"><img src="${f.screenshot}" alt="iframe shot"/></a></div>`:''}
      <hr style="border-color:#1f2937"/>
    `
  }

  resBox.innerHTML = `
    <h2>ผลการตรวจ</h2>
    <div class="kvs">
      <div>URL</div><div><a href="${targetUrl}" target="_blank">${targetUrl}</a></div>
      <div>Page loaded</div><div>${badge(!!summary.pageLoaded)}</div>
      <div>พบ iframes</div><div>${summary.hasIframes? badge(true)+` (${iframes.length} รายการ)`: badge(false)}</div>
      <div>มีอย่างน้อย 1 iframe ที่ OK</div><div>${badge(!!summary.iframeNavigated)}</div>
      <div>สถานะเพจ</div><div>${pageStatus}</div>
      <div>คำขอทั้งหมด</div><div>${network.totalRequests}</div>
      <div>คำขอล้มเหลว</div><div>${network.failedRequests.length}</div>
      <div>HTTP >= 400</div><div>${network.errorResponses.length}</div>
      <div>Console errors</div><div>${consoleErrors.length}</div>
      <div>First load (ms)</div><div>${timings.firstLoadMs||'-'}</div>
      <div>Network idle (ms)</div><div>${timings.networkIdleMs||'-'}</div>
      <div>Artifacts</div><div>
        <div class="shots">
          <a href="${artifactsBase}/page.png" target="_blank"><img src="${artifactsBase}/page.png" alt="page shot"/></a>
        </div>
        <div class="hint"><a href="${artifactsBase}/result.json" target="_blank">result.json</a> • โฟลเดอร์: ${outDirName}</div>
      </div>
    </div>
    ${error?`<div class="hint" style="color:#fca5a5">Error: ${error}</div>`:''}
    <h3 style="margin-top:16px">รายละเอียด Iframes</h3>
    ${frameRows || '<div class="hint">ไม่พบ iframe</div>'}
  `;
  resBox.style.display = 'block';
}

async function run(){
  const target = urlIn.value.trim();
  if(!target) return;
  btn.disabled = true; btn.textContent = 'กำลังตรวจสอบ...';
  resBox.style.display = 'none';
  preview.src = target;
  try{
    const r = await fetch('/api/check?url=' + encodeURIComponent(target));
    const data = await r.json();
    render(data);
  }catch(e){
    resBox.style.display='block';
    resBox.innerHTML = `<div class="hint" style="color:#fca5a5">เกิดข้อผิดพลาด: ${e.message}</div>`
  }finally{
    btn.disabled = false; btn.textContent = 'ตรวจสอบ';
  }
}

btn.addEventListener('click', run);
</script>
</body>
</html>`);
});

app.get('/api/check', async (req, res) => {
  const targetUrl = (req.query.url || '').toString();
  const globalTimeout = 45000;

  if (!/^https?:\/\//i.test(targetUrl)) {
    return res.status(400).json({ error: 'Please provide a valid http(s) URL via ?url=' });
  }

  const outDirName = `run_${Date.now()}`;
  const outDir = path.join(ART_DIR, outDirName);
  fs.mkdirSync(outDir, { recursive: true });

  const payload = {
    targetUrl,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    timings: {},
    pageStatus: 'unknown',
    network: { totalRequests: 0, failedRequests: [], errorResponses: [] },
    consoleErrors: [],
    iframes: [],
    summary: { pageLoaded: false, hasIframes: false, iframeNavigated: false, allIframesOK: false },
    artifactsBase: `/artifacts/${outDirName}`,
    outDirName
  };

  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119 Safari/537.36 RC-Checker/1.0',
    });
    const page = await context.newPage();

    page.on('console', (msg) => { if (msg.type() === 'error') payload.consoleErrors.push({ type: msg.type(), text: msg.text() }); });
    page.on('request', () => { payload.network.totalRequests += 1; });
    page.on('requestfailed', (req) => { payload.network.failedRequests.push({ url: req.url(), method: req.method(), failure: req.failure()?.errorText || 'unknown' }); });
    page.on('response', (resp) => { const s = resp.status(); if (s >= 400) payload.network.errorResponses.push({ url: resp.url(), status: s, statusText: resp.statusText() }); });

    const navStart = Date.now();
    await page.goto(targetUrl, { timeout: globalTimeout, waitUntil: 'load' });
    payload.timings.firstLoadMs = Date.now() - navStart;

    const idleStart = Date.now();
    try { await page.waitForLoadState('networkidle', { timeout: 15000 }); payload.timings.networkIdleMs = Date.now() - idleStart; } catch (_) {}

    await page.screenshot({ path: path.join(outDir, 'page.png'), fullPage: true });
    payload.summary.pageLoaded = true;
    payload.pageStatus = 'loaded';

    // Iframe analysis
    const frames = page.frames().filter(f => f !== page.mainFrame());
    payload.summary.hasIframes = frames.length > 0;

    for (const f of frames) {
      const info = { name: f.name() || null, url: f.url() || null, loadState: 'unknown', navigated: false, loadOk: false, screenshot: null, notes: [] };

      // Wait for non about:blank
      try {
        const start = Date.now();
        while ((f.url() === '' || f.url() === 'about:blank') && Date.now() - start < 15000) {
          await new Promise(r => setTimeout(r, 250));
        }
        if (f.url() && f.url() !== 'about:blank') info.navigated = true;
      } catch (e) { info.notes.push('navigate wait error: ' + e.message); }

      try { await f.waitForLoadState('load', { timeout: 15000 }); info.loadState = 'load'; info.loadOk = true; } catch (e) { info.notes.push('waitForLoadState error/timeout'); }

      try {
        const el = await f.frameElement();
        if (el) {
          const box = await el.boundingBox();
          if (box) {
            const shot = path.join(outDir, `iframe-${(info.name||'noname').replace(/[^a-z0-9_-]/gi,'_')}-${Date.now()}.png`);
            await page.screenshot({ path: shot, clip: box });
            info.screenshot = `/artifacts/${outDirName}/${path.basename(shot)}`;
          }
        }
      } catch (e) { info.notes.push('iframe screenshot error'); }

      payload.iframes.push(info);
    }

    const okFrames = payload.iframes.filter(f => f.navigated && f.loadOk);
    payload.summary.iframeNavigated = okFrames.length > 0;
    payload.summary.allIframesOK = payload.iframes.length > 0 && okFrames.length === payload.iframes.length;

  } catch (e) {
    payload.pageStatus = 'navigation_failed';
    payload.error = e.message;
  } finally {
    payload.finishedAt = new Date().toISOString();
    try { if (browser) await browser.close(); } catch {}
    try { fs.writeFileSync(path.join(outDir, 'result.json'), JSON.stringify(payload, null, 2)); } catch {}
  }

  res.json(payload);
});

app.listen(PORT, () => {
  console.log(`RC Game Load Checker running: http://localhost:${PORT}`);
});
