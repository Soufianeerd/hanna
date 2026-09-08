import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CAPTURES_DIR = path.resolve('.dev/captures');
const FRAMES_DIR = path.resolve('.dev/video_frames');
if (!fs.existsSync(CAPTURES_DIR)) fs.mkdirSync(CAPTURES_DIR, { recursive: true });
if (fs.existsSync(FRAMES_DIR)) fs.rmSync(FRAMES_DIR, { recursive: true });
fs.mkdirSync(FRAMES_DIR, { recursive: true });

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
    return outPath;
  }

  async saveVideoFrame(frameNum, name) {
    const filename = `frame_${String(frameNum).padStart(4, '0')}_${name}.png`;
    const screenshot = await this.send('Page.captureScreenshot', { format: 'png', fromSurface: true });
    fs.writeFileSync(path.join(FRAMES_DIR, filename), Buffer.from(screenshot.data, 'base64'));
  }

  close() {
    this.ws.close();
  }
}

async function verifySurgicalFix() {
  console.log('=== VÉRIFICATION CHIRURGICALE ET ENREGISTREMENT FLUX COMPLET ===');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--remote-debugging-port=9230',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  let ready = false;
  for (let i = 0; i < 25; i++) {
    try {
      const v = await fetch('http://127.0.0.1:9230/json/version');
      if (v.ok) {
        ready = true;
        break;
      }
    } catch (_) {}
    await sleep(200);
  }

  if (!ready) {
    console.error('Impossible de démarrer Chrome');
    chrome.kill();
    return;
  }

  try {
    const targetRes = await fetch('http://127.0.0.1:9230/json/new?about:blank', { method: 'PUT' });
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

    let frame = 0;

    console.log('1. Navigation vers http://localhost:5173/ ...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    // Vérification du Start Gate
    const startGateVisible = await cdp.eval(`
      (() => {
        const gate = document.querySelector('#start-gate-overlay');
        if (!gate) return false;
        const style = window.getComputedStyle(gate);
        return style.display !== 'none' && parseFloat(style.opacity) > 0;
      })()
    `);
    console.log('   Start gate visible au démarrage:', startGateVisible);
    await cdp.saveVideoFrame(frame++, '01_start_gate');
    await sleep(200);
    await cdp.saveVideoFrame(frame++, '02_start_gate_pulse');

    // Tap sur Start Gate
    console.log('2. Tap sur Start Gate (« Toucher pour découvrir l’invitation »)...');
    await cdp.click('#start-gate-overlay');
    await sleep(150);
    await cdp.saveVideoFrame(frame++, '03_start_gate_fade');

    // Entrée de l'enveloppe
    console.log('3. Entrée de l\'enveloppe du bas vers le centre...');
    await sleep(500);
    await cdp.saveVideoFrame(frame++, '04_envelope_entering_25');
    await sleep(500);
    await cdp.saveVideoFrame(frame++, '05_envelope_entering_50');
    await sleep(500);
    await cdp.saveVideoFrame(frame++, '06_envelope_entering_75');
    await sleep(600);
    await cdp.saveVideoFrame(frame++, '07_envelope_settle');
    await sleep(600);
    await cdp.saveVideoFrame(frame++, '08_envelope_idle_center');

    // Floating idle
    console.log('4. Floating Idle permanent...');
    await sleep(1000);
    await cdp.saveVideoFrame(frame++, '09_idle_float_top');
    await sleep(1500);
    await cdp.saveVideoFrame(frame++, '10_idle_float_bottom');

    // Capture current_fixed_front.png
    await cdp.screenshot('current_fixed_front.png');

    // Vérification géométrie enveloppe
    const frontGeom = await cdp.eval(`
      (() => {
        const front = document.querySelector('#envelope-front-face');
        const obj3d = document.querySelector('#envelope-object-3d');
        const rFront = front.getBoundingClientRect();
        const rObj = obj3d.getBoundingClientRect();
        return {
          front: { width: rFront.width, height: rFront.height, left: rFront.left, top: rFront.top },
          obj3d: { width: rObj.width, height: rObj.height, left: rObj.left, top: rObj.top, styleMarginLeft: obj3d.style.marginLeft },
          transform: front.style.transform
        };
      })()
    `);
    console.log('   Géométrie enveloppe front:', JSON.stringify(frontGeom, null, 2));

    // Clic pour ouvrir
    console.log('5. Clic sur l\'enveloppe pour ouvrir...');
    await cdp.click('#envelope-object-3d');

    // Flip 180°
    await sleep(350);
    await cdp.saveVideoFrame(frame++, '11_flip_start');
    await sleep(500);
    await cdp.saveVideoFrame(frame++, '12_flip_90');
    await sleep(500);
    await cdp.saveVideoFrame(frame++, '13_flip_135');
    await sleep(500);
    await cdp.saveVideoFrame(frame++, '14_flip_180_seal');

    // Sceau et enveloppe ouverte
    await sleep(350);
    await cdp.saveVideoFrame(frame++, '15_seal_opening');
    await sleep(350);
    await cdp.saveVideoFrame(frame++, '16_open_envelope');

    // Test frame par frame extraction (0.40, 0.60, 0.75, 0.85, 0.92, 0.96, 1.00)
    console.log('6. Test frame par frame de la carte et mesure de dépassement sous l\'enveloppe...');
    const progressList = [0.40, 0.60, 0.75, 0.85, 0.92, 0.96, 1.00];

    for (const p of progressList) {
      const frameData = await cdp.eval(`
        (() => {
          const card = document.querySelector('#invitation-card-wrapper');
          const clippingLayer = document.querySelector('#card-clipping-layer');
          const openBg = document.querySelector('#open-envelope-background');
          const rCard = card.getBoundingClientRect();
          const rBg = openBg ? openBg.getBoundingClientRect() : null;

          const envelopeBottom = rBg ? rBg.bottom : 0;
          const cardBottom = rCard.bottom;
          const overflowBelow = cardBottom - envelopeBottom;

          return {
            cardRect: { top: rCard.top, bottom: rCard.bottom, height: rCard.height },
            envelopeBottom,
            overflowBelow,
            clipping: clippingLayer ? window.getComputedStyle(clippingLayer).clipPath : 'none',
            cardZIndex: card ? window.getComputedStyle(card).zIndex : '0'
          };
        })()
      `);

      const pStr = p.toFixed(2);
      console.log(`   [progress ${pStr}] cardBottom: ${frameData.cardRect.bottom.toFixed(1)}px, envelopeBottom: ${frameData.envelopeBottom.toFixed(1)}px, overflow: ${frameData.overflowBelow.toFixed(1)}px, clip: ${frameData.clipping}, z: ${frameData.cardZIndex}`);
      await cdp.screenshot(`extraction_progress_${pStr}.png`);
      await cdp.saveVideoFrame(frame++, `17_extraction_progress_${pStr}`);
      await sleep(400);
    }

    // Présentation finale continue & recul enveloppe
    console.log('7. Présentation finale continue & recul enveloppe...');
    await sleep(350);
    await cdp.saveVideoFrame(frame++, '18_presentation_start');
    await sleep(400);
    await cdp.saveVideoFrame(frame++, '19_presentation_mid');
    await sleep(600);
    await cdp.saveVideoFrame(frame++, '20_card_ready_fixed');
    await cdp.screenshot('current_card_ready_mobile.png');

    // Hotspot Styles
    const hotspotStyles = await cdp.eval(`
      (() => {
        const hs = document.querySelector('#card-address-hotspot');
        if (!hs) return null;
        const style = window.getComputedStyle(hs);
        return {
          background: style.backgroundColor,
          border: style.borderWidth + ' ' + style.borderColor,
          outline: style.outlineWidth,
          boxShadow: style.boxShadow,
          tapHighlight: style.webkitTapHighlightColor,
          pointerEvents: style.pointerEvents,
          href: hs.getAttribute('href'),
          ariaLabel: hs.getAttribute('aria-label'),
          target: hs.getAttribute('target')
        };
      })()
    `);
    console.log('   Styles Hotspot Adresse:', JSON.stringify(hotspotStyles, null, 2));

    // RSVP Options
    console.log('8. Sélection RSVP Présent(e)...');
    await cdp.click('.rsvp-btn-option[data-choice="PRESENT"]');
    await sleep(300);
    await cdp.saveVideoFrame(frame++, '21_rsvp_present_selected');
    await cdp.screenshot('current_rsvp_selected.png');

    // Validation
    console.log('9. Clic Valider...');
    await cdp.click('#rsvp-btn-submit');
    await sleep(400);
    await cdp.saveVideoFrame(frame++, '22_card_sending');
    await sleep(1000);
    await cdp.saveVideoFrame(frame++, '23_confirmation_final');

    console.log(`=== TEST TERMINÉ : ${frame} FRAMES CAPTURÉES ===`);
    cdp.close();

    // Assemblage de l'animation WebP vidéo
    console.log('10. Assemblage vidéo WebP...');
    execSync('python3 scripts/assemble-video.py', { stdio: 'inherit' });

  } catch (err) {
    console.error('Erreur lors du test:', err);
  } finally {
    chrome.kill();
  }
}

verifySurgicalFix();
