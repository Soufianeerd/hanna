/**
 * HannaExperience — Orchestrateur principal du flow complet d'invitation (MVP)
 *
 * Flow :
 * LOADING
 * ↓
 * ENVELOPE_ENTERING
 * ↓
 * ENVELOPE_SETTLING
 * ↓
 * ENVELOPE_IDLE
 * ↓ (clic / tap)
 * ENVELOPE_TURNING (flip 180°)
 * ↓
 * ENVELOPE_BACK_READY (pause contemplative)
 * ↓
 * SEAL_OPENING (disparition du sceau)
 * ↓
 * OPEN_ENVELOPE_READY (bascule vers l'enveloppe ouverte)
 * ↓
 * CARD_EXTRACTING (poses P12 à P26)
 * ↓
 * CARD_READY (carte centrée, hotspot adresse & RSVP actif)
 * ↓ (choix + validation)
 * RSVP_SUBMITTING (sauvegarde localStorage)
 * ↓
 * RSVP_SUCCESS
 * ↓
 * CARD_SENDING (envol vers le haut)
 * ↓
 * COMPLETED (message final ivoire & vert profond)
 */

import { ASSETS } from '../config/assets.js';
import { EXPERIENCE_STATE, ExperienceStateManager } from './experienceState.js';
import { EnvelopeScene } from './EnvelopeScene.js';
import { EnvelopeEntranceAnimation } from '../animation/envelopeEntrance.js';
import { EnvelopeIdleAnimation } from '../animation/envelopeIdle.js';
import { EnvelopeFlipAnimation } from '../animation/envelopeFlip.js';
import { CardExtractionAnimation } from '../animation/cardExtraction.js';
import { CardSendAnimation } from '../animation/cardSend.js';

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
    this.flip = null;
    this.extraction = null;
    this.send = null;
    this.devPanelEl = null;
    this.hasOpened = false;

    this.init();
  }

  async init() {
    document.body.classList.add('hanna-experience-active');
    document.body.classList.remove('calibration-mode');

    // 1. Préchargement complet des 6 assets avant toute interaction
    await this.preloadAssets();

    // 2. Construction de la scène DOM
    this.scene = new EnvelopeScene(this.container, {
      onOpenRequested: () => this.handleOpenRequest(),
      onRsvpSubmit: (choice) => this.handleRsvpSubmit(choice)
    });

    // 3. Contrôleurs d'animation
    this.entrance = new EnvelopeEntranceAnimation(this.scene, this.stateManager);
    this.idle = new EnvelopeIdleAnimation(this.scene);
    this.flip = new EnvelopeFlipAnimation(this.scene, this.stateManager);
    this.extraction = new CardExtractionAnimation(this.scene, this.stateManager);
    this.send = new CardSendAnimation(this.scene, this.stateManager);

    // 4. Abonnements aux états
    this.stateManager.subscribe((newState) => {
      this.handleStateChange(newState);
    });

    // 5. Panneau DEV motion optionnel
    if (this.options.isDevMotion) {
      this.injectDevMotionPanel();
    }

    // 6. Démarrage
    this.startExperience();
  }

  preloadAssets() {
    const assetsToLoad = [
      ASSETS.envelopeFront.src,
      ASSETS.envelopeBackClosed.src,
      ASSETS.envelopeSeal.src,
      ASSETS.envelopeOpenReference.src,
      ASSETS.envelopePocket.src,
      ASSETS.invitationCard.src
    ];

    const loadSingle = (src) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.src = src;
        if (img.complete) {
          if (img.decode) img.decode().then(resolve).catch(resolve);
          else resolve();
        } else {
          img.onload = () => {
            if (img.decode) img.decode().then(resolve).catch(resolve);
            else resolve();
          };
          img.onerror = () => {
            console.warn('[HannaExperience] Erreur de préchargement:', src);
            resolve();
          };
        }
      });
    };

    return Promise.all(assetsToLoad.map(loadSingle));
  }

  startExperience() {
    this.hasOpened = false;
    this.entrance.play({
      onComplete: () => {
        this.idle.start();
      }
    });
  }

  async handleOpenRequest() {
    // Protection absolue contre double clic ou déclenchement intempestif
    if (this.hasOpened || !this.stateManager.is(EXPERIENCE_STATE.ENVELOPE_IDLE)) {
      return;
    }
    this.hasOpened = true;
    this.scene.setInteractive(false);

    // 1. Stopper le floating et neutraliser en douceur y et rotation
    this.idle.stop();
    await this.flip.neutralizeMotion();

    // 2. Dérouler le flip 180°, le sceau et la bascule vers l'open
    this.flip.playFlipSequence({
      onOpenReady: () => {
        // 3. Extraction progressive de la carte (P12 -> P26)
        this.extraction.play({
          onCardReady: () => {
            // Carte au centre prête pour l'interaction RSVP
          }
        });
      }
    });
  }

  handleRsvpSubmit(choice) {
    if (!this.stateManager.is(EXPERIENCE_STATE.CARD_READY)) return;

    this.stateManager.setState(EXPERIENCE_STATE.RSVP_SUBMITTING);
    this.scene.setRsvpButtonsDisabled(true);

    // Sauvegarde localStorage (MVP)
    try {
      localStorage.setItem('hanna-rsvp', JSON.stringify({
        status: choice,
        submittedAt: new Date().toISOString()
      }));
    } catch (e) {
      console.warn('[HannaExperience] Erreur localStorage:', e);
    }

    // Simulation de validation réseau (250ms)
    setTimeout(() => {
      this.stateManager.setState(EXPERIENCE_STATE.RSVP_SUCCESS);
      this.scene.displayConfirmation(choice);

      // Animation d'envoi de la carte vers le haut
      this.send.play();
    }, 250);
  }

  handleStateChange(newState) {
    if (newState === EXPERIENCE_STATE.ENVELOPE_IDLE && !this.hasOpened) {
      this.scene.setInteractive(true);
    } else {
      this.scene.setInteractive(false);
    }

    if (this.devPanelEl) {
      const stateBadge = this.devPanelEl.querySelector('#dev-state-badge');
      if (stateBadge) {
        stateBadge.textContent = newState;
      }
    }
  }

  injectDevMotionPanel() {
    this.devPanelEl = document.createElement('div');
    this.devPanelEl.className = 'hanna-dev-motion-panel';
    this.devPanelEl.innerHTML = `
      <div class="dev-panel-header">
        <span class="dev-panel-title">MOTION DEV — MVP</span>
        <span class="dev-panel-badge" id="dev-state-badge">${this.stateManager.getState()}</span>
      </div>
      <div class="dev-panel-actions">
        <button type="button" class="dev-btn" id="btn-replay">↺ Replay Flow</button>
        <button type="button" class="dev-btn" id="btn-open-now">✉ Open Envelope</button>
        <button type="button" class="dev-btn" id="btn-reset-storage">⌫ Reset RSVP</button>
        <button type="button" class="dev-btn" id="btn-toggle-bounds">⛶ Bounds</button>
      </div>
      <div class="dev-panel-links">
        <a href="?dev=calibration" class="dev-link">⚙ Calibration</a>
        <a href="/" class="dev-link">✕ Public</a>
      </div>
    `;

    this.container.appendChild(this.devPanelEl);

    let showBounds = false;
    this.devPanelEl.querySelector('#btn-replay')?.addEventListener('click', () => {
      this.destroy();
      new HannaExperience(this.container, { isDevMotion: true });
    });

    this.devPanelEl.querySelector('#btn-open-now')?.addEventListener('click', () => {
      if (this.stateManager.is(EXPERIENCE_STATE.ENVELOPE_IDLE)) {
        this.handleOpenRequest();
      }
    });

    this.devPanelEl.querySelector('#btn-reset-storage')?.addEventListener('click', () => {
      localStorage.removeItem('hanna-rsvp');
      alert('localStorage "hanna-rsvp" réinitialisé');
    });

    this.devPanelEl.querySelector('#btn-toggle-bounds')?.addEventListener('click', () => {
      showBounds = !showBounds;
      this.scene.togglePhysicalBounds(showBounds);
    });
  }

  destroy() {
    if (this.entrance) this.entrance.kill();
    if (this.idle) this.idle.destroy();
    if (this.flip) this.flip.kill();
    if (this.extraction) this.extraction.kill();
    if (this.send) this.send.kill();
    if (this.scene) this.scene.destroy();
    if (this.stateManager) this.stateManager.destroy();
    if (this.devPanelEl) this.devPanelEl.remove();

    document.body.classList.remove('hanna-experience-active');
  }
}
