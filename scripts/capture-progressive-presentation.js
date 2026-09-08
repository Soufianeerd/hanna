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

async function runProgressivePresentationCaptures() {
  console.log('=== CAPTURES DE PRÉSENTATION PROGRESSIVE CONTINUE ===');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--remote-debugging-port=9228',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  let ready = false;
  for (let i = 0; i < 25; i++) {
    try {
      const v = await fetch('http://127.0.0.1:9228/json/version');
      if (v.ok) {
        ready = true;
        break;
      }
    } catch (_) {}
    await sleep(300);
  }
  if (!ready) throw new Error('Chrome did not start on port 9228');

  try {
    const newTargetRes = await fetch('http://127.0.0.1:9228/json/new?about:blank', { method: 'PUT' });
    const target = await newTargetRes.json();
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');

    // Émulation iPhone 390x844
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    console.log('1. Chargement iPhone 390x844 (?code=HN-A7K3Q9M2P8ZX)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/?code=HN-A7K3Q9M2P8ZX' });

    // Attente stabilisation idle (3.5s)
    await sleep(3500);

    console.log('2. Clic sur enveloppe pour déclencher l\'ouverture...');
    await cdp.eval(`
      (() => {
        if (window.__hanna) {
          window.__hanna.handleOpenRequest();
        } else {
          const el = document.querySelector('#envelope-object-3d');
          if (el) el.click();
        }
      })()
    `);

    // 1. Déroulement Flip + Open (2.68s) + Extraction 70% (2.10s) = 4.8s
    await sleep(4800);
    console.log('3. Capture 01_extraction_70.png...');
    await cdp.screenshot('01_extraction_70.png');

    // 2. Extraction 90% (+0.60s)
    await sleep(600);
    console.log('4. Capture 02_extraction_90.png...');
    await cdp.screenshot('02_extraction_90.png');

    // 3. Fin extraction (3.0s total) -> Présentation 25% (+0.55s)
    await sleep(550);
    console.log('5. Capture 03_presentation_25.png...');
    await cdp.screenshot('03_presentation_25.png');

    // 4. Présentation 50% (+0.26s)
    await sleep(260);
    console.log('6. Capture 04_presentation_50.png...');
    await cdp.screenshot('04_presentation_50.png');

    // 5. Présentation 75% (+0.26s)
    await sleep(260);
    console.log('7. Capture 05_presentation_75.png...');
    await cdp.screenshot('05_presentation_75.png');

    // 6. Fin présentation (1.05s) -> CARD_READY et RSVP (+0.55s)
    await sleep(550);
    console.log('8. Capture 06_card_ready_390x844.png...');
    await cdp.screenshot('06_card_ready_390x844.png');

    // 7. Clic sur Présent(e)
    console.log('9. Clic sur Présent(e)...');
    await cdp.click('.rsvp-btn-option[data-choice="PRESENT"]');
    await sleep(300);

    console.log('10. Capture 07_rsvp_selected.png...');
    await cdp.screenshot('07_rsvp_selected.png');

    // Mesure de validation sur la carte et le RSVP dans la fenêtre visible
    const metrics = await cdp.eval(`
      (() => {
        const card = document.querySelector('#invitation-card-wrapper');
        const rsvp = document.querySelector('#card-rsvp-overlay');
        const title = document.querySelector('.rsvp-overlay-title');
        const btnOpt = document.querySelector('.rsvp-btn-option');
        const submit = document.querySelector('#rsvp-btn-submit');
        
        const cardRect = card ? card.getBoundingClientRect() : null;
        const rsvpRect = rsvp ? rsvp.getBoundingClientRect() : null;
        
        const titleFontSize = title ? window.getComputedStyle(title).fontSize : '';
        const btnFontSize = btnOpt ? window.getComputedStyle(btnOpt).fontSize : '';
        const submitFontSize = submit ? window.getComputedStyle(submit).fontSize : '';
        
        return {
          viewport: { width: window.innerWidth, height: window.innerHeight },
          cardRect: cardRect ? { left: cardRect.left, top: cardRect.top, width: cardRect.width, height: cardRect.height, bottom: cardRect.bottom } : null,
          rsvpRect: rsvpRect ? { left: rsvpRect.left, top: rsvpRect.top, width: rsvpRect.width, height: rsvpRect.height, bottom: rsvpRect.bottom } : null,
          fontSizes: { title: titleFontSize, button: btnFontSize, submit: submitFontSize },
          isCardFullyVisible: cardRect ? (cardRect.top >= 0 && cardRect.bottom <= window.innerHeight) : false,
          isRsvpFullyVisible: rsvpRect ? (rsvpRect.top >= 0 && rsvpRect.bottom <= window.innerHeight) : false
        };
      })()
    `);

    console.log('\n--- Mesures réelles de validation iPhone 390x844 ---');
    console.log('Carte visible à 100% sans rognage :', metrics.isCardFullyVisible);
    console.log('RSVP visible à 100% dans l\'écran :', metrics.isRsvpFullyVisible);
    console.log('Dimensions carte :', metrics.cardRect);
    console.log('Dimensions RSVP :', metrics.rsvpRect);
    console.log('Font sizes calculées :', metrics.fontSizes);

    // Test supplémentaire sur iPhone 430x932
    console.log('\n11. Test iPhone 430x932 (Pro Max)...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 430,
      height: 932,
      deviceScaleFactor: 3,
      mobile: true
    });
    await sleep(400);

    const metrics430 = await cdp.eval(`
      (() => {
        const card = document.querySelector('#invitation-card-wrapper');
        const rsvp = document.querySelector('#card-rsvp-overlay');
        const cardRect = card ? card.getBoundingClientRect() : null;
        const rsvpRect = rsvp ? rsvp.getBoundingClientRect() : null;
        return {
          isCardFullyVisible: cardRect ? (cardRect.top >= 0 && cardRect.bottom <= window.innerHeight) : false,
          isRsvpFullyVisible: rsvpRect ? (rsvpRect.top >= 0 && rsvpRect.bottom <= window.innerHeight) : false,
          cardRect: cardRect ? { width: cardRect.width, height: cardRect.height } : null
        };
      })()
    `);
    console.log('iPhone 430x932 - Carte visible :', metrics430.isCardFullyVisible);
    console.log('iPhone 430x932 - RSVP visible :', metrics430.isRsvpFullyVisible);
    console.log('iPhone 430x932 - Dimensions :', metrics430.cardRect);

    await cdp.send('Page.close');
    cdp.close();
    console.log('\n✓ Toutes les captures et validations ont été exécutées avec succès !');
  } finally {
    chrome.kill('SIGKILL');
  }
}

runProgressivePresentationCaptures().catch((err) => {
  console.error('Erreur captures présentation progressive:', err);
  process.exit(1);
});
