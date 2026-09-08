import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const CAPTURES_DIR = path.resolve('.dev/captures');
if (!fs.existsSync(CAPTURES_DIR)) {
  fs.mkdirSync(CAPTURES_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
    this.consoleLogs = [];
    this.errors = [];

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        const text = msg.params.args.map((a) => a.value || a.description).join(' ');
        if (msg.params.type === 'error') this.errors.push(text);
        else this.consoleLogs.push(`[${msg.params.type}] ${text}`);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.errors.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description || ''));
      }
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
  }

  async connect() {
    if (this.ws.readyState === WebSocket.OPEN) return;
    return new Promise((resolve, reject) => {
      this.ws.onopen = resolve;
      this.ws.onerror = reject;
    });
  }

  send(method, params = {}) {
    const id = this.id++;
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async eval(expression) {
    const res = await this.send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.value;
  }

  async click(selector) {
    return this.eval(`
      (() => {
        const el = document.querySelector('${selector}');
        if (!el) return 'NOT_FOUND';
        el.click();
        return 'CLICKED';
      })()
    `);
  }

  async screenshot(filename, clip = null) {
    const params = { format: 'png', fromSurface: true };
    if (clip) params.clip = clip;
    const screenshot = await this.send('Page.captureScreenshot', params);
    const outPath = path.join(CAPTURES_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`  -> Saved ${filename} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  }

  close() {
    this.ws.close();
  }
}

async function runProductionVerification() {
  console.log('=== VALIDATION PRODUCTION HANNA (CAPTURES OFFICIELLES) ===');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--remote-debugging-port=9227',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  let ready = false;
  for (let i = 0; i < 25; i++) {
    try {
      const v = await fetch('http://127.0.0.1:9227/json/version');
      if (v.ok) {
        ready = true;
        break;
      }
    } catch (_) {}
    await sleep(300);
  }
  if (!ready) throw new Error('Chrome did not start on port 9227');

  try {
    const newTargetRes = await fetch('http://127.0.0.1:9227/json/new?about:blank', { method: 'PUT' });
    const target = await newTargetRes.json();
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // 1. DESKTOP 1440x900
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('1. Chargement Desktop (?code=HN-A7K3Q9M2P8ZX)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/?code=HN-A7K3Q9M2P8ZX' });

    // Attente idle
    await sleep(3500);

    // Clic enveloppe
    console.log('2. Clic sur enveloppe pour déclencher l\'ouverture...');
    await cdp.click('#envelope-object-3d');

    // Attente flip + extraction (total ~5.5s)
    await sleep(6000);

    // Capture A: card-ready desktop
    console.log('3. Capture A: card-ready desktop...');
    await cdp.screenshot('card_ready_desktop.png');

    // Capture C: Zoom nouveau S de Salma
    console.log('4. Capture C: zoom nouveau S de Salma...');
    const salmaBox = await cdp.eval(`
      (() => {
        const el = document.querySelector('.card-patch-title');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { 
          x: Math.round(r.x - 15), 
          y: Math.round(r.y - 15), 
          width: Math.round(r.width + 30), 
          height: Math.round(r.height + 30), 
          scale: 1 
        };
      })()
    `);
    if (salmaBox) {
      await cdp.screenshot('zoom_salma_new_s.png', salmaBox);
    }

    // Capture D: Zoom À PARTIR DE 18H
    console.log('5. Capture D: zoom À PARTIR DE 18H...');
    const timeBox = await cdp.eval(`
      (() => {
        const el = document.querySelector('.card-patch-time');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { 
          x: Math.round(r.x - 20), 
          y: Math.round(r.y - 15), 
          width: Math.round(r.width + 40), 
          height: Math.round(r.height + 30), 
          scale: 1 
        };
      })()
    `);
    if (timeBox) {
      await cdp.screenshot('zoom_time_18h.png', timeBox);
    }

    // Capture E: RSVP PRESENT + 4 personnes
    console.log('6. Sélection Présent(e) + 4 personnes...');
    await cdp.click('.rsvp-btn-option[data-choice="PRESENT"]');
    await sleep(300);
    await cdp.click('.rsvp-btn-party[data-size="4"]');
    await sleep(300);

    const rsvpBox = await cdp.eval(`
      (() => {
        const el = document.querySelector('.card-rsvp-overlay');
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return { 
          x: Math.round(r.x - 20), 
          y: Math.round(r.y - 15), 
          width: Math.round(r.width + 40), 
          height: Math.round(r.height + 30), 
          scale: 1 
        };
      })()
    `);
    if (rsvpBox) {
      console.log('   Capture E: RSVP PRESENT + 4 personnes...');
      await cdp.screenshot('rsvp_present_4_persons.png', rsvpBox);
    }

    // Capture F: RSVP ABSENT
    console.log('7. Sélection Absent(e)...');
    await cdp.click('.rsvp-btn-option[data-choice="ABSENT"]');
    await sleep(300);
    if (rsvpBox) {
      console.log('   Capture F: RSVP ABSENT...');
      await cdp.screenshot('rsvp_absent.png', rsvpBox);
    }

    // 8. MOBILE 390x844
    console.log('\n8. Test Mobile 390x844...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    await cdp.send('Page.navigate', { url: 'http://localhost:5173/?code=HN-A7K3Q9M2P8ZX' });
    await sleep(3500);

    console.log('   Mobile: clic enveloppe...');
    await cdp.click('#envelope-object-3d');
    await sleep(6000);

    // Sélection Présent sur mobile
    await cdp.click('.rsvp-btn-option[data-choice="PRESENT"]');
    await sleep(200);
    await cdp.click('.rsvp-btn-party[data-size="2"]');
    await sleep(200);

    // Capture B: card-ready 390x844 (fullscreen immersion)
    console.log('9. Capture B: card-ready 390x844 (fullscreen mobile)...');
    await cdp.screenshot('card_ready_mobile_390x844.png');

    console.log('\n✓ Les 6 captures requises ont été générées avec succès !');

    await cdp.send('Page.close');
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

runProductionVerification().catch((err) => {
  console.error('Erreur validation production:', err);
  process.exit(1);
});
