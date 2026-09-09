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
  console.log('=== VÉRIFICATION FINALE UX MOBILE PLEIN ÉCRAN + AUDIO LOOP + ITINÉRAIRE + RSVP ===');
  const profileDir = `/tmp/chrome-test-profile-${Date.now()}`;
  fs.mkdirSync(profileDir, { recursive: true });

  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9231',
    `--user-data-dir=${profileDir}`,
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  let ready = false;
  for (let i = 0; i < 40; i++) {
    try {
      const v = await fetch('http://127.0.0.1:9231/json/version');
      if (v.ok) {
        ready = true;
        break;
      }
    } catch (_) {}
    await sleep(250);
  }

  if (!ready) {
    console.error('Impossible de démarrer Chrome');
    chrome.kill();
    return;
  }

  try {
    const targetRes = await fetch('http://127.0.0.1:9231/json/new?about:blank', { method: 'PUT' });
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

    console.log('1. Navigation vers http://localhost:5173/ (TEST SANS CODE / MODE DÉMO)...');
    await cdp.send('Page.navigate', { url: 'http://localhost:5173/' });
    await sleep(1500);

    // 01_start_gate.png
    console.log('   Capture 01_start_gate.png...');
    await cdp.screenshot('01_start_gate.png');
    await cdp.saveVideoFrame(frame++, '01_start_gate');

    // Tap sur Start Gate
    console.log('2. Tap sur Start Gate (« Toucher pour découvrir l’invitation »)...');
    await cdp.click('#start-gate-overlay');
    await sleep(150);
    await cdp.saveVideoFrame(frame++, '02_start_gate_fade');

    // 02_envelope_enter_mid.png (pendant l'ascension lente 2.10s)
    await sleep(1000); // ~1.0s dans la course de 2.10s
    console.log('   Capture 02_envelope_enter_mid.png...');
    await cdp.screenshot('02_envelope_enter_mid.png');
    await cdp.saveVideoFrame(frame++, '03_envelope_enter_mid');

    // Fin d'ascension et settle
    await sleep(1200);
    await cdp.saveVideoFrame(frame++, '04_envelope_settle');
    await sleep(400);

    // Floating Idle permanent
    console.log('3. Floating Idle permanent...');
    await sleep(600);
    await cdp.saveVideoFrame(frame++, '05_idle_float');
    await sleep(600);
    await cdp.saveVideoFrame(frame++, '06_idle_float');

    // Clic pour ouvrir
    console.log('4. Clic sur l\'enveloppe pour ouvrir...');
    await cdp.click('#envelope-object-3d');

    // Flip 180° et ouverture du sceau
    while (true) {
      const state = await cdp.eval('(window.__hanna || window.__hannaExperience)?.stateManager?.getState()');
      if (state === 'CARD_EXTRACTING') break;
      await sleep(100);
      if (frame < 12) await cdp.saveVideoFrame(frame++, 'flip_and_open');
    }

    // Extraction continue de la carte (3.0s)
    console.log('5. Extraction continue de la carte...');
    while (true) {
      const state = await cdp.eval('(window.__hanna || window.__hannaExperience)?.stateManager?.getState()');
      if (state === 'CARD_PRESENTING') break;
      await sleep(250);
      await cdp.saveVideoFrame(frame++, 'extracting');
    }

    // 03_card_presentation_50.png (à ~50% de la transition 1.20s vers plein écran)
    console.log('6. Transition continue vers page plein écran (1.20s)...');
    await sleep(600); // ~50% de la présentation (1.20s)
    console.log('   Capture 03_card_presentation_50.png...');
    await cdp.screenshot('03_card_presentation_50.png');
    await cdp.saveVideoFrame(frame++, '13_card_presentation_50');

    // Attente de l'état CARD_READY
    while (true) {
      const state = await cdp.eval('(window.__hanna || window.__hannaExperience)?.stateManager?.getState()');
      if (state === 'CARD_READY') break;
      await sleep(100);
    }
    await sleep(400); // Stabilisation finale
    await cdp.saveVideoFrame(frame++, '14_card_ready_top');

    // Vérification géométrie CARD_READY (hauteur plein écran sans grand vide)
    const cardGeom = await cdp.eval(`
      (() => {
        const card = document.querySelector('#invitation-card-wrapper');
        const rect = card ? card.getBoundingClientRect() : null;
        return {
          width: rect ? Math.round(rect.width) : 0,
          height: rect ? Math.round(rect.height) : 0,
          top: rect ? Math.round(rect.top) : 0,
          left: rect ? Math.round(rect.left) : 0,
          windowHeight: window.innerHeight,
          windowWidth: window.innerWidth
        };
      })()
    `);
    console.log('   Géométrie carte à CARD_READY :', JSON.stringify(cardGeom));
    const cardOccupiesFullHeight = cardGeom.height >= cardGeom.windowHeight * 0.98;
    console.log(`   La carte occupe la quasi-totalité de la hauteur (${cardGeom.height}px / ${cardGeom.windowHeight}px) : ${cardOccupiesFullHeight ? 'OUI' : 'NON'}`);

    // 04_fullscreen_mobile_top.png (vue haute de la page plein écran avec motifs, Bismillah, Salma...)
    console.log('   Capture 04_fullscreen_mobile_top.png...');
    await cdp.screenshot('04_fullscreen_mobile_top.png');

    // Scroll vers le bas si la page est plus haute que le visual viewport
    console.log('   Vérification scroll et capture 05_fullscreen_mobile_bottom.png...');
    await cdp.eval(`
      (() => {
        const page = document.querySelector('#invitation-fullscreen-page');
        if (page && page.scrollHeight > page.clientHeight) {
          page.scrollTop = page.scrollHeight - page.clientHeight;
        }
      })()
    `);
    await sleep(200);
    await cdp.screenshot('05_fullscreen_mobile_bottom.png');
    await cdp.saveVideoFrame(frame++, '15_fullscreen_mobile_bottom');

    // Scroll back to top
    await cdp.eval(`
      (() => {
        const page = document.querySelector('#invitation-fullscreen-page');
        if (page) page.scrollTop = 0;
      })()
    `);
    await sleep(150);

    // 06_route_button.png (zoom sur les actions : Itinéraire · Ajouter au calendrier)
    console.log('   Capture 06_route_button.png (Itinéraire · Ajouter au calendrier)...');
    const actionsRect = await cdp.eval(`
      (() => {
        const row = document.querySelector('#card-actions-row') || document.querySelector('#card-route-button');
        if (!row) return null;
        const r = row.getBoundingClientRect();
        return {
          x: Math.max(0, r.left - 20),
          y: Math.max(0, r.top - 20),
          width: r.width + 40,
          height: r.height + 40,
          scale: 1
        };
      })()
    `);
    if (actionsRect) {
      await cdp.screenshot('06_route_button.png', actionsRect);
    } else {
      await cdp.screenshot('06_route_button.png');
    }

    // Test du clic "Ajouter au calendrier"
    console.log('   Test du clic sur « Ajouter au calendrier »...');
    const calendarResult = await cdp.eval(`
      (() => {
        let downloadTriggered = false;
        const origCreate = URL.createObjectURL;
        URL.createObjectURL = (blob) => {
          downloadTriggered = true;
          return origCreate(blob);
        };
        const btn = document.querySelector('#card-calendar-button');
        if (btn) btn.click();
        URL.createObjectURL = origCreate;
        return { downloadTriggered };
      })()
    `);
    console.log('   Téléchargement calendrier .ics déclenché :', JSON.stringify(calendarResult));

    // Vérification des champs et placeholders
    const formCheck = await cdp.eval(`
      (() => {
        const fn = document.querySelector('#guest-first-name');
        const em = document.querySelector('#guest-email');
        const presentBtn = document.querySelector('.rsvp-btn-option[data-choice="PRESENT"]');
        const absentBtn = document.querySelector('.rsvp-btn-option[data-choice="ABSENT"]');
        return {
          fnPlaceholder: fn?.placeholder,
          emPlaceholder: em?.placeholder,
          presentSelectedDefault: presentBtn?.classList.contains('is-selected'),
          absentSelectedDefault: absentBtn?.classList.contains('is-selected')
        };
      })()
    `);
    console.log('   Formulaire check :', JSON.stringify(formCheck));

    // TEST CLAVIER VIRTUEL IPHONE (simulation resize visualViewport 844 -> 500)
    console.log('   Test apparition clavier virtuel iOS (hauteur 844 -> 500px)...');
    await cdp.eval(`
      (() => {
        const fn = document.querySelector('#guest-first-name');
        if (fn) fn.focus();
      })()
    `);
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 500,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(350);

    // Vérifier que la géométrie de la carte N'A PAS BOUGÉ
    const cardGeomDuringKeyboard = await cdp.eval(`
      (() => {
        const card = document.querySelector('#invitation-card-wrapper');
        const rect = card ? card.getBoundingClientRect() : null;
        return {
          width: rect ? Math.round(rect.width) : 0,
          height: rect ? Math.round(rect.height) : 0,
          top: rect ? Math.round(rect.top) : 0,
          left: rect ? Math.round(rect.left) : 0
        };
      })()
    `);
    console.log('   Géométrie carte pendant clavier ouvert :', JSON.stringify(cardGeomDuringKeyboard));
    const keyboardSafe = (cardGeomDuringKeyboard.width === cardGeom.width && cardGeomDuringKeyboard.height === cardGeom.height);
    console.log(`   Géométrie carte strictement figée pendant le clavier : ${keyboardSafe ? 'OUI (PARFAIT)' : 'NON (ÉCHEC)'}`);

    // Fermeture du clavier (retour 844px)
    console.log('   Fermeture clavier virtuel iOS (retour 844px)...');
    await cdp.send('Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      mobile: true
    });
    await sleep(200);

    // Saisie de Prénom et E-mail
    console.log('   Saisie de Prénom (Sarah) et E-mail (sarah.martin@example.com)...');
    await cdp.eval(`
      (() => {
        const fn = document.querySelector('#guest-first-name');
        const em = document.querySelector('#guest-email');
        if (fn) fn.value = 'Sarah';
        if (em) em.value = 'sarah.martin@example.com';
      })()
    `);
    await sleep(200);

    // 07_present_selected.png
    console.log('7. Clic sur Présent(e)...');
    await cdp.click('.rsvp-btn-option[data-choice="PRESENT"]');
    await sleep(300);

    // Vérifier le style du bouton sélectionné
    const presentCheck = await cdp.eval(`
      (() => {
        const btn = document.querySelector('.rsvp-btn-option[data-choice="PRESENT"]');
        const absent = document.querySelector('.rsvp-btn-option[data-choice="ABSENT"]');
        const s = window.getComputedStyle(btn);
        return {
          presentSelected: btn.classList.contains('is-selected'),
          absentSelected: absent.classList.contains('is-selected'),
          borderWidth: s.borderWidth,
          borderColor: s.borderColor,
          fontWeight: s.fontWeight,
          hasCheckmark: btn.textContent.includes('✓') || btn.textContent.includes('Validé')
        };
      })()
    `);
    console.log('   État Présent sélectionné :', JSON.stringify(presentCheck));

    console.log('   Capture 07_present_selected.png...');
    await cdp.screenshot('07_present_selected.png');
    await cdp.saveVideoFrame(frame++, '16_present_selected');

    // 8. Clic Valider
    console.log('8. Clic sur Valider...');
    await cdp.click('#rsvp-btn-submit');

    // Attente de l'état COMPLETED
    while (true) {
      const state = await cdp.eval('(window.__hanna || window.__hannaExperience)?.stateManager?.getState()');
      if (state === 'CARD_SENDING' || state === 'COMPLETED') {
        await cdp.saveVideoFrame(frame++, 'sending_or_completed');
      }
      if (state === 'COMPLETED') break;
      await sleep(150);
    }
    await sleep(500);

    // 08_confirmation.png (message final sur fond ivoire)
    console.log('   Capture 08_confirmation.png...');
    await cdp.screenshot('08_confirmation.png');
    await cdp.saveVideoFrame(frame++, '20_confirmation_final');

    console.log(`=== TEST TERMINÉ : ${frame} FRAMES CAPTURÉES ===`);

    // Copie des 8 screenshots vers le répertoire des artifacts
    const ARTIFACTS_DIR = '/Users/soufianeelrhadi/.gemini/antigravity-ide/brain/3bae6ad7-9a2b-4846-a85a-ca9f89474d53';
    const screenshotNames = [
      '01_start_gate.png',
      '02_envelope_enter_mid.png',
      '03_card_presentation_50.png',
      '04_fullscreen_mobile_top.png',
      '05_fullscreen_mobile_bottom.png',
      '06_route_button.png',
      '07_present_selected.png',
      '08_confirmation.png'
    ];

    for (const sName of screenshotNames) {
      const src = path.join(CAPTURES_DIR, sName);
      const dst = path.join(ARTIFACTS_DIR, sName);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, dst);
        console.log(`   Copié vers artifact : ${sName}`);
      }
    }

    cdp.close();

    // Assemblage vidéo WebP
    console.log('9. Assemblage vidéo WebP...');
    execSync('python3 scripts/assemble-video.py', { stdio: 'inherit' });

  } catch (err) {
    console.error('Erreur lors du test:', err);
  } finally {
    chrome.kill();
  }
}

verifySurgicalFix();
