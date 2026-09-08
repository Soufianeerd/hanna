/**
 * HannaExperience — Orchestrateur principal du flow complet d'invitation
 *
 * Flow :
 * LOADING
 * ↓
 * ENVELOPE_ENTERING
 * ↓
 * ENVELOPE_SETTLING
 * ↓
 * ENVELOPE_IDLE (flottement permanent + audio d'intro)
 * ↓ (clic / tap)
 * ENVELOPE_TURNING (flip 180° lent 1.55s)
 * ↓
 * ENVELOPE_BACK_READY (pause contemplative 0.28s)
 * ↓
 * SEAL_OPENING (disparition du sceau)
 * ↓
 * OPEN_ENVELOPE_READY (bascule vers l'enveloppe ouverte twin-image)
 * ↓
 * CARD_EXTRACTING (extraction continue 3.0s sans zigzag)
 * ↓
 * CARD_READY (carte plein écran responsive, fondu audio, RSVP avec 1..4 personnes)
 * ↓ (choix + validation)
 * RSVP_SUBMITTING (envoi Google Apps Script ou fallback DEV)
 * ↓
 * RSVP_SUCCESS
 * ↓
 * CARD_SENDING (envol gracieux vers le haut)
 * ↓
 * COMPLETED (message final personnalisé)
 */

