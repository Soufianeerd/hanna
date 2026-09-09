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
import { downloadHannaCalendar } from '../utils/calendar.js';

export class EnvelopeScene {
  constructor(container, { onOpenRequested, onRsvpSubmit, onMuteToggle, onStartGateTap } = {}) {
    this.container = container;
    this.onOpenRequested = onOpenRequested;
    this.onRsvpSubmit = onRsvpSubmit;
    this.onMuteToggle = onMuteToggle;
    this.onStartGateTap = onStartGateTap;

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
        <!-- Start Gate minimal et élégant (fond ivoire #F7F4EC) -->
        <div class="start-gate-overlay" id="start-gate-overlay" role="button" tabindex="0" aria-label="Toucher pour découvrir l’invitation">
          <div class="start-gate-text">Toucher pour découvrir l’invitation</div>
        </div>

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

              <!-- Guide de calibration DEV optionnel -->
              <div class="physical-bounds-guide" id="physical-bounds-guide"></div>
            </div>

            <!-- 2. Assemblée Enveloppe Ouverte -->
            <div class="open-envelope-assembly" id="open-envelope-assembly">
              <!-- Fond enveloppe ouverte avec rabat supérieur -->
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

                    <!-- Patch C : Masquage parfait de l'adresse postale avec le papier ivoire texture originale -->
                    <div class="card-patch-address" aria-hidden="true"></div>

                    <!-- Hotspot transparent sur le nom de la salle dans le PNG -->
                    <a class="card-address-hotspot" 
                       id="card-address-hotspot"
                       href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       aria-label="Ouvrir l’itinéraire vers la salle sur Google Maps"></a>

                    <!-- Actions discrètes sous la salle : Itinéraire · Ajouter au calendrier -->
                    <div class="card-actions-row" id="card-actions-row">
                      <a class="card-action-link card-route-button" 
                         id="card-route-button"
                         href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" 
                         target="_blank" 
                         rel="noopener noreferrer" 
                         aria-label="Ouvrir l’itinéraire vers la salle sur Google Maps">Itinéraire</a>
                      <span class="card-actions-separator" aria-hidden="true">·</span>
                      <button type="button" 
                              class="card-action-link card-calendar-button" 
                              id="card-calendar-button"
                              aria-label="Ajouter l'événement au calendrier">Ajouter au calendrier</button>
                    </div>

                    <!-- Formulaire discret dans l'espace vide ivoire bas-centre (Sans titre RSVP) -->
                    <div class="card-rsvp-overlay" id="card-rsvp-overlay">
                      <!-- Champ Prénom sur sa propre ligne -->
                      <div class="rsvp-row-firstname">
                        <input
                          id="guest-first-name"
                          class="rsvp-input-firstname"
                          type="text"
                          autocomplete="given-name"
                          maxlength="60"
                          placeholder="Prénom"
                          aria-label="Prénom"
                        />
                      </div>

                      <!-- Champ Adresse e-mail sur sa propre ligne -->
                      <div class="rsvp-row-email">
                        <input
                          id="guest-email"
                          class="rsvp-input-email"
                          type="email"
                          autocomplete="email"
                          inputmode="email"
                          maxlength="120"
                          placeholder="Adresse e-mail"
                          aria-label="Adresse e-mail"
                        />
                      </div>

                      <!-- Choix Présence (Neutres par défaut, aucun choix coché) -->
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

        <!-- Page Plein Écran (parent final immersif de la carte à CARD_PRESENTING / CARD_READY) -->
        <div class="invitation-fullscreen-page" id="invitation-fullscreen-page" style="display: none;"></div>

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
      startGate: this.container.querySelector('#start-gate-overlay'),
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
      routeButton: this.container.querySelector('#card-route-button'),
      actionsRow: this.container.querySelector('#card-actions-row'),
      calendarBtn: this.container.querySelector('#card-calendar-button'),
      rsvpOverlay: this.container.querySelector('#card-rsvp-overlay'),
      fullscreenPage: this.container.querySelector('#invitation-fullscreen-page'),

      // RSVP
      guestFirstName: this.container.querySelector('#guest-first-name'),
      guestEmail: this.container.querySelector('#guest-email'),
      rsvpSubmit: this.container.querySelector('#rsvp-btn-submit'),
      rsvpStatusMsg: this.container.querySelector('#rsvp-feedback-msg'),
      rsvpOptionBtns: this.container.querySelectorAll('.rsvp-btn-option'),

      // Confirmation
      confirmationMessage: this.container.querySelector('#confirmation-message'),
      confirmationTitle: this.container.querySelector('#confirmation-title'),
      confirmationText: this.container.querySelector('#confirmation-text')
    };
  }

  setupResizeListener() {
    window.addEventListener('resize', () => {
      this.updateResponsiveScale();
    });
  }

