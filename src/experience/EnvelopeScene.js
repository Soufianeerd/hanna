/**
 * EnvelopeScene — Hiérarchie DOM et gestion des calques pour Hanna Digital Invitation
 *
 * Architecture :
 * ExperienceViewport
 * │
 * ├── GroundShadow (ellipse réactive découplée)
 * ├── AudioToggleBtn (bouton son discret en haut à droite)
 * │
 * ├── EnvelopeViewportScaler (scaling responsive global)
 * │   │
 * │   └── EnvelopeMotionWrapper (translateY, floating, scale)
 * │       │
 * │       ├── EnvelopeObject3D (3D preserve-3d)
 * │       │   ├── EnvelopeFrontFace (0deg)
 * │       │   │   └── envelope-front.png
 * │       │   │
 * │       │   └── EnvelopeBackFace (180deg)
 * │       │       ├── envelope-back-closed.png
 * │       │       └── EnvelopeSeal (envelope-seal.png)
 * │       │
 * │       └── OpenEnvelopeAssembly (corps physique invariant 820 × 490)
 * │           ├── OpenEnvelopeBackground (old-envelope-open.png, z-index 10)
 * │           │
 * │           ├── CardClippingLayer (masque strict sous le bas et sur les côtés, z-index 20)
 * │           │   └── InvitationCardWrapper (z-index 20 -> 500 fixed)
 * │           │       └── InvitationCardCanvas (ratio natif 941/1672)
 * │           │           ├── <img carteInvitation.png>
 * │           │           ├── Patch Salma's Henna Day (nouveau S calligraphique)
 * │           │           ├── Patch À PARTIR DE 18H
 * │           │           ├── AddressHotspot (<a> transparent vers Google Maps)
 * │           │           └── CardRsvpOverlay (RSVP épuré Présent(e) / Absent(e))
 * │           │
 * │           └── OpenEnvelopeForeground (old-envelope-open.png clippé sur la poche, z-index 30)
 * │
 * └── ConfirmationMessage (Message final après envoi)
 */

import gsap from 'gsap';
import { ASSETS } from '../config/assets.js';
import { GEOMETRY, OPEN_ENVELOPE_GEOMETRY, PHYSICAL_ENVELOPE } from '../config/geometry.js';
import { MOTION } from '../config/motion.js';
import { computeFinalCardRect } from '../utils/visualViewport.js';

export class EnvelopeScene {
  constructor(container, { onOpenRequested, onRsvpSubmit, onMuteToggle } = {}) {
    this.container = container;
    this.onOpenRequested = onOpenRequested;
    this.onRsvpSubmit = onRsvpSubmit;
    this.onMuteToggle = onMuteToggle;

    this.runtimeScale = 1;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.resizeObserver = null;
    this.selectedChoice = null;
    this.isCardReadyState = false;
    this.finalCardGeometry = null;
    this.guestInfo = null;
    this.isRsvpDisabledForDemo = false;

    this.elements = {};
    this.initDOM();
    this.setupResizeListener();
  }