import { ASSETS } from '../config/assets.js';
import { EXPERIENCE_STATE, ExperienceStateManager } from './experienceState.js';
import { EnvelopeScene } from './EnvelopeScene.js';
import { EnvelopeEntranceAnimation } from '../animation/envelopeEntrance.js';
import { EnvelopeIdleAnimation } from '../animation/envelopeIdle.js';
import { EnvelopeFlipAnimation } from '../animation/envelopeFlip.js';
import { CardExtractionAnimation } from '../animation/cardExtraction.js';
import { CardSendAnimation } from '../animation/cardSend.js';
import { InvitationAudioManager } from '../audio/invitationAudio.js';
import { getGuest, submitRsvp, RSVP_ENDPOINT } from '../services/rsvpService.js';

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
    this.audioManager = null;
    this.devPanelEl = null;
    this.hasOpened = false;

    // Récupération du code invité dans l'URL (?code=HN-XXXXXXXXXXXX)
    const urlParams = new URLSearchParams(window.location.search);
    this.guestCode = (urlParams.get('code') || '').trim();
    this.guest = null;

    this.init();
  }

  async init() {
    document.body.classList.add('hanna-experience-active');
    document.body.classList.remove('calibration-mode');

    // 1. Initialisation audio avec détection automatique de disponibilité
    this.audioManager = new InvitationAudioManager({
      onAvailabilityChange: (available) => {
        if (this.scene) {
          this.scene.setAudioAvailable(available);
        }
      }
    });
    this.audioManager.preload();

    // 2. Préchargement complet des assets graphiques
    await this.preloadAssets();

    // 3. Construction de la scène DOM
    this.scene = new EnvelopeScene(this.container, {
      onOpenRequested: () => this.handleOpenRequest(),
      onRsvpSubmit: (data) => this.handleRsvpSubmit(data),
      onMuteToggle: () => {
        const isMuted = this.audioManager.toggleMute();
        this.scene.updateMuteDisplay(isMuted);
      }
    });

    // Synchronisation de la disponibilité audio avec le bouton son
    this.scene.setAudioAvailable(this.audioManager.available);

    // Écouteur synchrone au premier pointerdown sur l'enveloppe pour iOS
    if (this.scene.elements.object3D) {
      this.scene.elements.object3D.addEventListener('pointerdown', () => {
        this.audioManager.playOnUserGesture();
      }, { once: true, passive: true });
    }

    // 4. Contrôleurs d'animation
    this.entrance = new EnvelopeEntranceAnimation(this.scene, this.stateManager);
    this.idle = new EnvelopeIdleAnimation(this.scene);
    this.flip = new EnvelopeFlipAnimation(this.scene, this.stateManager);
    this.extraction = new CardExtractionAnimation(this.scene, this.stateManager);
    this.send = new CardSendAnimation(this.scene, this.stateManager);

    // 5. Abonnements aux états
    this.stateManager.subscribe((newState) => {
      this.handleStateChange(newState);
    });

    // 6. Chargement des informations de l'invité
    await this.resolveGuestInformation();

    // 7. Panneau DEV motion optionnel
    if (this.options.isDevMotion) {
      this.injectDevMotionPanel();
    }

    // 8. Démarrage
    this.startExperience();
  }

  async resolveGuestInformation() {
    if (this.guestCode) {
      const res = await getGuest(this.guestCode);
      if (res && res.ok && res.guest) {
        this.guest = res.guest;
        this.scene.configureGuest(this.guest, false);
      } else {
        // Code invalide ou absent du sheet
        const isProdWithoutCode = !import.meta.env.DEV;
        this.scene.configureGuest(null, isProdWithoutCode);
      }
    } else {
      // Aucun code dans l'URL
      const isProdWithoutCode = !import.meta.env.DEV;
      this.scene.configureGuest(null, isProdWithoutCode);
    }
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

    // Tentative de démarrage de la musique d'intro (si autorisée par le navigateur)
    this.audioManager.start();

    this.entrance.play({
      onComplete: () => {
        this.idle.start();
      }
    });
  }

  async handleOpenRequest() {
    console.log('[HannaExperience] handleOpenRequest called. Current state:', this.stateManager.getState(), 'hasOpened:', this.hasOpened);
    // Protection absolue contre double clic ou déclenchement intempestif
    if (this.hasOpened || !this.stateManager.is(EXPERIENCE_STATE.ENVELOPE_IDLE)) {
      console.warn('[HannaExperience] handleOpenRequest ignored due to state or already opened.');
      return;
    }
    this.hasOpened = true;
    this.scene.setInteractive(false);

    // Démarre la musique sur ce geste utilisateur si l'audio est disponible
    this.audioManager.playOnUserGesture();

    // 1. Stopper le floating et neutraliser en douceur y et rotation
    this.idle.stop();
    await this.flip.neutralizeMotion();

    // 2. Dérouler le flip 180°, le sceau et la bascule vers l'open
    this.flip.playFlipSequence({
      onOpenReady: () => {
        // 3. Extraction progressive puis présentation continue
        this.extraction.play({
          onCardReady: () => {
            // Carte prête : fade out automatique de la musique d'ouverture
            this.audioManager.fadeOutAndStop();
          }
        });
      }
    });
  }

  async handleRsvpSubmit({ status }) {
    if (!this.stateManager.is(EXPERIENCE_STATE.CARD_READY)) return;

    this.stateManager.setState(EXPERIENCE_STATE.RSVP_SUBMITTING);
    this.scene.setRsvpButtonsDisabled(true);

    const payload = {
      code: this.guestCode,
      status: status,
      submittedAt: new Date().toISOString()
    };

    const res = await submitRsvp(payload);

    if (res.ok) {
      this.stateManager.setState(EXPERIENCE_STATE.RSVP_SUCCESS);
      this.scene.displayConfirmation(status);

      // Animation d'envoi de la carte vers le haut
      this.send.play();
    } else {
      this.stateManager.setState(EXPERIENCE_STATE.CARD_READY);
      this.scene.showRsvpError(res.message || 'Une erreur est survenue. Merci de réessayer.');
      this.scene.setRsvpButtonsDisabled(false);
    }
  }

  handleStateChange(newState) {
    if (newState === EXPERIENCE_STATE.ENVELOPE_IDLE && !this.hasOpened) {
      this.scene.setInteractive(true);
    } else {
      this.scene.setInteractive(false);
    }

    if (newState === EXPERIENCE_STATE.CARD_READY) {
      this.audioManager.fadeOutAndStop();
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
        <span class="dev-panel-title">MOTION DEV — FINAL</span>
        <span class="dev-panel-badge" id="dev-state-badge">${this.stateManager.getState()}</span>
      </div>
      <div class="dev-panel-actions">
        <button type="button" class="dev-btn" id="btn-replay">↺ Replay</button>
        <button type="button" class="dev-btn" id="btn-open-now">✉ Open</button>
        <button type="button" class="dev-btn" id="btn-toggle-sound">♫ Sound</button>
        <button type="button" class="dev-btn" id="btn-reset-storage">⌫ Reset</button>
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

    this.devPanelEl.querySelector('#btn-toggle-sound')?.addEventListener('click', () => {
      const isMuted = this.audioManager.toggleMute();
      this.scene.updateMuteDisplay(isMuted);
    });

    this.devPanelEl.querySelector('#btn-reset-storage')?.addEventListener('click', () => {
      localStorage.removeItem('hanna-rsvp');
      alert('Stockage RSVP local réinitialisé');
    });

    this.devPanelEl.querySelector('#btn-toggle-bounds')?.addEventListener('click', () => {
      showBounds = !showBounds;
      this.scene.togglePhysicalBounds(showBounds);
    });
  }

  destroy() {
    if (this.audioManager) this.audioManager.destroy();
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