  applyCalibratedGeometry() {
    const {
      object3D,
      frontFace,
      backFace,
      seal,
      openBackground,
      openForeground,
      cardClippingLayer,
      card
    } = this.elements;

    const { closedFront, closedBack, seal: sealGeom, card: cardGeom } = GEOMETRY;
    const openGeom = OPEN_ENVELOPE_GEOMETRY;

    // 1. BOÎTE PHYSIQUE CANONIQUE DE L'ENVELOPPE (820 × 490) - Conforme ef01
    object3D.style.width = `${PHYSICAL_ENVELOPE.width}px`;
    object3D.style.height = `${PHYSICAL_ENVELOPE.height}px`;

    // 2. FACE AVANT (0deg) - Conforme ef01 (closedFront.x, closedFront.y, PAS d'offsetX/offsetY)
    frontFace.style.width = `${closedFront.width}px`;
    frontFace.style.height = `${closedFront.height}px`;
    frontFace.style.marginLeft = `${-closedFront.width / 2}px`;
    frontFace.style.marginTop = `${-closedFront.height / 2}px`;
    frontFace.style.transform = `translate3d(${closedFront.x}px, ${closedFront.y}px, 0)`;

    // 3. FACE ARRIÈRE FERMÉE (180deg) - Conforme ef01 (closedBack.x, closedBack.y)
    backFace.style.width = `${closedBack.width}px`;
    backFace.style.height = `${closedBack.height}px`;
    backFace.style.marginLeft = `${-closedBack.width / 2}px`;
    backFace.style.marginTop = `${-closedBack.height / 2}px`;
    backFace.style.transform = `translate3d(${closedBack.x}px, ${closedBack.y}px, 0) rotateY(180deg)`;

    // 4. SCEAU DE CIRE - Conforme ef01 (sealGeom.x, sealGeom.y, z=1px)
    seal.style.width = `${sealGeom.width}px`;
    seal.style.height = `${sealGeom.height}px`;
    seal.style.marginLeft = `${-sealGeom.width / 2}px`;
    seal.style.marginTop = `${-sealGeom.height / 2}px`;
    seal.style.transform = `translate3d(${sealGeom.x}px, ${sealGeom.y}px, 1px)`;

    // 5. ASSEMBLÉE ENVELOPPE OUVERTE - Conforme ef01
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
    card.style.width = `${cardGeom.width}px`;
    card.style.height = `${cardGeom.height}px`;
    card.style.marginLeft = `${-cardGeom.width / 2}px`;
    card.style.marginTop = `${-cardGeom.height / 2}px`;
    card.style.transform = `translate3d(-6px, 10px, 0) rotate(-90deg) scale(1.0)`;
  }

  setupInteractions() {
    // 0. Start Gate Tap (iOS Safari gesture unlock & desktop click)
    if (this.elements.startGate) {
      let triggered = false;
      const handleStartGate = (e) => {
        if (triggered) return;
        triggered = true;
        e.preventDefault();
        e.stopPropagation();
        if (this.onStartGateTap) {
          this.onStartGateTap();
        }
      };
      this.elements.startGate.addEventListener('pointerdown', handleStartGate);
      this.elements.startGate.addEventListener('click', handleStartGate);
      this.elements.startGate.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleStartGate(e);
        }
      });
    }

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

      const firstName = (this.elements.guestFirstName?.value || '').trim();
      const email = (this.elements.guestEmail?.value || '').trim();

      if (!firstName) {
        this.showRsvpError('Merci de renseigner votre prénom.');
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        this.showRsvpError('Merci de renseigner une adresse e-mail valide.');
        return;
      }

      if (!this.selectedChoice) {
        this.showRsvpError('Merci de sélectionner une réponse.');
        return;
      }

      this.clearRsvpError();
      if (this.onRsvpSubmit) {
        this.onRsvpSubmit({
          firstName,
          email,
          status: this.selectedChoice
        });
      }
    });

    // Effacer l'erreur à la saisie dans les inputs
    this.elements.guestFirstName?.addEventListener('input', () => this.clearRsvpError());
    this.elements.guestEmail?.addEventListener('input', () => this.clearRsvpError());

    // Au focus d'un input, centrer doucement dans le viewport sans redimensionner l'invitation
    const handleInputFocus = (e) => {
      setTimeout(() => {
        if (e.target && typeof e.target.scrollIntoView === 'function') {
          e.target.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 180);
    };
    this.elements.guestFirstName?.addEventListener('focus', handleInputFocus);
    this.elements.guestEmail?.addEventListener('focus', handleInputFocus);

    // 4. Actions Itinéraire & Calendrier (stopPropagation)
    this.elements.routeButton?.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    this.elements.calendarBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      downloadHannaCalendar();
    });

    // 5. Bouton Audio Mute
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
   * Fait disparaître le start gate en douceur (~250ms)
   * @param {() => void} [onComplete]
   */
  hideStartGate(onComplete) {
    if (!this.elements.startGate) {
      if (onComplete) onComplete();
      return;
    }
    gsap.to(this.elements.startGate, {
      opacity: 0,
      duration: 0.25,
      ease: 'power1.out',
      onStart: () => {
        if (this.elements.startGate) {
          this.elements.startGate.style.pointerEvents = 'none';
        }
      },
      onComplete: () => {
        if (this.elements.startGate) {
          this.elements.startGate.style.display = 'none';
        }
        if (onComplete) onComplete();
      }
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
   * Initialise les boutons RSVP et autorise la soumission
   */
  configureGuest() {
    if (this.elements.rsvpSubmit) {
      this.elements.rsvpSubmit.disabled = false;
      this.elements.rsvpSubmit.style.pointerEvents = 'auto';
      this.elements.rsvpSubmit.style.cursor = 'pointer';
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
    if (confirmationTitle) {
      confirmationTitle.textContent = 'Merci pour votre réponse';
    }
    if (confirmationText) {
      if (status === 'PRESENT') {
        confirmationText.innerHTML = `Votre présence a bien été enregistrée.<br />Nous avons hâte de partager ce moment avec vous.`;
      } else {
        confirmationText.innerHTML = `Nous vous remercions de nous avoir prévenus<br />et pour vos douaas.`;
      }
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

    // Si la carte est en état CARD_READY : la géométrie finale est strictement figée.
    // Le clavier virtuel iOS Safari et les variations visualViewport ne doivent JAMAIS
    // recalculer, modifier le ratio ou animer en GSAP la taille de l'artwork.
    if (this.isCardReadyState) {
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
