/**
 * Point d'entrée principal de l'application Hanna Invitation
 */

import { CalibrationController } from './calibration/calibration.js';

function initApp() {
  const app = document.getElementById('app');
  if (!app) return;

  const urlParams = new URLSearchParams(window.location.search);
  const isCalibration = urlParams.get('dev') === 'calibration' || window.location.hash === '#calibration';

  if (isCalibration) {
    // Lancement du mode calibration
    new CalibrationController(app);
  } else {
    // Vue d'attente / Présentation Phase 0 + 1
    renderHomeView(app);
  }
}

function renderHomeView(container) {
  container.innerHTML = `
    <main class="home-view">
      <div class="home-card">
        <span class="home-badge">PROJET HANNA — PHASE 0 + 1</span>
        <h1 class="home-title">Hanna Invitation</h1>
        <p class="home-subtitle">
          Audit technique des assets, système géométrique centralisé et banc de calibration interactif.
          Aucune animation publique n'est active avant validation géométrique complète.
        </p>
        <div>
          <a href="?dev=calibration" class="home-btn" id="open-calibration">
            <span>⚙ Ouvrir la Calibration</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </a>
        </div>
      </div>
    </main>
  `;
}

// Initialisation au chargement du DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
