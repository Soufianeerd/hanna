/**
 * Moteur de calibration et d'inspection géométrique
 */

import { ASSETS } from '../config/assets.js';
import { GEOMETRY, CARD_KEY_POSES, STAGE_CONFIG } from '../config/geometry.js';
import { createCalibrationLayout } from './calibrationView.js';

export class CalibrationController {
  constructor(container) {
    this.container = container;
    this.currentTab = 'closedFront';
    this.state = JSON.parse(JSON.stringify(GEOMETRY));
    this.cardKeyPoses = JSON.parse(JSON.stringify(CARD_KEY_POSES));
    this.selectedAssetKey = 'envelopeFront';

    this.options = {
      grid: true,
      axes: true,
      bbox: true,
      alpha: true
    };

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
    this.sidebar = document.getElementById('calib-sidebar');
    this.tabsContainer = document.getElementById('calib-tabs');
    this.mouseCoordsHud = document.getElementById('mouse-coords');
    this.stageScaleInfo = document.getElementById('stage-scale-info');
  }

  setupEventListeners() {
    // Onglets
    this.tabsContainer.addEventListener('click', (e) => {
      const tabBtn = e.target.closest('.calib-tab');
      if (!tabBtn) return;
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
      this.state = JSON.parse(JSON.stringify(GEOMETRY));
      this.render();
      this.showToast('Géométrie réinitialisée aux valeurs par défaut');
    });

    // Responsive stage auto-scaling
    window.addEventListener('resize', () => {
      this.updateResponsiveScale();
    });

    // Coordonnées souris relatives au centre (0, 0)
    this.logicalStage.addEventListener('mousemove', (e) => {
      const rect = this.logicalStage.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;

      // Normalisation en coordonnées du stage logique (1600x1000)
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
    this.stageScale = Math.min(scaleX, scaleY, 1.2); // max 1.2

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

    switch (this.currentTab) {
      case 'closedFront':
        this.addStageLayer('envelopeFront', ASSETS.envelopeFront, this.state.closedFront);
        break;

      case 'closedBack':
        this.addStageLayer('envelopeBackClosed', ASSETS.envelopeBackClosed, this.state.closedBack);
        this.addStageLayer('envelopeSeal', ASSETS.envelopeSeal, this.state.seal);
        break;

      case 'openReference':
        this.addStageLayer('envelopeOpenReference', ASSETS.envelopeOpenReference, this.state.openReference);
        break;

      case 'cardPocket':
        // 1. Fond arrière ouvert
        this.addStageLayer('envelopeBacking', ASSETS.envelopeOpenReference, this.state.envelopeBacking);
        // 2. Carte d'invitation (au milieu)
        this.addStageLayer('invitationCard', ASSETS.invitationCard, this.state.card);
        // 3. Poche avant (devant la carte)
        this.addStageLayer('envelopePocket', ASSETS.envelopePocket, this.state.pocket);
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
          const geom = {
            x: 0,
            y: 0,
            width: w,
            height: h,
            scaleX: 1,
            scaleY: 1,
            rotation: 0,
            opacity: 1,
            transformOriginX: 50,
            transformOriginY: 50,
            zIndex: 10
          };
          this.addStageLayer(this.selectedAssetKey, asset, geom);
        }
        break;
    }
  }

  addStageLayer(layerId, asset, geom) {
    const layer = document.createElement('div');
    layer.className = 'stage-layer';
    layer.dataset.layerId = layerId;

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

    // Image
    const img = document.createElement('img');
    img.src = asset.src;
    img.alt = asset.name;
    img.className = 'stage-img';
    layer.appendChild(img);

    // Bounding box externe
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
      tag.textContent = `${Math.round(asset.visibleWidth)}×${Math.round(asset.visibleHeight)}`;
      alphaBbox.appendChild(tag);

      layer.appendChild(alphaBbox);
    }

    this.stageContent.appendChild(layer);
  }