  initDOM() {
    const mapsQuery = encodeURIComponent(
      "La Salle des Fêtes Maurice Gérardin de Dommartin-lès-Toul, Allée de l'Île des Sables, 54200 Dommartin-lès-Toul"
    );

    this.container.innerHTML = `
      <div class="experience-viewport" id="experience-viewport">
        <!-- Bouton son discret en haut à droite (accessible 42x42px min) -->
        <button type="button" class="audio-toggle-btn" id="audio-toggle-btn" aria-label="Couper la musique" title="Couper la musique">
          <svg class="audio-icon audio-icon-on" id="audio-icon-on" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
          </svg>
          <svg class="audio-icon audio-icon-off" id="audio-icon-off" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="display: none;">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
            <line x1="23" y1="9" x2="17" y2="15"></line>
            <line x1="17" y1="9" x2="23" y2="15"></line>
          </svg>
        </button>

        <!-- Ombre au sol (sibling réactif de EnvelopeViewportScaler) -->
        <div class="ground-shadow" id="ground-shadow"></div>

        <!-- Scaler responsive global -->
        <div class="envelope-viewport-scaler" id="envelope-viewport-scaler">
          <!-- Wrapper de mouvement (translateY, scale, floating, rotateZ) -->
          <div class="envelope-motion-wrapper" id="envelope-motion-wrapper">
            
            <!-- 1. Objet 3D fermé (pivot 0° -> 180°) -->
            <div class="envelope-object-3d" id="envelope-object-3d" role="button" tabindex="0" aria-label="Ouvrir l'invitation">
              <!-- Face avant enveloppe (0deg) -->
              <div class="envelope-front-face" id="envelope-front-face">
                <img class="envelope-front-img" src="${ASSETS.envelopeFront.src}" alt="Face avant enveloppe Hanna" />
              </div>

              <!-- Face arrière enveloppe (180deg) -->
              <div class="envelope-back-face" id="envelope-back-face">
                <img class="envelope-back-img" src="${ASSETS.envelopeBackClosed.src}" alt="Dos fermé enveloppe Hanna" />
                <!-- Sceau de cire indépendant sur le dos -->
                <div class="envelope-seal" id="envelope-seal">
                  <img class="envelope-seal-img" src="${ASSETS.envelopeSeal.src}" alt="Sceau de cire" />
                </div>
              </div>

              <!-- Guide de validation visuelle (DEV) -->
              <div class="physical-bounds-guide" id="physical-bounds-guide">
                <span class="bounds-tag">820 × 490</span>
              </div>
            </div>

            <!-- 2. Assemblée enveloppe ouverte (corps physique strictement invariant) -->
            <div class="open-envelope-assembly" id="open-envelope-assembly">
              <!-- Fond enveloppe ouverte avec rabat supérieur (old-envelope-open.png) -->
              <div class="open-envelope-background" id="open-envelope-background">
                <img class="open-envelope-img" src="${ASSETS.envelopeOpenReference.src}" alt="Fond enveloppe ouverte" />
              </div>

              <!-- Calque d'occlusion de la carte (masque strict sous le bas de l'enveloppe) -->
              <div class="card-clipping-layer" id="card-clipping-layer">
                <!-- Wrapper unique de la carte d'invitation -->
                <div class="invitation-card-wrapper" id="invitation-card-wrapper">
                  <!-- Canvas intérieur garantissant le respect absolu du ratio 941 / 1672 -->
                  <div class="invitation-card-canvas" id="invitation-card-canvas">
                    <!-- Image originale PNG intacte -->
                    <img class="invitation-card-img" src="${ASSETS.invitationCard.src}" alt="Carte d'invitation Salma's Henna Day" />

                    <!-- Patch A : Salma's Henna Day avec nouveau S calligraphique plus lisible et élégant -->
                    <div class="card-patch-title" aria-label="Salma's Henna Day">
                      <h1 class="henna-title">
                        <span class="salma-initial">S</span><span class="salma-body">alma's Henna Day</span>
                      </h1>
                    </div>

                    <!-- Patch B : Correction de l'heure -> À PARTIR DE 18H -->
                    <div class="card-patch-time" aria-label="À partir de 18H">
                      <span>À PARTIR DE 18H</span>
                    </div>

                    <!-- Hotspot transparent sur l'adresse existante dans le PNG -->
                    <a class="card-address-hotspot" 
                       id="card-address-hotspot"
                       href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       aria-label="Ouvrir l’itinéraire vers la salle sur Google Maps"></a>

                    <!-- RSVP discret dans l'espace vide ivoire bas-centre (Sans accompagnants) -->
                    <div class="card-rsvp-overlay" id="card-rsvp-overlay">
                      <div class="rsvp-overlay-title">RSVP</div>
                      
                      <!-- Choix Présence -->
                      <div class="rsvp-overlay-options" role="group" aria-label="Présence à l'événement">
                        <button type="button" class="rsvp-btn-option" data-choice="PRESENT" aria-pressed="false">Présent(e)</button>
                        <button type="button" class="rsvp-btn-option" data-choice="ABSENT" aria-pressed="false">Absent(e)</button>
                      </div>

                      <button type="button" class="rsvp-btn-submit" id="rsvp-btn-submit">Valider</button>
                      <div class="rsvp-feedback-msg" id="rsvp-feedback-msg" aria-live="polite"></div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Premier plan : poche avant découpée depuis la MÊME image open reference -->
              <div class="open-envelope-foreground" id="open-envelope-foreground">
                <img class="open-envelope-img" src="${ASSETS.envelopeOpenReference.src}" alt="Poche avant enveloppe" />
              </div>
            </div>

          </div>
        </div>

        <!-- 3. Message de confirmation final après envoi -->
        <div class="confirmation-message" id="confirmation-message" style="display: none;">
          <h2 class="confirmation-title" id="confirmation-title">Merci pour votre réponse</h2>
          <p class="confirmation-text" id="confirmation-text"></p>
        </div>
      </div>
    `;

    this.cacheElements();
    this.applyCalibratedGeometry();
    this.setupInteractions();
    this.updateResponsiveScale();
  }

