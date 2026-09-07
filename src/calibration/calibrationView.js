/**
 * Vue HTML et composants de rendu pour le mode Calibration (Phase 1.1)
 */

export function createCalibrationLayout() {
  return `
    <div class="calibration-app">
      <!-- Header -->
      <header class="calib-header">
        <div class="calib-brand">
          <span class="calib-logo">HANNA</span>
          <span class="calib-badge">CALIBRATION V1.1 — VERROUILLAGE GÉOMÉTRIQUE</span>
        </div>

        <nav class="calib-tabs" id="calib-tabs">
          <button class="calib-tab active" data-tab="frontBackMatch">F. FRONT / BACK MATCH</button>
          <button class="calib-tab" data-tab="closedFront">A. CLOSED FRONT</button>
          <button class="calib-tab" data-tab="closedBack">B. CLOSED BACK</button>
          <button class="calib-tab" data-tab="openReference">C. OPEN REFERENCE</button>
          <button class="calib-tab" data-tab="cardPocket">D. CARD + POCKET</button>
          <button class="calib-tab" data-tab="individualAssets">E. INDIVIDUAL ASSETS</button>
        </nav>

        <div class="calib-header-actions">
          <button class="action-btn active" id="btn-toggle-grid" title="Basculer la grille">
            <span>Grid</span>
          </button>
          <button class="action-btn active" id="btn-toggle-axes" title="Basculer les axes centraux">
            <span>Axes</span>
          </button>
          <button class="action-btn active" id="btn-toggle-bbox" title="Basculer Bounding Box">
            <span>BBox</span>
          </button>
          <button class="action-btn active" id="btn-toggle-alpha" title="Basculer Alpha Bounds">
            <span>Alpha</span>
          </button>
          <button class="action-btn primary" id="btn-copy-json" title="Copier la géométrie verrouillée en JSON">
            <span>📋 Copy JSON</span>
          </button>
          <button class="action-btn" id="btn-reset-geom" title="Réinitialiser les valeurs physiques">
            <span>↺ Reset</span>
          </button>
        </div>
      </header>

      <!-- Corps : Stage Viewport + Sidebar -->
      <main class="calib-body">
        <div class="calib-viewport" id="calib-viewport">
          <div class="stage-wrapper" id="stage-wrapper">
            <div class="logical-stage" id="logical-stage">
              <!-- Grille technique -->
              <div class="stage-grid" id="stage-grid"></div>

              <!-- Axes X / Y (centrés en 0, 0) -->
              <div class="stage-axes" id="stage-axes">
                <div class="axis-x"></div>
                <div class="axis-y"></div>
                <span class="axis-origin-label">(0, 0)</span>
              </div>

              <!-- Contour de la PHYSICAL ENVELOPE (820 × 490) -->
              <div class="physical-envelope-outline" id="physical-envelope-outline">
                <span class="physical-box-tag">PHYSICAL BOUNDS : 820 × 490 px</span>
              </div>

              <!-- Conteneur des calques actifs -->
              <div class="stage-content" id="stage-content"></div>
            </div>
          </div>

          <!-- HUD Coordonnées sous le curseur -->
          <div class="coord-hud" id="coord-hud">
            <span>Stage: 1600 × 1000</span>
            <span id="mouse-coords">X: 0px | Y: 0px</span>
            <span id="stage-scale-info">Scale: 100%</span>
            <span id="match-status" style="color: var(--accent-emerald); font-weight: 600;">Match: 0.00px diff</span>
          </div>
        </div>

        <!-- Sidebar des contrôles -->
        <aside class="calib-sidebar" id="calib-sidebar">
          <!-- Panneau dynamique selon l'onglet -->
        </aside>
      </main>
    </div>
  `;
}
