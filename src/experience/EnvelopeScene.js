/**
 * EnvelopeScene — Construction et gestion du DOM de l'expérience enveloppe (Phase 2)
 *
 * Hiérarchie obligatoire :
 * ExperienceViewport
 * │
 * ├── GroundShadow
 * │
 * └── EnvelopeViewportScaler
 *     │
 *     └── EnvelopeMotionWrapper
 *         │
 *         └── EnvelopeObject3D
 *             │
 *             └── EnvelopeFrontFace
 *                 └── envelope-front.png
 */

import { ASSETS } from '../config/assets.js';
import { GEOMETRY, PHYSICAL_ENVELOPE } from '../config/geometry.js';
import { MOTION } from '../config/motion.js';

export class EnvelopeScene {
  constructor(container) {
    this.container = container;
    this.runtimeScale = 1;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.resizeObserver = null;
    this.isReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.elements = {};
    this.initDOM();
    this.setupResizeListener();
  }

  initDOM() {
    this.container.innerHTML = `
      <div class="experience-viewport" id="experience-viewport">
        <!-- Ombre au sol (sibling de EnvelopeViewportScaler) -->
        <div class="ground-shadow" id="ground-shadow"></div>

        <!-- Scaler responsive global -->
        <div class="envelope-viewport-scaler" id="envelope-viewport-scaler">
          <!-- Wrapper de mouvement (translateY, scale, floating, rotateZ) -->
          <div class="envelope-motion-wrapper" id="envelope-motion-wrapper">
            <!-- Objet 3D pivot (preserve-3d, 820 × 490) -->
            <div class="envelope-object-3d" id="envelope-object-3d" role="button" tabindex="0" aria-label="Ouvrir l'invitation">
              <!-- Face avant enveloppe (calibrée au pixel près) -->
              <div class="envelope-front-face" id="envelope-front-face">
                <img class="envelope-front-img" src="${ASSETS.envelopeFront.src}" alt="Enveloppe Hanna" />
              </div>
              <!-- Cadre de debug physique optionnel -->
              <div class="physical-bounds-guide" id="physical-bounds-guide">
                <span class="bounds-tag">820 × 490</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.elements = {
      viewport: this.container.querySelector('#experience-viewport'),
      shadow: this.container.querySelector('#ground-shadow'),
      scaler: this.container.querySelector('#envelope-viewport-scaler'),
      motionWrapper: this.container.querySelector('#envelope-motion-wrapper'),
      object3D: this.container.querySelector('#envelope-object-3d'),
      frontFace: this.container.querySelector('#envelope-front-face'),
      boundsGuide: this.container.querySelector('#physical-bounds-guide')
    };

    this.applyCalibratedGeometry();
    this.updateResponsiveScale();

    // Interaction future : clics ignorés proprement en Phase 2
    this.elements.object3D.addEventListener('click', (e) => {
      // Ignoré proprement pour l'instant (Phase 3 apportera le retournement)
      e.stopPropagation();
    });

    this.elements.object3D.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
      }
    });
  }

  /**
   * Applique la géométrie strictement calibrée de GEOMETRY.closedFront
   * sur EnvelopeFrontFace et PHYSICAL_ENVELOPE sur EnvelopeObject3D.
   */
  applyCalibratedGeometry() {
    const { object3D, frontFace } = this.elements;
    const front = GEOMETRY.closedFront;

    // EnvelopeObject3D représente fidèlement le rectangle physique 820 × 490
    object3D.style.width = `${PHYSICAL_ENVELOPE.width}px`;
    object3D.style.height = `${PHYSICAL_ENVELOPE.height}px`;

    // EnvelopeFrontFace utilise la calibration exacte sans modification
    frontFace.style.width = `${front.width}px`;
    frontFace.style.height = `${front.height}px`;
    frontFace.style.marginLeft = `${-front.width / 2}px`;
    frontFace.style.marginTop = `${-front.height / 2}px`;
    frontFace.style.transform = `translate3d(${front.x}px, ${front.y}px, 0)`;
  }

  /**
   * Calcule le scale responsive adapté au viewport en préservant le ratio et les marges
   */
  computeRuntimeScale(vw, vh) {
    let targetWidthRatio = 0.58;
    if (vw < 600) {
      targetWidthRatio = 0.90; // Mobile : 88 à 92vw
    } else if (vw < 1024) {
      targetWidthRatio = 0.75; // Tablette : 70 à 80vw
    } else {
      targetWidthRatio = 0.58; // Desktop large : 55 à 65vw
    }

    const targetWidth = vw * targetWidthRatio;
    const scaleByWidth = targetWidth / PHYSICAL_ENVELOPE.width;

    // Ne jamais dépasser 58% de la hauteur disponible du viewport
    const maxAvailableHeight = vh * 0.58;
    const scaleByHeight = maxAvailableHeight / PHYSICAL_ENVELOPE.height;

    const maxScale = 1.15;
    return Math.min(scaleByWidth, scaleByHeight, maxScale);
  }

  /**
   * Met à jour l'échelle responsive et le positionnement relatif de l'ombre
   */
  updateResponsiveScale() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    const scale = this.computeRuntimeScale(this.viewportWidth, this.viewportHeight);
    this.runtimeScale = scale;

    // Application du scale responsive sur EnvelopeViewportScaler UNIQUEMENT
    if (this.elements.scaler) {
      this.elements.scaler.style.transform = `scale(${scale})`;
    }

    // Positionnement et dimensionnement harmonieux de l'ombre au sol
    if (this.elements.shadow) {
      const shadowBaseWidth = PHYSICAL_ENVELOPE.width * MOTION.shadow.widthRatio; // ~574px
      const shadowBaseHeight = MOTION.shadow.baseHeight; // 16px
      const verticalOffset = this.viewportHeight * MOTION.verticalCenterOffsetPercent;

      // Distance verticale du centre vers le bas de l'enveloppe
      const shadowDistY = verticalOffset + (PHYSICAL_ENVELOPE.height / 2 + 10) * scale;

      this.elements.shadow.style.width = `${shadowBaseWidth * scale}px`;
      this.elements.shadow.style.height = `${shadowBaseHeight * scale}px`;
      this.elements.shadow.style.marginLeft = `${(-shadowBaseWidth * scale) / 2}px`;
      this.elements.shadow.style.marginTop = `${(-shadowBaseHeight * scale) / 2}px`;
      this.elements.shadow.style.transform = `translate3d(0, ${shadowDistY}px, 0)`;
    }
  }

  setupResizeListener() {
    this.resizeHandler = () => {
      this.updateResponsiveScale();
    };

    window.addEventListener('resize', this.resizeHandler, { passive: true });

    if (window.ResizeObserver && this.elements.viewport) {
      this.resizeObserver = new ResizeObserver(() => {
        this.updateResponsiveScale();
      });
      this.resizeObserver.observe(this.elements.viewport);
    }
  }

  setInteractive(isInteractive) {
    if (this.elements.object3D) {
      if (isInteractive) {
        this.elements.object3D.classList.add('is-interactive');
      } else {
        this.elements.object3D.classList.remove('is-interactive');
      }
    }
  }

  togglePhysicalBounds(show) {
    if (this.elements.boundsGuide) {
      this.elements.boundsGuide.style.display = show ? 'block' : 'none';
    }
  }

  destroy() {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