  cacheElements() {
    this.elements = {
      viewport: this.container.querySelector('#experience-viewport'),
      shadow: this.container.querySelector('#ground-shadow'),
      scaler: this.container.querySelector('#envelope-viewport-scaler'),
      motionWrapper: this.container.querySelector('#envelope-motion-wrapper'),
      object3D: this.container.querySelector('#envelope-object-3d'),
      frontFace: this.container.querySelector('#envelope-front-face'),
      backFace: this.container.querySelector('#envelope-back-face'),
      seal: this.container.querySelector('#envelope-seal'),
      boundsGuide: this.container.querySelector('#physical-bounds-guide'),

      // Audio
      audioBtn: this.container.querySelector('#audio-toggle-btn'),
      audioIconOn: this.container.querySelector('#audio-icon-on'),
      audioIconOff: this.container.querySelector('#audio-icon-off'),

      // Open assembly
      openScene: this.container.querySelector('#open-envelope-assembly'),
      openBackground: this.container.querySelector('#open-envelope-background'),
      cardClippingLayer: this.container.querySelector('#card-clipping-layer'),
      card: this.container.querySelector('#invitation-card-wrapper'),
      cardCanvas: this.container.querySelector('#invitation-card-canvas'),
      cardImg: this.container.querySelector('.invitation-card-img'),
      openForeground: this.container.querySelector('#open-envelope-foreground'),
      addressHotspot: this.container.querySelector('#card-address-hotspot'),
      rsvpOverlay: this.container.querySelector('#card-rsvp-overlay'),

      // RSVP
      rsvpSubmit: this.container.querySelector('#rsvp-btn-submit'),
      rsvpStatusMsg: this.container.querySelector('#rsvp-feedback-msg'),
      rsvpOptionBtns: this.container.querySelectorAll('.rsvp-btn-option'),

      // Confirmation
      confirmationMessage: this.container.querySelector('#confirmation-message'),
      confirmationTitle: this.container.querySelector('#confirmation-title'),
      confirmationText: this.container.querySelector('#confirmation-text')
    };
  }

