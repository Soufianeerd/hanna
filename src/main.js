/**
 * Point d'entrée principal de l'application Hanna Invitation
 *
 * Routes :
 * - /                 : Véritable expérience Hanna publique (Phase 2 : apparition + flottement)
 * - /?dev=motion      : Expérience avec panneau DEV d'animation (Replay, Stop, Start, Bounds)
 * - /?dev=calibration : Banc de calibration et d'audit géométrique (Phase 1.1)
 */

import { CalibrationController } from './calibration/calibration.js';
import { HannaExperience } from './experience/HannaExperience.js';

function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const urlParams = new URLSearchParams(window.location.search);
  const devParam = urlParams.get('dev');
  const isCalibration = devParam === 'calibration' || window.location.hash === '#calibration';
  const isDevMotion = devParam === 'motion' || devParam === 'experience';

  if (isCalibration) {
    // Mode calibration géométrique
    document.body.classList.add('calibration-mode');
    document.body.classList.remove('hanna-experience-active');
    new CalibrationController(app);
  } else {
    // Expérience Hanna publique (avec ou sans panneau DEV de motion)
    new HannaExperience(app, { isDevMotion });
  }
}

// Initialisation au chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
