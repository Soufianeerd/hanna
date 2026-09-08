import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const FRAMES_DIR = path.resolve('.dev/video_frames');
if (!fs.existsSync(FRAMES_DIR)) {
  fs.mkdirSync(FRAMES_DIR, { recursive: true });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class CDPClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.id = 1;
    this.pending = new Map();
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

  async screenshot(outPath) {
    const screenshot = await this.send('Page.captureScreenshot', {
      format: 'png',
      fromSurface: true
    });
    fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

async function record() {
  console.log('=== ENREGISTREMENT FLUX VIDÉO MOBILE COMPLET ===');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--remote-debugging-port=9234',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  let ready = false;
  for (let i = 0; i < 25; i++) {
    try {
      const v = await fetch('http://127.0.0.1:9234/json/version');
      if (v.ok) {
        ready = true;
        break;
      }
    } catch (_) {}
    await sleep(200);
  }

  if (!ready) {
    console.error('Chrome impossible à démarrer');
    chrome.kill();
    return;
  }

  try {
    const targetRes = await fetch('http://127.0.0.1:9234/json/new?about:blank', { method: 'PUT' });
    const target = await targetRes.json();
    const cdp = new CDPClient(target.webSocketDebuggerUrl);
    await cdp.connect();

    await cdp.send('Page.enable');
    await cdp.send('Runtime.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });

    console.log('1. Navigation vers http://localhost:5173/ ...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    let frameCount = 0;
    const saveFrame = async (name) => {
      const filename = `frame_${String(frameCount++).padStart(4, '0')}_${name}.png`;
      await cdp.screenshot(path.join(FRAMES_DIR, filename));
    };

    // 1. START GATE
    console.log('1. Start Gate...');
    await saveFrame('start_gate');
    await sleep(200);
    await saveFrame('start_gate_idle');

    // 2. TAP START GATE
    console.log('2. Tap Start Gate -> Lancement musique & entrée...');
    await cdp.click('#start-gate-overlay');
    await sleep(150);
    await saveFrame('start_gate_fade');

    // 3. ENTRÉE ENVELOPPE
    console.log('3. Entrée Enveloppe du bas vers le centre...');
    await sleep(400);
    await saveFrame('entrance_25');
    await sleep(500);
    await saveFrame('entrance_50');
    await sleep(500);
    await saveFrame('entrance_75');
    await sleep(600);
    await saveFrame('entrance_settle');
    await sleep(600);
    await saveFrame('idle_center');

    // 4. FLOATING IDLE
    console.log('4. Floating Idle permanent...');
    await sleep(1000);
    await saveFrame('idle_float_top');
    await sleep(1500);
    await saveFrame('idle_float_bottom');

    // 5. CLIC ENVELOPPE -> FLIP 180°
    console.log('5. Clic enveloppe -> Flip 180° lent...');
    await cdp.click('#envelope-object-3d');
    await sleep(350);
    await saveFrame('flip_start');
    await sleep(500);
    await saveFrame('flip_90');
    await sleep(500);
    await saveFrame('flip_135');
    await sleep(500);
    await saveFrame('flip_180_seal');

    // 6. SCEAU DISPARAÎT ET OUVERTURE
    console.log('6. Sceau & Enveloppe ouverte...');
    await sleep(400);
    await saveFrame('seal_opening');
    await sleep(400);
    await saveFrame('open_envelope');

    // 7. EXTRACTION CONTINUE SANS AUCUN DÉPASSEMENT EN BAS
    console.log('7. Extraction continue...');
    await sleep(500);
    await saveFrame('extraction_030');
    await sleep(500);
    await saveFrame('extraction_050');
    await sleep(500);
    await saveFrame('extraction_070');
    await sleep(500);
    await saveFrame('extraction_085');
    await sleep(400);
    await saveFrame('extraction_096_freed');
    await sleep(300);
    await saveFrame('extraction_100');

    // 8. PRÉSENTATION FINALE
    console.log('8. Présentation finale continue & recul enveloppe...');
    await sleep(350);
    await saveFrame('presentation_start');
    await sleep(400);
    await saveFrame('presentation_mid');
    await sleep(500);
    await saveFrame('card_ready_fixed');

    // 9. RSVP APPARAÎT
    console.log('9. RSVP apparaît...');
    await sleep(600);
    await saveFrame('rsvp_visible');

    // 10. INTERACTION RSVP : PRÉSENT(E)
    console.log('10. Sélection RSVP Présent(e)...');
    await cdp.click('.rsvp-btn-option[data-choice="PRESENT"]');
    await sleep(400);
    await saveFrame('rsvp_present_selected');

    // 11. VALIDATION
    console.log('11. Clic Valider...');
    await cdp.click('#rsvp-btn-submit');
    await sleep(400);
    await saveFrame('card_sending');
    await sleep(1000);
    await saveFrame('confirmation_final');

    console.log(`Enregistrement réussi : ${frameCount} frames.`);
    cdp.close();
  } catch (err) {
    console.error('Erreur:', err);
  } finally {
    chrome.kill();
  }
}

record();
