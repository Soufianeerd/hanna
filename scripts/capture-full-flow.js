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
  console.log('Starting headless Chrome for Full Flow Visual Verification...');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--remote-debugging-port=9225',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  await sleep(1500);

  try {
    const newTargetRes = await fetch('http://127.0.0.1:9225/json/new?about:blank', { method: 'PUT' });
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

    // Attente de l'entrée et stabilisation en idle (~3.2s)
    await sleep(3400);
    const isInteractive = await cdp.eval('document.querySelector(".envelope-object-3d")?.classList.contains("is-interactive")');
    console.log('   Enveloppe en état IDLE (is-interactive:', isInteractive, ')');

    // 01_idle_float_top.png
    console.log('2. Capturing 01_idle_float_top.png...');
    await sleep(750);
    await cdp.screenshot('01_idle_float_top.png');

    // 02_idle_float_bottom.png
    console.log('3. Capturing 02_idle_float_bottom.png (demi-cycle plus tard)...');
    await sleep(1500);
    await cdp.screenshot('02_idle_float_bottom.png');

    // Clic pour déclencher la séquence
    console.log('4. Clicking envelope to trigger flip sequence...');
    await cdp.click('#envelope-object-3d');

    // 03_flip_90.png (stabilisation 140ms + mi-parcours du flip 1.35s / 2 = ~675ms -> total ~815ms)
    await sleep(815);
    console.log('5. Capturing 03_flip_90.png (tranche / trois-quarts)...');
    await cdp.screenshot('03_flip_90.png');

    // 04_back.png (flip complété à 180° avec sceau visible, pause contemplative 260ms)
    await sleep(700);
    console.log('6. Capturing 04_back.png (dos avec sceau)...');
    await cdp.screenshot('04_back.png');

    // 05_open.png (animation sceau + bascule immédiate vers enveloppe ouverte, 0 saut de corps)
    await sleep(650);
    console.log('7. Capturing 05_open.png (assemblée ouverte avec rabat vers le haut)...');
    await cdp.screenshot('05_open.png');

    // 06_extraction_mid.png (extraction continue P16-P20, ~1.4s plus tard)
    await sleep(1400);
    console.log('8. Capturing 06_extraction_mid.png (extraction continue P16-P20)...');
    await cdp.screenshot('06_extraction_mid.png');

    // 07_card_ready_html.png (attente fin extraction 1.45s + crossfade 220ms + stabilisation 400ms = 2100ms)
    await sleep(2100);
    console.log('9. Capturing 07_card_ready_html.png (carte HTML avec Bismillah, titre, date, adresse cliquable, RSVP intégré)...');
    await cdp.screenshot('07_card_ready_html.png');

    // Test de l'interaction RSVP : clic sur "Présent(e)"
    console.log('10. Selecting RSVP option: "Présent(e)"...');
    await cdp.click('.rsvp-choice-btn[data-choice="PRESENT"]');
    await sleep(200);

    // Clic sur "Valider ma réponse"
    console.log('11. Clicking "Valider ma réponse"...');
    await cdp.click('#rsvp-validate-btn');

    // Attente du départ de la carte interactive vers le haut et du message de confirmation
    await sleep(1500);
    const confirmationText = await cdp.eval('document.querySelector("#confirmation-text")?.innerText');
    console.log('   Confirmation message text:', confirmationText);
    await cdp.screenshot('09_confirmation.png');

    const storedRsvp = await cdp.eval('localStorage.getItem("hanna-rsvp")');
    console.log('   RSVP saved in localStorage via rsvpService:', storedRsvp);

    // Test Mobile 390x844
    console.log('\n--- Mobile 390x844 Verification ---');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    // Réinitialiser storage et recharger
    await cdp.eval('localStorage.removeItem("hanna-rsvp")');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(3400);
    console.log('   Mobile: clicking envelope...');
    await cdp.click('#envelope-object-3d');
    // Attente de l'ouverture et de la fin de l'extraction (~5.2s)
    await sleep(5500);

    // 08_rsvp_mobile.png
    console.log('12. Capturing 08_rsvp_mobile.png (Mobile 390x844 CARD_READY sans chevauchement)...');
    await cdp.screenshot('08_rsvp_mobile.png');

    console.log('\n✓ All screenshots captured successfully in .dev/captures !');
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
