/**
 * Contrôleur de Calibration et Banc de Mesure Géométrique — Phase 1.1
 */

import { ASSETS } from '../config/assets.js';
import { GEOMETRY, PDF_CARD_POSES, PHYSICAL_ENVELOPE, STAGE_CONFIG } from '../config/geometry.js';
import { createCalibrationLayout } from './calibrationView.js';

export class CalibrationController {
  constructor(container) {
    this.container = container;
    this.currentTab = 'frontBackMatch'; // Par défaut sur la validation Front/Back
    this.state = JSON.parse(JSON.stringify(GEOMETRY));
    this.pdfCardPoses = JSON.parse(JSON.stringify(PDF_CARD_POSES));
    this.selectedAssetKey = 'envelopeFront';

    // Options d'affichage
    this.options = {
      grid: true,
      axes: true,
      bbox: true,
      alpha: true,
      showOpenRef: false // Par défaut, la référence n'est PAS affichée dans Card + Pocket
    };

    // Modes pour Tab F (Front / Back Match)
    this.matchMode = 'OVERLAY'; // FRONT, BACK, OVERLAY, BLINK, DIFFERENCE
    this.overlayFrontOpacity = 0.5;
    this.blinkIntervalId = null;
    this.blinkState = 'FRONT';

    this.stageScale = 1;
    this.init();
  }

  init() {
    this.container.innerHTML = createCalibrationLayout();
    this.cacheElements();
    this.setupEventListeners();
    this.updateResponsiveScale();
    this.render();
  }

  cacheElements() {
    this.viewport = document.getElementById('calib-viewport');
    this.stageWrapper = document.getElementById('stage-wrapper');
    this.logicalStage = document.getElementById('logical-stage');
    this.stageContent = document.getElementById('stage-content');
    this.stageGrid = document.getElementById('stage-grid');
    this.stageAxes = document.getElementById('stage-axes');
    this.physicalOutline = document.getElementById('physical-envelope-outline');
    this.sidebar = document.getElementById('calib-sidebar');
    this.tabsContainer = document.getElementById('calib-tabs');
    this.mouseCoordsHud = document.getElementById('mouse-coords');
    this.stageScaleInfo = document.getElementById('stage-scale-info');
    this.matchStatusHud = document.getElementById('match-status');
  }