  renderSidebar() {
    this.sidebar.innerHTML = '';

    switch (this.currentTab) {
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
        Calibration de la face avant de l'enveloppe (vert sauge, dorures et texte Hanna).
      </p>
    `;

    sec.appendChild(this.buildLayerControls('closedFront', this.state.closedFront, [
      { key: 'x', label: 'Position X', min: -400, max: 400, step: 1, unit: 'px' },
      { key: 'y', label: 'Position Y', min: -400, max: 400, step: 1, unit: 'px' },
      { key: 'width', label: 'Largeur', min: 400, max: 1400, step: 2, unit: 'px' },
      { key: 'height', label: 'Hauteur', min: 300, max: 900, step: 2, unit: 'px' },
      { key: 'scaleX', label: 'Scale X', min: 0.5, max: 2, step: 0.01, unit: '' },
      { key: 'scaleY', label: 'Scale Y', min: 0.5, max: 2, step: 0.01, unit: '' },
      { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, unit: '°' },
      { key: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    const auditSec = document.createElement('div');
    auditSec.className = 'sidebar-section';
    auditSec.innerHTML = `
      <div class="section-title"><span>Métriques Asset</span></div>
      ${this.buildMetricsTable(ASSETS.envelopeFront)}
    `;

    this.sidebar.appendChild(sec);
    this.sidebar.appendChild(auditSec);
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
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
        Ajustement indépendant du dos fermé et du sceau de cire positionné sur la pointe du rabat.
      </p>
    `;

    // Dos
    const backGroup = document.createElement('div');
    backGroup.innerHTML = `<h4 style="font-size: 0.75rem; color: var(--accent-cyan); margin: 0.5rem 0; font-family: var(--font-mono);">ENVELOPE BACK</h4>`;
    backGroup.appendChild(this.buildLayerControls('closedBack', this.state.closedBack, [
      { key: 'x', label: 'Back X', min: -400, max: 400, step: 1, unit: 'px' },
      { key: 'y', label: 'Back Y', min: -400, max: 400, step: 1, unit: 'px' },
      { key: 'width', label: 'Largeur', min: 400, max: 1400, step: 2, unit: 'px' },
      { key: 'height', label: 'Hauteur', min: 300, max: 900, step: 2, unit: 'px' },
      { key: 'scaleX', label: 'Scale X', min: 0.5, max: 2, step: 0.01, unit: '' },
      { key: 'scaleY', label: 'Scale Y', min: 0.5, max: 2, step: 0.01, unit: '' }
    ]));

    // Sceau
    const sealGroup = document.createElement('div');
    sealGroup.style.marginTop = '1.25rem';
    sealGroup.innerHTML = `<h4 style="font-size: 0.75rem; color: var(--gold-accent); margin: 0.5rem 0; font-family: var(--font-mono);">SEAL (SCEAU INDÉPENDANT)</h4>`;
    sealGroup.appendChild(this.buildLayerControls('seal', this.state.seal, [
      { key: 'x', label: 'Sceau X', min: -300, max: 300, step: 1, unit: 'px' },
      { key: 'y', label: 'Sceau Y', min: -300, max: 300, step: 1, unit: 'px' },
      { key: 'width', label: 'Taille', min: 40, max: 300, step: 2, unit: 'px', syncHeight: true },
      { key: 'scaleX', label: 'Scale', min: 0.5, max: 2, step: 0.01, unit: '', syncScaleY: true },
      { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, unit: '°' },
      { key: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    sec.appendChild(backGroup);
    sec.appendChild(sealGroup);

    const auditSec = document.createElement('div');
    auditSec.className = 'sidebar-section';
    auditSec.innerHTML = `
      <div class="section-title"><span>Métriques Sceau</span></div>
      ${this.buildMetricsTable(ASSETS.envelopeSeal)}
    `;

    this.sidebar.appendChild(sec);
    this.sidebar.appendChild(auditSec);
  }

  // --- VUE C : OPEN REFERENCE ---
  renderOpenReferenceControls() {
    const sec = document.createElement('div');
    sec.className = 'sidebar-section';
    sec.innerHTML = `
      <div class="section-title">
        <span>C. OPEN REFERENCE</span>
        <span class="badge-tag">Calibration Seule</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1rem; line-height: 1.5;">
        Référence visuelle de l'enveloppe ouverte. Ne sert pas de runtime unifié final, mais d'étalon de mesure.
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
      <div class="section-title"><span>Points Clés Mesurés</span></div>
      <table class="audit-table">
        <tbody>
          <tr><td>Largeur totale visible</td><td class="val">1261 px</td></tr>
          <tr><td>Hauteur totale visible</td><td class="val">1086 px</td></tr>
          <tr><td>Sommet du rabat ouvert</td><td class="val">Y = -335 px</td></tr>
          <tr><td>Ligne supérieure poche</td><td class="val">Y = +45 px</td></tr>
          <tr><td>Fond intérieur utile</td><td class="val">Y = +310 px</td></tr>
          <tr><td>Profondeur poche utile</td><td class="val">≈ 265 px</td></tr>
          <tr><td>Largeur intérieure utile</td><td class="val">≈ 880 px</td></tr>
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
        <span class="badge-tag">PDF Motion</span>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.8rem; line-height: 1.4;">
        Test des key poses déduites du PDF d'animation. La poche avant passe rigoureusement <strong>DEVANT</strong> la carte.
      </p>
      <div class="section-title" style="margin-top: 0.75rem;">
        <span>PDF PAGE REFERENCE</span>
      </div>
    `;

    // Grille de boutons PDF
    const posesGrid = document.createElement('div');
    posesGrid.className = 'pdf-poses-grid';

    const poseKeys = Object.keys(this.cardKeyPoses);
    poseKeys.forEach((key) => {
      const pose = this.cardKeyPoses[key];
      const btn = document.createElement('button');
      btn.className = 'pdf-pose-btn';
      btn.textContent = `P${pose.pdfPage}`;
      btn.title = pose.name;
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
    descBox.textContent = 'Sélectionnez une page PDF ci-dessus pour observer l\'angle et la translation de la carte.';
    sec.appendChild(descBox);

    // Contrôles interactifs pour la carte
    const cardTitle = document.createElement('div');
    cardTitle.className = 'section-title';
    cardTitle.style.marginTop = '1rem';
    cardTitle.innerHTML = `<span>CONTRÔLES CARTE</span><span class="badge-tag">Z: 15</span>`;
    sec.appendChild(cardTitle);

    sec.appendChild(this.buildLayerControls('card', this.state.card, [
      { key: 'x', label: 'Position X', min: -300, max: 300, step: 1, unit: 'px' },
      { key: 'y', label: 'Position Y', min: -400, max: 300, step: 1, unit: 'px' },
      { key: 'rotation', label: 'Rotation', min: -180, max: 180, step: 1, unit: '°' },
      { key: 'scaleX', label: 'Scale', min: 0.5, max: 1.8, step: 0.01, unit: '', syncScaleY: true },
      { key: 'opacity', label: 'Opacité', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    // Contrôles pour la poche
    const pocketTitle = document.createElement('div');
    pocketTitle.className = 'section-title';
    pocketTitle.style.marginTop = '1.25rem';
    pocketTitle.innerHTML = `<span>CONTRÔLES POCHE</span><span class="badge-tag">Z: 30 (DEVANT)</span>`;
    sec.appendChild(pocketTitle);

    sec.appendChild(this.buildLayerControls('pocket', this.state.pocket, [
      { key: 'x', label: 'Poche X', min: -200, max: 200, step: 1, unit: 'px' },
      { key: 'y', label: 'Poche Y', min: -200, max: 200, step: 1, unit: 'px' },
      { key: 'width', label: 'Largeur', min: 400, max: 1400, step: 2, unit: 'px' },
      { key: 'height', label: 'Hauteur', min: 300, max: 900, step: 2, unit: 'px' },
      { key: 'opacity', label: 'Opacité Poche', min: 0, max: 1, step: 0.05, unit: '' }
    ]));

    this.sidebar.appendChild(sec);
  }

  applyCardPose(poseKey) {
    const pose = this.cardKeyPoses[poseKey];
    if (!pose) return;

    this.state.card.x = pose.x;
    this.state.card.y = pose.y;
    this.state.card.rotation = pose.rotation;
    this.state.card.scaleX = pose.scale;
    this.state.card.scaleY = pose.scale;
    this.state.card.opacity = pose.opacity ?? 1;

    const descEl = document.getElementById('pdf-pose-desc');
    if (descEl) {
      descEl.innerHTML = `<strong>Page ${pose.pdfPage} : ${pose.name}</strong><br/>${pose.description}<br/><span style="font-family: var(--font-mono); font-size: 0.72rem; color: var(--accent-cyan); display: inline-block; margin-top: 4px;">x: ${pose.x}px | y: ${pose.y}px | rot: ${pose.rotation}° | scale: ${pose.scale}</span>`;
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
        Inspection granulaire de chaque fichier source et de ses métriques visibles.
      </p>
    `;

    const select = document.createElement('select');
    select.className = 'control-number';
    select.style.width = '100%';
    select.style.padding = '0.5rem';
    select.style.marginBottom = '1.25rem';
    select.style.textAlign = 'left';

    Object.keys(ASSETS).forEach((key) => {
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
      slider.min = field.min;
      slider.max = field.max;
      slider.step = field.step;
      slider.value = geomObj[field.key];

      const number = document.createElement('input');
      number.type = 'number';
      number.className = 'control-number';
      number.min = field.min;
      number.max = field.max;
      number.step = field.step;
      number.value = geomObj[field.key];

      const updateValue = (val) => {
        const numVal = parseFloat(val);
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

  updateControlsInputs(layerKey) {
    const group = document.querySelector(`[data-controls-layer="${layerKey}"]`);
    if (!group) return;

    const geomObj = this.state[layerKey];
    if (!geomObj) return;

    Object.keys(geomObj).forEach((prop) => {
      const valSpan = document.getElementById(`val-${layerKey}-${prop}`);
      if (valSpan) {
        valSpan.textContent = `${geomObj[prop]}`;
      }
    });

    group.querySelectorAll('.control-row').forEach((row) => {
      const slider = row.querySelector('.control-range');
      const number = row.querySelector('.control-number');
      // Update values
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
      geometry: this.state,
      cardKeyPoses: this.cardKeyPoses
    };

    const jsonStr = JSON.stringify(exportData, null, 2);
    navigator.clipboard.writeText(jsonStr)
      .then(() => {
        this.showToast('✓ Géométrie complète copiée dans le presse-papier !');
      })
      .catch(() => {
        console.log('Geometry JSON:', jsonStr);
        this.showToast('Géométrie affichée dans la console (clipboard bloqué)');
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
