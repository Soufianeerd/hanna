/**
 * HannaExperience — Orchestrateur principal de l'expérience Hanna (Phase 2)
 */

import { ASSETS } from '../config/assets.js';
import { EXPERIENCE_STATE, ExperienceStateManager } from './experienceState.js';
import { EnvelopeScene } from './EnvelopeScene.js';
import { EnvelopeEntranceAnimation } from '../animation/envelopeEntrance.js';
import { EnvelopeIdleAnimation } from '../animation/envelopeIdle.js';

export class HannaExperience {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      isDevMotion: options.isDevMotion || false,
      ...options
    };

    this.stateManager = new ExperienceStateManager(EXPERIENCE_STATE.LOADING);
    this.scene = null;
    this.entrance = null;
    this.idle = null;
    this.devPanelEl = null;

    this.init();
  }

  async init() {
    // 1. Définition de la classe CSS sur le body pour le fond ivoire
    document.body.classList.add('hanna-experience-active');
    document.body.classList.remove('calibration-mode');

    // 2. Préchargement de l'image de l'enveloppe avant toute animation
    await this.preloadAssets();

    // 3. Construction de la scène DOM
    this.scene = new EnvelopeScene(this.container);

    // 4. Initialisation des contrôleurs d'animation
    this.entrance = new EnvelopeEntranceAnimation(this.scene, this.stateManager);
    this.idle = new EnvelopeIdleAnimation(this.scene);

    // 5. Abonnement aux transitions d'état
    this.stateManager.subscribe((newState) => {
      this.handleStateChange(newState);
    });

    // 6. Si mode DEV motion actif, injection du panneau de contrôle
    if (this.options.isDevMotion) {
      this.injectDevMotionPanel();
    }

    // 7. Lancement de l'apparition de l'enveloppe
    this.startExperience();
  }

  /**
   * Précharge l'image canonique pour garantir 0 flash d'affichage
   */
  preloadAssets() {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = ASSETS.envelopeFront.src;

      if (img.complete) {
        if (img.decode) {
          img.decode().then(resolve).catch(resolve);
        } else {
          resolve();
        }
      } else {
        img.onload = () => {
          if (img.decode) {
            img.decode().then(resolve).catch(resolve);
          } else {
            resolve();
          }
        };
        img.onerror = () => {
          console.warn('[HannaExperience] Erreur de préchargement:', ASSETS.envelopeFront.src);
          resolve();
        };
      }
    });
  }

  startExperience() {
    // Séquence d'entrée -> settle -> flottement idle continu (aucun temps mort)
    this.entrance.play({
      onComplete: () => {
        this.idle.start();
      }
    });
  }

  handleStateChange(newState) {
    // Gestion du curseur et de l'accessibilité
    if (newState === EXPERIENCE_STATE.ENVELOPE_IDLE) {
      this.scene.setInteractive(true);
    } else {
      this.scene.setInteractive(false);
    }

    // Mise à jour de l'indicateur HUD dans le panneau DEV s'il existe
    if (this.devPanelEl) {
      const stateBadge = this.devPanelEl.querySelector('#dev-state-badge');
      if (stateBadge) {
        stateBadge.textContent = newState;
      }
    }
  }

  /**
   * Panneau d'outils de debug (uniquement sur ?dev=motion)
   */
  injectDevMotionPanel() {
    this.devPanelEl = document.createElement('div');
    this.devPanelEl.className = 'hanna-dev-motion-panel';
    this.devPanelEl.innerHTML = `
      <div class="dev-panel-header">
        <span class="dev-panel-title">MOTION DEV — PHASE 2</span>
        <span class="dev-panel-badge" id="dev-state-badge">${this.stateManager.getState()}</span>
      </div>
      <div class="dev-panel-actions">
        <button type="button" class="dev-btn" id="btn-replay">↺ Replay Entrance</button>
        <button type="button" class="dev-btn" id="btn-stop-idle">⏸ Stop Idle</button>
        <button type="button" class="dev-btn" id="btn-start-idle">▶ Start Idle</button>
        <button type="button" class="dev-btn" id="btn-toggle-bounds">⛶ Show Bounds</button>
      </div>
      <div class="dev-panel-links">
        <a href="?dev=calibration" class="dev-link">⚙ Ouvrir Calibration</a>
        <a href="/" class="dev-link">✕ Vue Publique</a>
      </div>
    `;

    this.container.appendChild(this.devPanelEl);

    let showBounds = false;
    this.devPanelEl.querySelector('#btn-replay')?.addEventListener('click', () => {
      this.idle.stop();
      this.startExperience();
    });

    this.devPanelEl.querySelector('#btn-stop-idle')?.addEventListener('click', () => {
      this.idle.stop();
    });

    this.devPanelEl.querySelector('#btn-start-idle')?.addEventListener('click', () => {
      this.idle.start();
    });

    this.devPanelEl.querySelector('#btn-toggle-bounds')?.addEventListener('click', () => {
      showBounds = !showBounds;
      this.scene.togglePhysicalBounds(showBounds);
      const btn = this.devPanelEl.querySelector('#btn-toggle-bounds');
      if (btn) btn.textContent = showBounds ? '☒ Hide Bounds' : '⛶ Show Bounds';
    });
  }

  destroy() {
    if (this.entrance) this.entrance.kill();
    if (this.idle) this.idle.destroy();
    if (this.scene) this.scene.destroy();
    if (this.stateManager) this.stateManager.destroy();
    if (this.devPanelEl) this.devPanelEl.remove();

    document.body.classList.remove('hanna-experience-active');
  }
}
