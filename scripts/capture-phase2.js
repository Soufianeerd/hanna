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

    this.ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
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

  close() {
    this.ws.close();
  }
}

async function captureScene() {
  console.log('Starting headless Chrome for captures...');
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-first-run',
    '--no-default-browser-check'
  ]);

  await sleep(1500);

  try {
    // 1. Desktop before entry (t = 50ms)
    console.log('Capturing: desktop_before_entry.png...');
    await takeScreenshot({
      width: 1440,
      height: 900,
      url: 'http://localhost:5173/',
      waitMs: 60,
      filename: 'desktop_before_entry.png'
    });

    // 2. Desktop mid-entry (t = 700ms)
    console.log('Capturing: desktop_entry_mid.png...');
    await takeScreenshot({
      width: 1440,
      height: 900,
      url: 'http://localhost:5173/',
      waitMs: 700,
      filename: 'desktop_entry_mid.png'
    });

    // 3. Desktop idle (t = 3200ms)
    console.log('Capturing: desktop_idle.png...');
    await takeScreenshot({
      width: 1440,
      height: 900,
      url: 'http://localhost:5173/',
      waitMs: 3200,
      filename: 'desktop_idle.png'
    });

    // 4. Mobile idle 390x844 (t = 3200ms)
    console.log('Capturing: mobile_idle_390x844.png...');
    await takeScreenshot({
      width: 390,
      height: 844,
      mobile: true,
      deviceScaleFactor: 2,
      url: 'http://localhost:5173/',
      waitMs: 3200,
      filename: 'mobile_idle_390x844.png'
    });

    // 5. Dev motion view
    console.log('Capturing: dev_motion_view.png...');
    await takeScreenshot({
      width: 1440,
      height: 900,
      url: 'http://localhost:5173/?dev=motion',
      waitMs: 3200,
      filename: 'dev_motion_view.png'
    });

    // 6. Calibration check
    console.log('Capturing: dev_calibration_view.png...');
    await takeScreenshot({
      width: 1440,
      height: 900,
      url: 'http://localhost:5173/?dev=calibration',
      waitMs: 1500,
      filename: 'dev_calibration_view.png'
    });

    console.log('✓ All captures generated successfully!');
  } finally {
    chrome.kill('SIGKILL');
  }
}

async function takeScreenshot({ width, height, mobile = false, deviceScaleFactor = 1, url, waitMs, filename }) {
  const newTargetRes = await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' });
  const target = await newTargetRes.json();
  const cdp = new CDPClient(target.webSocketDebuggerUrl);
  await cdp.connect();

  await cdp.send('Page.enable');
  await cdp.send('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor,
    mobile
  });

  await cdp.send('Page.navigate', { url });
  await sleep(waitMs);

  const screenshot = await cdp.send('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true
  });

  const outPath = path.join(CAPTURES_DIR, filename);
  fs.writeFileSync(outPath, Buffer.from(screenshot.data, 'base64'));
  console.log(`  -> Saved ${filename} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);

  await cdp.send('Page.close');
  cdp.close();
}

captureScene().catch((err) => {
  console.error('Capture error:', err);
  process.exit(1);
});
