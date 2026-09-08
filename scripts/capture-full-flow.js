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

  async screenshot(filename) {
    const screenshot = await this.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true
    });
    const outPath = path.join(CAPTURES_DIR, filename);
    fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
    console.log(`  -> Saved ${filename} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
  }

  close() {
    this.ws.close();
  }
}

async function runFullFlowVerification() {
  console.log('Starting headless Chrome for Full Flow Verification...');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--remote-debugging-port=9224',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  await sleep(1500);

  try {
    const newTargetRes = await fetch('http://127.0.0.1:9224/json/new?about:blank', { method: 'PUT' });
    const target = await newTargetRes.json();
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 1440,
      height: 900,
      deviceScaleFactor: 1,
      mobile: false
    });

    console.log('1. Navigating to http://localhost:5173/ ...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });

    // Wait for entrance and idle floating (total 3.2s)
    await sleep(3200);
    const stateAtIdle = await cdp.eval('window.__STATE__ || document.querySelector(".envelope-object-3d")?.classList.contains("is-interactive")');
    console.log('   Envelope reached IDLE (is-interactive:', stateAtIdle, ')');
    await cdp.screenshot('01_idle.png');

    // Click envelope to trigger flip
    console.log('2. Clicking envelope to trigger 180° flip...');
    const clickResult = await cdp.click('#envelope-object-3d');
    console.log('   Click result:', clickResult);

    // Wait for flip to reach 180° (neutralize 0.18s + flip 0.85s = ~1.03s -> capture at 1.05s)
    await sleep(950);
    console.log('3. Capturing back closed with wax seal...');
    await cdp.screenshot('02_back_seal.png');

    // Wait for seal animation + open switch (pause 0.14s + seal 0.35s + switch 0.14s = 0.63s -> total 1.0s from back)
    await sleep(650);
    console.log('4. Capturing open envelope & pocket ready...');
    await cdp.screenshot('03_open_envelope.png');

    // Card extracting - mid pivot (P15/P16, ~0.45s into extraction)
    await sleep(450);
    console.log('5. Capturing card pivot mid-extraction...');
    await cdp.screenshot('04_card_pivot.png');

    // Card extracting - vertical rise (P20/P21, ~0.60s later)
    await sleep(600);
    console.log('6. Capturing card vertical rise...');
    await cdp.screenshot('05_card_rise.png');

    // Card reaching P26 center and CARD_READY (~0.85s later)
    await sleep(850);
    console.log('7. Capturing CARD_READY with RSVP panel & address hotspot...');
    await cdp.screenshot('06_card_ready.png');

    // Select "Présent(e)" option
    console.log('8. Selecting RSVP option: "Présent(e)"...');
    await cdp.click('.rsvp-opt-btn[data-choice="PRESENT"]');
    await sleep(200);
    await cdp.screenshot('07_rsvp_selected.png');

    // Click "Valider ma réponse"
    console.log('9. Clicking "Valider ma réponse"...');
    await cdp.click('#rsvp-submit');

    // Card taking momentum and sending upwards (anticipation 0.14s + 0.35s departure)
    await sleep(350);
    console.log('10. Capturing card departure upwards...');
    await cdp.screenshot('08_card_sending.png');

    // Confirmation message (departure completes 0.92s + delay 0.20s + fade 0.58s = ~1.3s)
    await sleep(1300);
    console.log('11. Capturing final confirmation message...');
    await cdp.screenshot('09_confirmation.png');

    // Check localStorage value
    const rsvpStorage = await cdp.eval('localStorage.getItem("hanna-rsvp")');
    console.log('   localStorage "hanna-rsvp":', rsvpStorage);

    // Test Mobile 390x844
    console.log('\n--- Mobile 390x844 Verification ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    // Clear storage and reload
    await cdp.eval('localStorage.removeItem("hanna-rsvp")');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(3200);
    await cdp.click('#envelope-object-3d');
    // Wait for flip + extraction to finish (~3.7s)
    await sleep(4000);
    console.log('12. Capturing Mobile 390x844 CARD_READY...');
    await cdp.screenshot('10_mobile_card_ready.png');

    console.log('\n✓ Full flow execution and captures completed successfully!');
    if (cdp.errors.length > 0) {
      console.warn('Console errors detected:', cdp.errors);
    } else {
      console.log('✓ 0 console errors detected throughout the entire flow!');
    }

    await cdp.send('Page.close');
    cdp.close();
  } finally {
    chrome.kill('SIGKILL');
  }
}

runFullFlowVerification().catch((err) => {
  console.error('Full flow test error:', err);
  process.exit(1);
});