  applyCalibratedGeometry() {
    const {
      object3D,
      frontFace,
      backFace,
      seal,
      boundsGuide,
      openScene,
      openBackground,
      openForeground,
      cardClippingLayer,
      card
    } = this.elements;

    const geom = GEOMETRY;
    const openGeom = OPEN_ENVELOPE_GEOMETRY;

    // 1. BOÎTE PHYSIQUE CANONIQUE DE L'ENVELOPPE (820 × 490)
    object3D.style.width = `${PHYSICAL_ENVELOPE.width}px`;
    object3D.style.height = `${PHYSICAL_ENVELOPE.height}px`;
    object3D.style.marginLeft = `${-PHYSICAL_ENVELOPE.width / 2}px`;
    object3D.style.marginTop = `${-PHYSICAL_ENVELOPE.height / 2}px`;

    boundsGuide.style.width = `${PHYSICAL_ENVELOPE.width}px`;
    boundsGuide.style.height = `${PHYSICAL_ENVELOPE.height}px`;

    // 2. FACE AVANT (0deg)
    const front = geom.closedFront;
    frontFace.style.width = `${front.width}px`;
    frontFace.style.height = `${front.height}px`;
    frontFace.style.marginLeft = `${-front.width / 2}px`;
    frontFace.style.marginTop = `${-front.height / 2}px`;
    frontFace.style.transform = `translate3d(${front.offsetX}px, ${front.offsetY}px, 0.5px)`;

    // 3. FACE ARRIÈRE FERMÉE (180deg)
    const back = geom.closedBack;
    backFace.style.width = `${back.width}px`;
    backFace.style.height = `${back.height}px`;
    backFace.style.marginLeft = `${-back.width / 2}px`;
    backFace.style.marginTop = `${-back.height / 2}px`;
    backFace.style.transform = `rotateY(180deg) translate3d(${-back.offsetX}px, ${back.offsetY}px, 0.5px)`;

    // 4. SCEAU DE CIRE
    const sealGeom = geom.seal;
    seal.style.width = `${sealGeom.width}px`;
    seal.style.height = `${sealGeom.height}px`;
    seal.style.marginLeft = `${-sealGeom.width / 2}px`;
    seal.style.marginTop = `${-sealGeom.height / 2}px`;
    seal.style.transform = `translate3d(${sealGeom.offsetX}px, ${sealGeom.offsetY}px, 2px)`;

    // 5. ASSEMBLÉE ENVELOPPE OUVERTE
    openScene.style.width = `${PHYSICAL_ENVELOPE.width}px`;
    openScene.style.height = `${PHYSICAL_ENVELOPE.height}px`;
    openScene.style.marginLeft = `${-PHYSICAL_ENVELOPE.width / 2}px`;
    openScene.style.marginTop = `${-PHYSICAL_ENVELOPE.height / 2}px`;

    // OPEN ENVELOPE BACKGROUND (old-envelope-open.png calibré sur le corps 820 × 490)
    openBackground.style.width = `${openGeom.openBack.width}px`;
    openBackground.style.height = `${openGeom.openBack.height}px`;
    openBackground.style.marginLeft = `${-openGeom.openBack.width / 2}px`;
    openBackground.style.marginTop = `${-openGeom.openBack.height / 2}px`;
    openBackground.style.transform = `translate3d(${openGeom.openBack.x}px, ${openGeom.openBack.y}px, 0)`;

    // OPEN ENVELOPE FOREGROUND (MÊME IMAGE ET MÊME POSITION PHYSIQUE)
    openForeground.style.width = `${openGeom.openBack.width}px`;
    openForeground.style.height = `${openGeom.openBack.height}px`;
    openForeground.style.marginLeft = `${-openGeom.openBack.width / 2}px`;
    openForeground.style.marginTop = `${-openGeom.openBack.height / 2}px`;
    openForeground.style.transform = `translate3d(${openGeom.openBack.x}px, ${openGeom.openBack.y}px, 0)`;

    // CARD CLIPPING LAYER (boîte physique 820 × 490 du corps de l'enveloppe)
    cardClippingLayer.style.width = `${PHYSICAL_ENVELOPE.width}px`;
    cardClippingLayer.style.height = `${PHYSICAL_ENVELOPE.height}px`;
    cardClippingLayer.style.marginLeft = `${-PHYSICAL_ENVELOPE.width / 2}px`;
    cardClippingLayer.style.marginTop = `${-PHYSICAL_ENVELOPE.height / 2}px`;

    // INVITATION CARD WRAPPER DANS L'ENVELOPPE (AVANT EXTRACTION)
    const cardGeom = geom.card || geom.invitationCard;
    card.style.width = `${cardGeom.width}px`;
    card.style.height = `${cardGeom.height}px`;
    card.style.marginLeft = `${-cardGeom.width / 2}px`;
    card.style.marginTop = `${-cardGeom.height / 2}px`;
    card.style.transform = `translate3d(-6px, 10px, 0) rotate(-90deg) scale(1.0)`;
  }