  setupEventListeners() {
    // Onglets
    this.tabsContainer.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.calib-tab');
      if (!tabBtn) return;
      this.clearBlink();
      this.currentTab = tabBtn.dataset.tab;
      this.tabsContainer.querySelectorAll('.calib-tab').forEach(b => b.classList.remove('active'));
      tabBtn.classList.add('active');
      this.render();
    });

    // Toggles Header
    document.getElementById('btn-toggle-grid').addEventListener('click', (e) => {
      this.options.grid = !this.options.grid;
      e.currentTarget.classList.toggle('active', this.options.grid);
      this.stageGrid.style.display = this.options.grid ? 'block' : 'none';
    });

    document.getElementById('btn-toggle-axes').addEventListener('click', (e) => {
      this.options.axes = !this.options.axes;
      e.currentTarget.classList.toggle('active', this.options.axes);
      this.stageAxes.style.display = this.options.axes ? 'block' : 'none';
    });

    document.getElementById('btn-toggle-bbox').addEventListener('click', (e) => {
      this.options.bbox = !this.options.bbox;
      e.currentTarget.classList.toggle('active', this.options.bbox);
      this.renderStageLayers();
    });

    document.getElementById('btn-toggle-alpha').addEventListener('click', (e) => {
      this.options.alpha = !this.options.alpha;
      e.currentTarget.classList.toggle('active', this.options.alpha);
      this.renderStageLayers();
    });

    document.getElementById('btn-copy-json').addEventListener('click', () => {
      this.copyCurrentGeometry();
    });

    document.getElementById('btn-reset-geom').addEventListener('click', () => {
      this.clearBlink();
      this.state = JSON.parse(JSON.stringify(GEOMETRY));
      this.render();
      this.showToast('Géométrie réinitialisée aux valeurs physiques verrouillées');
    });

    // Responsive scaling
    window.addEventListener('resize', () => {
      this.updateResponsiveScale();
    });

    // Coordonnées souris centrées en (0, 0)
    this.logicalStage.addEventListener('mousemove', (e) => {
      const rect = this.logicalStage.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      const stageX = Math.round((rawX / this.stageScale) - (STAGE_CONFIG.width / 2));
      const stageY = Math.round((rawY / this.stageScale) - (STAGE_CONFIG.height / 2));

      this.mouseCoordsHud.textContent = `X: ${stageX >= 0 ? '+' + stageX : stageX}px | Y: ${stageY >= 0 ? '+' + stageY : stageY}px`;
    });
  }

  updateResponsiveScale() {
    if (!this.viewport || !this.stageWrapper) return;
    const padding = 32;
    const availW = this.viewport.clientWidth - padding;
    const availH = this.viewport.clientHeight - padding;

    const scaleX = availW / STAGE_CONFIG.width;
    const scaleY = availH / STAGE_CONFIG.height;
    this.stageScale = Math.min(scaleX, scaleY, 1.2);

    this.stageWrapper.style.transform = `scale(${this.stageScale})`;
    if (this.stageScaleInfo) {
      this.stageScaleInfo.textContent = `Scale: ${Math.round(this.stageScale * 100)}%`;
    }
  }

  render() {
    this.renderStageLayers();
    this.renderSidebar();
  }

  renderStageLayers() {
    this.stageContent.innerHTML = '';

    // Afficher ou masquer le contour physique
    if (this.physicalOutline) {
      this.physicalOutline.style.display = (this.currentTab === 'frontBackMatch' || this.currentTab === 'closedFront' || this.currentTab === 'closedBack') ? 'block' : 'none';
    }

    switch (this.currentTab) {
      case 'frontBackMatch':
        this.renderFrontBackMatchStage();
        break;

      case 'closedFront':
        this.addStageLayer('closedFront', ASSETS.envelopeFront, this.state.closedFront, { label: 'FRONT', badgeType: 'runtime' });
        break;

      case 'closedBack':
        this.addStageLayer('closedBack', ASSETS.envelopeBackClosed, this.state.closedBack, { label: 'BACK', badgeType: 'runtime' });
        this.addStageLayer('seal', ASSETS.envelopeSeal, this.state.seal, { label: 'SEAL', badgeType: 'runtime' });
        break;

      case 'openReference':
        this.addStageLayer('openReference', ASSETS.envelopeOpenReference, this.state.openReference, { label: '[REFERENCE UNIQUEMENT]', badgeType: 'reference' });
        break;

      case 'cardPocket':
        // Si toggle référence activé, affichage en arrière-plan
        if (this.options.showOpenRef) {
          this.addStageLayer('openReference', ASSETS.envelopeOpenReference, {
            ...this.state.openReference,
            zIndex: 5,
            opacity: 0.4
          }, { label: '[REFERENCE]', badgeType: 'reference' });
        }
        // 1. CARTE (milieu)
        this.addStageLayer('card', ASSETS.invitationCard, this.state.card, { label: '[RUNTIME CARD]', badgeType: 'runtime' });
        // 2. POCHE (devant)
        this.addStageLayer('pocket', ASSETS.envelopePocket, this.state.pocket, { label: '[RUNTIME POCKET]', badgeType: 'runtime' });
        break;

      case 'individualAssets':
        const asset = ASSETS[this.selectedAssetKey];
        if (asset) {
          const ratio = asset.nativeWidth / asset.nativeHeight;
          let w = 800;
          let h = w / ratio;
          if (h > 650) {
            h = 650;
            w = h * ratio;
          }
          this.addStageLayer(this.selectedAssetKey, asset, {
            x: 0,
            y: 0,
            width: w,
            height: h,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            zIndex: 10
          }, { label: asset.name, badgeType: 'reference' });
        }
        break;
    }
  }

  renderFrontBackMatchStage() {
    switch (this.matchMode) {
      case 'FRONT':
        this.addStageLayer('closedFront', ASSETS.envelopeFront, { ...this.state.closedFront, opacity: 1 }, { label: 'FRONT', badgeType: 'runtime' });
        break;

      case 'BACK':
        this.addStageLayer('closedBack', ASSETS.envelopeBackClosed, { ...this.state.closedBack, opacity: 1 }, { label: 'BACK', badgeType: 'runtime' });
        break;

      case 'OVERLAY':
        this.addStageLayer('closedBack', ASSETS.envelopeBackClosed, {
          ...this.state.closedBack,
          opacity: 1 - this.overlayFrontOpacity,
          zIndex: 10
        }, { label: `BACK (${Math.round((1 - this.overlayFrontOpacity) * 100)}%)`, badgeType: 'runtime' });

        this.addStageLayer('closedFront', ASSETS.envelopeFront, {
          ...this.state.closedFront,
          opacity: this.overlayFrontOpacity,
          zIndex: 20
        }, { label: `FRONT (${Math.round(this.overlayFrontOpacity * 100)}%)`, badgeType: 'runtime' });
        break;

      case 'BLINK':
        if (this.blinkState === 'FRONT') {
          this.addStageLayer('closedFront', ASSETS.envelopeFront, { ...this.state.closedFront, opacity: 1 }, { label: 'FRONT (BLINK)', badgeType: 'runtime' });
        } else {
          this.addStageLayer('closedBack', ASSETS.envelopeBackClosed, { ...this.state.closedBack, opacity: 1 }, { label: 'BACK (BLINK)', badgeType: 'runtime' });
        }
        break;

      case 'DIFFERENCE':
        this.addStageLayer('closedBack', ASSETS.envelopeBackClosed, {
          ...this.state.closedBack,
          opacity: 1,
          zIndex: 10
        }, { label: 'BACK', badgeType: 'runtime' });

        this.addStageLayer('closedFront', ASSETS.envelopeFront, {
          ...this.state.closedFront,
          opacity: 1,
          zIndex: 20
        }, { label: 'FRONT (DIFFERENCE)', badgeType: 'runtime', differenceMode: true });
        break;
    }
  }

  addStageLayer(layerId, asset, geom, options = {}) {
    const layer = document.createElement('div');
    layer.className = 'stage-layer';
    layer.dataset.layerId = layerId;

    if (options.differenceMode) {
      layer.classList.add('difference-mode');
    }

    const w = geom.width || 800;
    const h = geom.height || 500;
    const x = geom.x || 0;
    const y = geom.y || 0;
    const rot = geom.rotation || 0;
    const sx = geom.scaleX ?? geom.scale ?? 1;
    const sy = geom.scaleY ?? geom.scale ?? 1;
    const op = geom.opacity ?? 1;
    const zi = geom.zIndex ?? 1;
    const ox = geom.transformOriginX ?? 50;
    const oy = geom.transformOriginY ?? 50;

    layer.style.width = `${w}px`;
    layer.style.height = `${h}px`;
    layer.style.marginLeft = `${-w / 2}px`;
    layer.style.marginTop = `${-h / 2}px`;
    layer.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${sx}, ${sy})`;
    layer.style.transformOrigin = `${ox}% ${oy}%`;
    layer.style.opacity = op;
    layer.style.zIndex = zi;

    // Badge runtime vs référence
    if (options.label) {
      const badge = document.createElement('span');
      badge.className = `layer-runtime-badge ${options.badgeType || 'runtime'}`;
      badge.textContent = options.label;
      layer.appendChild(badge);
    }

    // Image
    const img = document.createElement('img');
    img.src = asset.src;
    img.alt = asset.name || layerId;
    img.className = 'stage-img';
    layer.appendChild(img);

    // Bounding box externe du canvas
    if (this.options.bbox) {
      const outerBbox = document.createElement('div');
      outerBbox.className = 'bbox-outer';
      layer.appendChild(outerBbox);
    }

    // Alpha Bounding Box calculée
    if (this.options.alpha && asset.hasAlpha && asset.visibleBBox) {
      const alphaBbox = document.createElement('div');
      alphaBbox.className = 'bbox-alpha';

      const scaleXImg = w / asset.nativeWidth;
      const scaleYImg = h / asset.nativeHeight;

      const bLeft = asset.visibleBBox.left * scaleXImg;
      const bTop = asset.visibleBBox.top * scaleYImg;
      const bWidth = asset.visibleWidth * scaleXImg;
      const bHeight = asset.visibleHeight * scaleYImg;

      alphaBbox.style.left = `${bLeft}px`;
      alphaBbox.style.top = `${bTop}px`;
      alphaBbox.style.width = `${bWidth}px`;
      alphaBbox.style.height = `${bHeight}px`;

      const tag = document.createElement('span');
      tag.className = 'bbox-tag';
      tag.textContent = `${Math.round(asset.visibleWidth * scaleXImg)}×${Math.round(asset.visibleHeight * scaleYImg)}`;
      alphaBbox.appendChild(tag);

      layer.appendChild(alphaBbox);
    }

    this.stageContent.appendChild(layer);
  }

  renderSidebar() {
    this.sidebar.innerHTML = '';

    switch (this.currentTab) {
      case 'frontBackMatch':
        this.renderFrontBackMatchControls();
        break;

      case 'closedFront':
        this.renderClosedFrontControls();
        break;

      case 'closedBack':
        this.renderClosedBackControls();
        break;

      case 'openReference':
        this.renderOpenReferenceControls();
        break;

      case 'cardPocket':
        this.renderCardPocketControls();
        break;

      case 'individualAssets':
        this.renderIndividualAssetsControls();
        break;
    }
  }

  // --- VUE F : FRONT / BACK MATCH ---
  renderFrontBackMatchControls() {
    const sec = document.createElement('div');
    sec.className = 'sidebar-section';
    sec.innerHTML = `
      <div class="section-title">
        <span>F. FRONT / BACK MATCH</span>
        <span class="badge-tag" style="background: rgba(16, 185, 129, 0.2); color: var(--accent-emerald);">0.00 px DIFF</span>
      </div>
      <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.85rem; line-height: 1.45;">
        Vérification rigoureuse de la superposition de la silhouette visible entre <strong>FRONT</strong> et <strong>BACK</strong> pour garantir la continuité du futur Flip 3D (180°).
      </p>
      <div class="section-title"><span>Modes de visualisation</span></div>
    `;

    // Barre de modes (FRONT, BACK, OVERLAY, BLINK, DIFFERENCE)
    const modesBar = document.createElement('div');
    modesBar.className = 'match-modes-bar';

    const modes = ['FRONT', 'BACK', 'OVERLAY', 'BLINK', 'DIFFERENCE'];
    modes.forEach((mode) => {
      const btn = document.createElement('button');
      btn.className = `match-mode-btn ${this.matchMode === mode ? 'active' : ''}`;
      btn.textContent = mode;
      btn.addEventListener('click', () => {
        this.clearBlink();
        this.matchMode = mode;
        modesBar.querySelectorAll('.match-mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        if (mode === 'BLINK') {
          this.startBlink();
        }

        this.renderStageLayers();
        this.updateOverlaySliderVisibility();
      });
      modesBar.appendChild(btn);
    });

    sec.appendChild(modesBar);

    // Slider d'opacité (pour le mode OVERLAY)
    const overlaySliderDiv = document.createElement('div');
    overlaySliderDiv.id = 'overlay-slider-container';
    overlaySliderDiv.style.display = this.matchMode === 'OVERLAY' ? 'block' : 'none';
    overlaySliderDiv.innerHTML = `
      <div class="control-row" style="margin-bottom: 1rem;">
        <div class="control-label-row">
          <span>Balance Opacité (Back ↔ Front)</span>
          <span id="overlay-val">${Math.round(this.overlayFrontOpacity * 100)}% Front</span>
        </div>
        <input type="range" class="control-range" min="0" max="1" step="0.02" value="${this.overlayFrontOpacity}" id="overlay-range" />
      </div>
    `;

    const slider = overlaySliderDiv.querySelector('#overlay-range');
    slider.addEventListener('input', (e) => {
      this.overlayFrontOpacity = parseFloat(e.target.value);
      overlaySliderDiv.querySelector('#overlay-val').textContent = `${Math.round(this.overlayFrontOpacity * 100)}% Front`;
      this.renderStageLayers();
    });

    sec.appendChild(overlaySliderDiv);

    // Tableau de validation physique
    const tableSec = document.createElement('div');
    tableSec.className = 'sidebar-section';
    tableSec.innerHTML = `
      <div class="section-title"><span>Comparaison des Silhouettes Visibles</span></div>
      <table class="audit-table">
        <thead>
          <tr><th>Métrique</th><th>FRONT</th><th>BACK</th><th>Écart</th></tr>
        </thead>
        <tbody>
          <tr><td>Largeur visible</td><td class="val">820.00 px</td><td class="val">820.00 px</td><td class="val" style="color:var(--accent-emerald);">0.00 px</td></tr>
          <tr><td>Hauteur visible</td><td class="val">490.00 px</td><td class="val">490.00 px</td><td class="val" style="color:var(--accent-emerald);">0.00 px</td></tr>
          <tr><td>Centre X visible</td><td class="val">0.00 px</td><td class="val">0.00 px</td><td class="val" style="color:var(--accent-emerald);">0.00 px</td></tr>
          <tr><td>Centre Y visible</td><td class="val">0.00 px</td><td class="val">0.00 px</td><td class="val" style="color:var(--accent-emerald);">0.00 px</td></tr>
          <tr><td>Bord gauche</td><td class="val">-410.00 px</td><td class="val">-410.00 px</td><td class="val" style="color:var(--accent-emerald);">0.00 px</td></tr>
          <tr><td>Bord droit</td><td class="val">+410.00 px</td><td class="val">+410.00 px</td><td class="val" style="color:var(--accent-emerald);">0.00 px</td></tr>
          <tr><td>Bord supérieur</td><td class="val">-245.00 px</td><td class="val">-245.00 px</td><td class="val" style="color:var(--accent-emerald);">0.00 px</td></tr>
          <tr><td>Bord inférieur</td><td class="val">+245.00 px</td><td class="val">+245.00 px</td><td class="val" style="color:var(--accent-emerald);">0.00 px</td></tr>
          <tr><td>Scale X appliqué</td><td class="val">0.5449</td><td class="val">0.5077</td><td class="val">-</td></tr>
          <tr><td>Scale Y appliqué</td><td class="val">0.4945</td><td class="val">0.5280</td><td class="val">-</td></tr>
        </tbody>
      </table>
    `;

    this.sidebar.appendChild(sec);
    this.sidebar.appendChild(tableSec);
  }

  updateOverlaySliderVisibility() {
    const container = document.getElementById('overlay-slider-container');
    if (container) {
      container.style.display = this.matchMode === 'OVERLAY' ? 'block' : 'none';
    }
  }

  startBlink() {
    this.clearBlink();
    this.blinkIntervalId = setInterval(() => {
      this.blinkState = this.blinkState === 'FRONT' ? 'BACK' : 'FRONT';
      this.renderStageLayers();
    }, 500);
  }

  clearBlink() {
    if (this.blinkIntervalId) {
      clearInterval(this.blinkIntervalId);
      this.blinkIntervalId = null;
    }
  }

  // --- VUE A : CLOSED FRONT ---
  renderClosedFrontControls() {
    const sec = document.createElement('div');
    sec.className = 'sidebar-section';
    sec.innerHTML = `
      <div class="section-title">
        <span>A. CLOSED FRONT</span>
        <span class="badge-tag">Face Avant</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
        Positionnement normalisé pour que le bord visible épouse exactement PHYSICAL_ENVELOPE (820 × 490).
      </p>
    `;

    sec.appendChild(this.buildLayerControls('closedFront', this.state.closedFront, [
      { key: 'x', label: 'Position X', min: -400, max: 400, step: 0.1, unit: 'px' },
      { key: 'y', label: 'Position Y', min: -400, max: 400, step: 0.1, unit: 'px' },
      { key: 'width', label: 'Largeur Canvas', min: 400, max: 1400, step: 1, unit: 'px' },
      { key: 'height', label: 'Hauteur Canvas', min: 300, max: 900, step: 1, unit: 'px' },
      { key: 'scaleX', label: 'Scale X', min: 0.5, max: 2, step: 0.01, unit: '' },
      { key: 'scaleY', label: 'Scale Y', min: 0.5, max: 2, step: 0.01, unit: '' },
      { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, unit: '°' },
      { key: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    this.sidebar.appendChild(sec);
  }

  // --- VUE B : CLOSED BACK ---
  renderClosedBackControls() {
    const sec = document.createElement('div');
    sec.className = 'sidebar-section';
    sec.innerHTML = `
      <div class="section-title">
        <span>B. CLOSED BACK</span>
        <span class="badge-tag">Dos Fermé</span>
      </div>
    `;

    const backGroup = document.createElement('div');
    backGroup.innerHTML = `<h4 style="font-size: 0.75rem; color: var(--accent-cyan); margin: 0.5rem 0; font-family: var(--font-mono);">ENVELOPE BACK (DOS)</h4>`;
    backGroup.appendChild(this.buildLayerControls('closedBack', this.state.closedBack, [
      { key: 'x', label: 'Back X', min: -400, max: 400, step: 0.1, unit: 'px' },
      { key: 'y', label: 'Back Y', min: -400, max: 400, step: 0.1, unit: 'px' },
      { key: 'width', label: 'Largeur Canvas', min: 400, max: 1400, step: 1, unit: 'px' },
      { key: 'height', label: 'Hauteur Canvas', min: 300, max: 900, step: 1, unit: 'px' }
    ]));

    const sealGroup = document.createElement('div');
    sealGroup.style.marginTop = '1.25rem';
    sealGroup.innerHTML = `
      <h4 style="font-size: 0.75rem; color: var(--gold-accent); margin: 0.5rem 0; font-family: var(--font-mono);">SEAL (SCEAU MESURÉ PAGE 2)</h4>
      <p style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 0.5rem;">Placé à Y = +93.1 px (+19.0% de la hauteur), diamètre 76 px (9.25% de la largeur).</p>
    `;
    sealGroup.appendChild(this.buildLayerControls('seal', this.state.seal, [
      { key: 'x', label: 'Sceau X', min: -300, max: 300, step: 0.5, unit: 'px' },
      { key: 'y', label: 'Sceau Y', min: -300, max: 300, step: 0.5, unit: 'px' },
      { key: 'width', label: 'Diamètre', min: 30, max: 200, step: 1, unit: 'px', syncHeight: true },
      { key: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    sec.appendChild(backGroup);
    sec.appendChild(sealGroup);
    this.sidebar.appendChild(sec);
  }

  // --- VUE C : OPEN REFERENCE ---
  renderOpenReferenceControls() {
    const sec = document.createElement('div');
    sec.className = 'sidebar-section';
    sec.innerHTML = `
      <div class="section-title">
        <span>C. OPEN REFERENCE</span>
        <span class="badge-tag" style="background: rgba(245, 158, 11, 0.2); color: var(--accent-amber);">RÉFÉRENCE SEULE</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
        Cette image est un étalon visuel de calibration. Elle ne fait <strong>PAS</strong> partie du runtime.
      </p>
    `;

    sec.appendChild(this.buildLayerControls('openReference', this.state.openReference, [
      { key: 'x', label: 'Position X', min: -400, max: 400, step: 1, unit: 'px' },
      { key: 'y', label: 'Position Y', min: -400, max: 400, step: 1, unit: 'px' },
      { key: 'width', label: 'Largeur', min: 400, max: 1400, step: 2, unit: 'px' },
      { key: 'height', label: 'Hauteur', min: 300, max: 1000, step: 2, unit: 'px' },
      { key: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    const measuresSec = document.createElement('div');
    measuresSec.className = 'sidebar-section';
    measuresSec.innerHTML = `
      <div class="section-title"><span>Mesures Réelles sur Image Native (1448 × 1086)</span></div>
      <table class="audit-table">
        <tbody>
          <tr><td>BBox visible</td><td class="val">left=192, top=5, right=1253, bottom=1054</td></tr>
          <tr><td>Largeur visible</td><td class="val">1061 px</td></tr>
          <tr><td>Hauteur visible</td><td class="val">1049 px</td></tr>
          <tr><td>Sommet du rabat (apex)</td><td class="val">Y = -524.5 px (par rapport au centre)</td></tr>
          <tr><td>Pointe du V de la poche</td><td class="val">Y = +103.5 px (par rapport au centre)</td></tr>
          <tr><td>Bas de l'enveloppe</td><td class="val">Y = +524.5 px (par rapport au centre)</td></tr>
          <tr><td>Hauteur de poche utile</td><td class="val">421 px (40.1% de la hauteur)</td></tr>
          <tr><td>Hauteur rabat (apex au V)</td><td class="val">628 px (59.9% de la hauteur)</td></tr>
        </tbody>
      </table>
    `;

    this.sidebar.appendChild(sec);
    this.sidebar.appendChild(measuresSec);
  }

  // --- VUE D : CARD + POCKET ---
  renderCardPocketControls() {
    const sec = document.createElement('div');
    sec.className = 'sidebar-section';
    sec.innerHTML = `
      <div class="section-title">
        <span>D. CARD + POCKET</span>
        <span class="badge-tag">RUNTIME SEUL</span>
      </div>
      <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.8rem; line-height: 1.45;">
        Reconstruction runtime exacte : <strong>CARTE</strong> puis <strong>POCHE DEVANT</strong>.<br/>
        Toutes les 15 poses P12 à P26 sont <strong>mesurées</strong> d'après les matrices internes du PDF.
      </p>

      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; padding: 0.5rem 0.75rem; background: rgba(0,0,0,0.35); border-radius: 6px;">
        <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--text-secondary);">Afficher Référence Ouverte</span>
        <input type="checkbox" id="chk-show-open-ref" ${this.options.showOpenRef ? 'checked' : ''} style="cursor: pointer;" />
      </div>

      <div class="section-title">
        <span>PDF CARD POSES (P12 → P26)</span>
      </div>
    `;

    const chk = sec.querySelector('#chk-show-open-ref');
    chk.addEventListener('change', (e) => {
      this.options.showOpenRef = e.target.checked;
      this.renderStageLayers();
    });

    // Grille complète des 15 poses PDF
    const posesGrid = document.createElement('div');
    posesGrid.className = 'pdf-poses-grid';

    const poseKeys = Object.keys(this.pdfCardPoses);
    poseKeys.forEach((key) => {
      const pose = this.pdfCardPoses[key];
      const btn = document.createElement('button');
      btn.className = 'pdf-pose-btn';
      btn.textContent = `P${pose.pdfPage}`;
      btn.title = `${pose.name} (${pose.rotation}°)`;
      btn.addEventListener('click', () => {
        this.applyCardPose(key);
        posesGrid.querySelectorAll('.pdf-pose-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
      posesGrid.appendChild(btn);
    });

    sec.appendChild(posesGrid);

    // Description de la pose
    const descBox = document.createElement('div');
    descBox.className = 'pdf-pose-desc';
    descBox.id = 'pdf-pose-desc';
    descBox.textContent = 'Cliquez sur une pose P12 à P26 ci-dessus. Tous les curseurs ci-dessous se synchronisent instantanément.';
    sec.appendChild(descBox);

    // Contrôles pour la CARTE
    const cardTitle = document.createElement('div');
    cardTitle.className = 'section-title';
    cardTitle.style.marginTop = '1rem';
    cardTitle.innerHTML = `<span>RUNTIME CARD</span><span class="badge-tag">Z: 15</span>`;
    sec.appendChild(cardTitle);

    sec.appendChild(this.buildLayerControls('card', this.state.card, [
      { key: 'x', label: 'Position X', min: -300, max: 300, step: 0.1, unit: 'px' },
      { key: 'y', label: 'Position Y', min: -500, max: 300, step: 0.1, unit: 'px' },
      { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 0.1, unit: '°' },
      { key: 'scaleX', label: 'Scale', min: 0.5, max: 2.5, step: 0.01, unit: '', syncScaleY: true },
      { key: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    // Contrôles pour la POCHE
    const pocketTitle = document.createElement('div');
    pocketTitle.className = 'section-title';
    pocketTitle.style.marginTop = '1.25rem';
    pocketTitle.innerHTML = `<span>RUNTIME POCKET (DEVANT)</span><span class="badge-tag">Z: 30</span>`;
    sec.appendChild(pocketTitle);

    sec.appendChild(this.buildLayerControls('pocket', this.state.pocket, [
      { key: 'x', label: 'Poche X', min: -200, max: 200, step: 0.1, unit: 'px' },
      { key: 'y', label: 'Poche Y', min: -200, max: 200, step: 0.1, unit: 'px' },
      { key: 'width', label: 'Largeur', min: 400, max: 1400, step: 1, unit: 'px' },
      { key: 'height', label: 'Hauteur', min: 300, max: 900, step: 1, unit: 'px' },
      { key: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    this.sidebar.appendChild(sec);
  }

  applyCardPose(poseKey) {
    const pose = this.pdfCardPoses[poseKey];
    if (!pose) return;

    this.state.card.x = pose.x;
    this.state.card.y = pose.y;
    this.state.card.rotation = pose.rotation;
    this.state.card.scaleX = pose.scale;
    this.state.card.scaleY = pose.scale;

    const descEl = document.getElementById('pdf-pose-desc');
    if (descEl) {
      descEl.innerHTML = `
        <strong>P${pose.pdfPage} : ${pose.name}</strong> [${pose.measurementConfidence.toUpperCase()}]<br/>
        ${pose.notes}<br/>
        <span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent-cyan); display: inline-block; margin-top: 4px;">
          X: ${pose.x}px | Y: ${pose.y}px | Rot: ${pose.rotation}° | Scale: ${pose.scale} | Sortie: ${pose.visiblePercent}%
        </span>
      `;
    }

    this.renderStageLayers();
    this.updateControlsInputs('card');
  }

  // --- VUE E : INDIVIDUAL ASSETS ---
  renderIndividualAssetsControls() {
    const sec = document.createElement('div');
    sec.className = 'sidebar-section';
    sec.innerHTML = `
      <div class="section-title">
        <span>E. INDIVIDUAL ASSETS</span>
        <span class="badge-tag">Inspecteur</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.85rem;">
        Inspection granulaire des 6 fichiers canoniques et effets.
      </p>
    `;

    const select = document.createElement('select');
    select.className = 'control-number';
    select.style.width = '100%';
    select.style.padding = '0.5rem';
    select.style.marginBottom = '1.25rem';
    select.style.textAlign = 'left';

    Object.keys(ASSETS).forEach((key) => {
      if (key === 'effects') return;
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = `${ASSETS[key].name} (${ASSETS[key].nativeWidth}×${ASSETS[key].nativeHeight})`;
      if (key === this.selectedAssetKey) opt.selected = true;
      select.appendChild(opt);
    });

    select.addEventListener('change', (e) => {
      this.selectedAssetKey = e.target.value;
      this.render();
    });

    sec.appendChild(select);

    const asset = ASSETS[this.selectedAssetKey];
    if (asset) {
      sec.appendChild(document.createRange().createContextualFragment(`
        <div class="section-title"><span>Métriques détaillées</span></div>
        ${this.buildMetricsTable(asset)}
      `));
    }

    this.sidebar.appendChild(sec);
  }

  // Helper contrôles de calques
  buildLayerControls(layerKey, geomObj, fields) {
    const group = document.createElement('div');
    group.className = 'controls-group';
    group.dataset.controlsLayer = layerKey;

    fields.forEach((field) => {
      const row = document.createElement('div');
      row.className = 'control-row';

      const labelRow = document.createElement('div');
      labelRow.className = 'control-label-row';
      labelRow.innerHTML = `<span>${field.label}</span><span id="val-${layerKey}-${field.key}">${geomObj[field.key]}${field.unit}</span>`;

      const inputs = document.createElement('div');
      inputs.className = 'control-inputs';

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'control-range';
      slider.dataset.field = field.key;
      slider.min = field.min;
      slider.max = field.max;
      slider.step = field.step;
      slider.value = geomObj[field.key];

      const number = document.createElement('input');
      number.type = 'number';
      number.className = 'control-number';
      number.dataset.field = field.key;
      number.min = field.min;
      number.max = field.max;
      number.step = field.step;
      number.value = geomObj[field.key];

      const updateValue = (val) => {
        const numVal = parseFloat(val);
        if (isNaN(numVal)) return;

        geomObj[field.key] = numVal;

        if (field.syncHeight) {
          geomObj['height'] = numVal;
        }
        if (field.syncScaleY) {
          geomObj['scaleY'] = numVal;
        }

        slider.value = numVal;
        number.value = numVal;
        const valSpan = document.getElementById(`val-${layerKey}-${field.key}`);
        if (valSpan) valSpan.textContent = `${numVal}${field.unit}`;

        this.renderStageLayers();
      };

      slider.addEventListener('input', (e) => updateValue(e.target.value));
      number.addEventListener('input', (e) => updateValue(e.target.value));

      inputs.appendChild(slider);
      inputs.appendChild(number);

      row.appendChild(labelRow);
      row.appendChild(inputs);
      group.appendChild(row);
    });

    return group;
  }

  /**
   * Correction rigoureuse du bug UI :
   * Met à jour TOUS les inputs numériques, sliders et labels d'un layer donné.
   */
  updateControlsInputs(layerKey) {
    const group = document.querySelector(`[data-controls-layer="${layerKey}"]`);
    if (!group) return;

    const geomObj = this.state[layerKey];
    if (!geomObj) return;

    group.querySelectorAll('.control-row').forEach((row) => {
      const slider = row.querySelector('.control-range');
      const number = row.querySelector('.control-number');
      if (!slider || !number) return;

      const fieldKey = slider.dataset.field;
      if (fieldKey && geomObj[fieldKey] !== undefined) {
        const val = geomObj[fieldKey];
        slider.value = val;
        number.value = val;

        const valSpan = document.getElementById(`val-${layerKey}-${fieldKey}`);
        if (valSpan) {
          const unit = fieldKey === 'rotation' ? '°' : (fieldKey === 'x' || fieldKey === 'y' || fieldKey === 'width' || fieldKey === 'height') ? 'px' : '';
          valSpan.textContent = `${val}${unit}`;
        }
      }
    });
  }

  buildMetricsTable(asset) {
    const bboxStr = asset.visibleBBox
      ? `L:${asset.visibleBBox.left} T:${asset.visibleBBox.top} R:${asset.visibleBBox.right} B:${asset.visibleBBox.bottom}`
      : 'Plein cadre';

    const centerStr = asset.visibleCenter
      ? `(${asset.visibleCenter.x}, ${asset.visibleCenter.y})`
      : 'N/A';

    return `
      <table class="audit-table">
        <tbody>
          <tr><td>Fichier</td><td class="val">${asset.id}</td></tr>
          <tr><td>Largeur native</td><td class="val">${asset.nativeWidth} px</td></tr>
          <tr><td>Hauteur native</td><td class="val">${asset.nativeHeight} px</td></tr>
          <tr><td>Aspect Ratio natif</td><td class="val">${asset.aspectRatio.toFixed(4)}</td></tr>
          <tr><td>Alpha détecté</td><td class="val">${asset.hasAlpha ? 'Oui' : 'Non'}</td></tr>
          <tr><td>Largeur visible</td><td class="val">${asset.visibleWidth} px</td></tr>
          <tr><td>Hauteur visible</td><td class="val">${asset.visibleHeight} px</td></tr>
          <tr><td>Ratio visible</td><td class="val">${asset.visibleAspectRatio ? asset.visibleAspectRatio.toFixed(4) : asset.aspectRatio.toFixed(4)}</td></tr>
          <tr><td>Centre du contenu</td><td class="val">${centerStr}</td></tr>
          <tr><td>Bounding Box visible</td><td class="val" style="font-size: 0.65rem;">${bboxStr}</td></tr>
          <tr><td>Couverture canvas</td><td class="val">${asset.canvasCoveragePercent ? asset.canvasCoveragePercent.toFixed(1) + '%' : '100%'}</td></tr>
        </tbody>
      </table>
    `;
  }

  copyCurrentGeometry() {
    const exportData = {
      timestamp: new Date().toISOString(),
      activeTab: this.currentTab,
      physicalEnvelope: PHYSICAL_ENVELOPE,
      closedFront: this.state.closedFront,
      closedBack: this.state.closedBack,
      seal: this.state.seal,
      pocket: this.state.pocket,
      card: this.state.card,
      PDF_CARD_POSES: this.pdfCardPoses
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(jsonStr)
      .then(() => {
        this.showToast('✓ Géométrie verrouillée copiée dans le presse-papier !');
      })
      .catch(() => {
        console.log('Geometry JSON:', jsonStr);
        this.showToast('Géométrie affichée dans la console');
      });
  }

  showToast(message) {
    const existing = document.querySelector('.toast-msg');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      if (toast.parentNode) toast.parentNode.removeChild(toast);
    }, 2600);
  }
}