  setupInteractions() {
    // 1. Clic / Touch sur l'enveloppe pour ouvrir
    const handleOpen = (e) => {
      if (this.onOpenRequested) {
        this.onOpenRequested(e);
      }
    };

    this.elements.object3D.addEventListener('click', handleOpen);
    this.elements.object3D.addEventListener('touchend', (e) => {
      handleOpen(e);
    });
    this.elements.object3D.addEventListener('pointerup', handleOpen);
    this.elements.object3D.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleOpen(e);
      }
    });

    // 2. Sélection RSVP (Présent / Absent)
    this.elements.rsvpOptionBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const choice = btn.dataset.choice;
        this.selectRsvpChoice(choice);
      });
    });

    // 3. Soumission RSVP
    this.elements.rsvpSubmit?.addEventListener('click', (e) => {
      e.stopPropagation();

      if (this.isRsvpDisabledForDemo) {
        this.showRsvpError("Cette invitation ne permet pas d'enregistrer une réponse.");
        return;
      }

      if (!this.selectedChoice) {
        this.showRsvpError('Merci de sélectionner une réponse.');
        return;
      }

      this.clearRsvpError();
      if (this.onRsvpSubmit) {
        this.onRsvpSubmit({
          status: this.selectedChoice
        });
      }
    });

    // 4. Bouton Audio Mute
    this.elements.audioBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.onMuteToggle) {
        this.onMuteToggle();
      }
    });
  }

  selectRsvpChoice(choice) {
    this.selectedChoice = choice;
    this.clearRsvpError();

    this.elements.rsvpOptionBtns.forEach((btn) => {
      const isSelected = btn.dataset.choice === choice;
      btn.setAttribute('aria-pressed', isSelected ? 'true' : 'false');
      btn.classList.toggle('is-selected', isSelected);
    });
  }

  /**
   * Active ou masque le bouton audio si le fichier son est disponible ou absent
   * @param {boolean} available 
   */
  setAudioAvailable(available) {
    if (this.elements.audioBtn) {
      this.elements.audioBtn.style.display = available ? 'flex' : 'none';
    }
  }

  /**
   * Configure les informations d'invité obtenues depuis l'API ou le mode démo
   * @param {{ firstName?: string, rsvp?: string }|null} guest
   * @param {boolean} isProductionWithoutCode
   */
  configureGuest(guest, isProductionWithoutCode = false) {
    this.guestInfo = guest;
    this.isRsvpDisabledForDemo = isProductionWithoutCode;

    if (isProductionWithoutCode) {
      if (this.elements.rsvpSubmit) {
        this.elements.rsvpSubmit.disabled = true;
      }
      this.showRsvpError("Cette invitation ne permet pas d'enregistrer une réponse.");
      return;
    }

    if (guest) {
      // Pré-sélection de la réponse existante si déjà soumise
      if (guest.rsvp === 'PRESENT' || guest.rsvp === 'ABSENT') {
        this.selectRsvpChoice(guest.rsvp);
      }
    }
  }

  showRsvpError(msg) {
    if (this.elements.rsvpStatusMsg) {
      this.elements.rsvpStatusMsg.textContent = msg;
      this.elements.rsvpStatusMsg.classList.add('has-error');
    }
  }

  clearRsvpError() {
    if (this.elements.rsvpStatusMsg) {
      this.elements.rsvpStatusMsg.textContent = '';
      this.elements.rsvpStatusMsg.classList.remove('has-error');
    }
  }

  setRsvpButtonsDisabled(disabled) {
    this.elements.rsvpOptionBtns.forEach((btn) => {
      btn.disabled = disabled;
    });
    if (this.elements.rsvpSubmit) {
      this.elements.rsvpSubmit.disabled = disabled;
      if (disabled) {
        this.elements.rsvpSubmit.textContent = 'Enregistrement...';
      } else {
        this.elements.rsvpSubmit.textContent = 'Valider';
      }
    }
  }

  displayConfirmation(status) {
    const { confirmationTitle, confirmationText } = this.elements;
    if (status === 'PRESENT') {
      confirmationTitle.textContent = 'Merci pour votre présence !';
      confirmationText.innerHTML = `Votre confirmation de présence a bien été enregistrée.<br />Nous avons hâte de partager ce moment précieux avec vous.`;
    } else {
      confirmationTitle.textContent = 'Merci pour votre réponse';
      confirmationText.innerHTML = `Votre réponse a bien été prise en compte.<br />Nous regrettons votre absence et penserons bien à vous.`;
    }
  }

  setFinalCardGeometry(targetRect) {
    this.finalCardGeometry = targetRect;
  }

  setCardReady() {
    this.isCardReadyState = true;
    if (this.elements.viewport) {
      this.elements.viewport.classList.add('is-card-ready');
    }
  }

  updateMuteDisplay(isMuted) {
    if (!this.elements.audioIconOn || !this.elements.audioIconOff || !this.elements.audioBtn) return;
    if (isMuted) {
      this.elements.audioIconOn.style.display = 'none';
      this.elements.audioIconOff.style.display = 'block';
      this.elements.audioBtn.setAttribute('aria-label', 'Activer la musique');
      this.elements.audioBtn.setAttribute('title', 'Activer la musique');
    } else {
      this.elements.audioIconOn.style.display = 'block';
      this.elements.audioIconOff.style.display = 'none';
      this.elements.audioBtn.setAttribute('aria-label', 'Couper la musique');
      this.elements.audioBtn.setAttribute('title', 'Couper la musique');
    }
  }

  computeRuntimeScale(viewportWidth, viewportHeight) {
    const marginX = 24;
    const marginY = 32;
    const availableW = Math.max(280, viewportWidth - marginX * 2);
    const availableH = Math.max(380, viewportHeight - marginY * 2);

    const scaleX = availableW / PHYSICAL_ENVELOPE.width;
    const scaleY = availableH / PHYSICAL_ENVELOPE.height;
    let scale = Math.min(scaleX, scaleY);

    if (viewportWidth < 480) {
      scale = Math.min(scale, 0.46);
    } else if (viewportWidth < 768) {
      scale = Math.min(scale, 0.62);
    } else if (viewportWidth < 1024) {
      scale = Math.min(scale, 0.78);
    } else {
      scale = Math.min(scale, 0.95);
    }

    return Math.max(0.32, scale);
  }

  updateResponsiveScale() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

    // Si la carte est en état CARD_READY, son positionnement est géré par la géométrie fixed
    if (this.isCardReadyState) {
      if (this.elements.card) {
        const targetRect = computeFinalCardRect();
        this.finalCardGeometry = targetRect;
        gsap.to(this.elements.card, {
          left: targetRect.left,
          top: targetRect.top,
          width: targetRect.width,
          height: targetRect.height,
          duration: 0.25,
          ease: 'power1.out'
        });
      }
      return;
    }

    const scale = this.computeRuntimeScale(this.viewportWidth, this.viewportHeight);
    this.runtimeScale = scale;

    if (this.elements.scaler) {
      this.elements.scaler.style.transform = `scale(${scale})`;
    }

    if (this.elements.shadow) {
      const shadowBaseWidth = PHYSICAL_ENVELOPE.width * MOTION.shadow.widthRatio;
      const shadowBaseHeight = MOTION.shadow.baseHeight;
      const verticalOffset = this.viewportHeight * MOTION.verticalCenterOffsetPercent;
      const shadowDistY = verticalOffset + (PHYSICAL_ENVELOPE.height / 2 + 10) * scale;

      this.elements.shadow.style.width = `${shadowBaseWidth * scale}px`;
      this.elements.shadow.style.height = `${shadowBaseHeight * scale}px`;
      this.elements.shadow.style.marginLeft = `${(-shadowBaseWidth * scale) / 2}px`;
      this.elements.shadow.style.marginTop = `${(-shadowBaseHeight * scale) / 2}px`;
      this.elements.shadow.style.transform = `translate3d(0, ${shadowDistY}px, 0)`;
    }
  }

  setupResizeListener() {
    let resizeTimer = null;
    this.resizeHandler = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        this.updateResponsiveScale();
      }, 60);
    };

    window.addEventListener('resize', this.resizeHandler, { passive: true });

    // Écoute du Visual Viewport pour adapter la position lors des mouvements de barre Safari
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', this.resizeHandler, { passive: true });
      window.visualViewport.addEventListener('scroll', this.resizeHandler, { passive: true });
    }

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
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', this.resizeHandler);
        window.visualViewport.removeEventListener('scroll', this.resizeHandler);
      }
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    this.container.innerHTML = '';
  }
}
