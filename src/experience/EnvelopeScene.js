/**
 * EnvelopeScene — Hiérarchie DOM et gestion des calques pour Hanna Digital Invitation
 *
 * Architecture :
 * ExperienceViewport
 * │
 * ├── GroundShadow (ellipse réactive découplée)
 * │
 * ├── EnvelopeViewportScaler (scaling responsive global uniquement)
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
 * │           │   └── InvitationCardWrapper (carteInvitation.png intacte + Hotspot + RSVP, z-index 20 -> 50)
 * │           │       ├── <img carteInvitation.png>
 * │           │       ├── AddressHotspot (<a> transparent vers Google Maps)
 * │           │       └── CardRsvpOverlay (RSVP compact intégré dans l'espace vide ivoire)
 * │           │
 * │           └── OpenEnvelopeForeground (old-envelope-open.png clippé sur la poche, z-index 30)
 * │
 * └── ConfirmationMessage (Message final après envoi)
 */

import { ASSETS } from '../config/assets.js';
import { GEOMETRY, OPEN_ENVELOPE_GEOMETRY, PHYSICAL_ENVELOPE } from '../config/geometry.js';
import { MOTION } from '../config/motion.js';

export class EnvelopeScene {
  constructor(container, { onOpenRequested, onRsvpSubmit } = {}) {
    this.container = container;
    this.onOpenRequested = onOpenRequested;
    this.onRsvpSubmit = onRsvpSubmit;

    this.runtimeScale = 1;
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;
    this.resizeObserver = null;
    this.selectedChoice = null;

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
                <!-- Wrapper unique de la carte d'invitation (carte intacte + Hotspot + RSVP) -->
                <div class="invitation-card-wrapper" id="invitation-card-wrapper">
                  <img class="invitation-card-img" src="${ASSETS.invitationCard.src}" alt="Carte d'invitation Salma's Henna Day" />

                  <!-- Hotspot transparent sur l'adresse existante dans le PNG -->
                  <a class="card-address-hotspot" 
                     id="card-address-hotspot"
                     href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     aria-label="Ouvrir l’itinéraire vers la salle sur Google Maps"></a>

                  <!-- RSVP discret dans l'espace vide ivoire bas-centre -->
                  <div class="card-rsvp-overlay" id="card-rsvp-overlay">
                    <div class="rsvp-overlay-title">RSVP</div>
                    <div class="rsvp-overlay-options" role="group" aria-label="Présence à l'événement">
                      <button type="button" class="rsvp-btn-option" data-choice="PRESENT" aria-pressed="false">Présent(e)</button>
                      <button type="button" class="rsvp-btn-option" data-choice="ABSENT" aria-pressed="false">Absent(e)</button>
                    </div>
                    <button type="button" class="rsvp-btn-submit" id="rsvp-btn-submit">Valider</button>
                    <div class="rsvp-feedback-msg" id="rsvp-feedback-msg" aria-live="polite"></div>
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

      // Open assembly
      openScene: this.container.querySelector('#open-envelope-assembly'),
      openBackground: this.container.querySelector('#open-envelope-background'),
      cardClippingLayer: this.container.querySelector('#card-clipping-layer'),
      card: this.container.querySelector('#invitation-card-wrapper'),
      cardImg: this.container.querySelector('.invitation-card-img'),
      openForeground: this.container.querySelector('#open-envelope-foreground'),
      addressHotspot: this.container.querySelector('#card-address-hotspot'),
      rsvpOverlay: this.container.querySelector('#card-rsvp-overlay'),

      // RSVP & Confirmation
      rsvpSubmit: this.container.querySelector('#rsvp-btn-submit'),
      rsvpStatusMsg: this.container.querySelector('#rsvp-feedback-msg'),
      rsvpOptionBtns: this.container.querySelectorAll('.rsvp-btn-option'),
      confirmationMessage: this.container.querySelector('#confirmation-message'),
      confirmationTitle: this.container.querySelector('#confirmation-title'),
      confirmationText: this.container.querySelector('#confirmation-text')
    };
  }

  applyCalibratedGeometry() {
    const { object3D, frontFace, backFace, seal, openBackground, openForeground, cardClippingLayer, card } = this.elements;
    const { closedFront, closedBack, seal: sealGeom, card: cardGeom } = GEOMETRY;
    const openGeom = OPEN_ENVELOPE_GEOMETRY;

    // EnvelopeObject3D (boîte physique canonique 820 × 490)
    object3D.style.width = `${PHYSICAL_ENVELOPE.width}px`;
    object3D.style.height = `${PHYSICAL_ENVELOPE.height}px`;

    // FRONT Face (calibré à 836.89 × 506.32, x: +0.27, y: -8.16)
    frontFace.style.width = `${closedFront.width}px`;
    frontFace.style.height = `${closedFront.height}px`;
    frontFace.style.marginLeft = `${-closedFront.width / 2}px`;
    frontFace.style.marginTop = `${-closedFront.height / 2}px`;
    frontFace.style.transform = `translate3d(${closedFront.x}px, ${closedFront.y}px, 0)`;

    // BACK Face (calibré à 848.94 × 496.86, x: -0.25, y: +3.43)
    backFace.style.width = `${closedBack.width}px`;
    backFace.style.height = `${closedBack.height}px`;
    backFace.style.marginLeft = `${-closedBack.width / 2}px`;
    backFace.style.marginTop = `${-closedBack.height / 2}px`;
    backFace.style.transform = `translate3d(${closedBack.x}px, ${closedBack.y}px, 0) rotateY(180deg)`;

    // SEAL (76 × 76 à y = +93.1px)
    seal.style.width = `${sealGeom.width}px`;
    seal.style.height = `${sealGeom.height}px`;
    seal.style.marginLeft = `${-sealGeom.width / 2}px`;
    seal.style.marginTop = `${-sealGeom.height / 2}px`;
    seal.style.transform = `translate3d(${sealGeom.x}px, ${sealGeom.y}px, 1px)`;

    // OPEN ENVELOPE BACKGROUND (old-envelope-open.png calibré sur le corps 820 × 490, bottom=+245)
    openBackground.style.width = `${openGeom.openBack.width}px`;
    openBackground.style.height = `${openGeom.openBack.height}px`;
    openBackground.style.marginLeft = `${-openGeom.openBack.width / 2}px`;
    openBackground.style.marginTop = `${-openGeom.openBack.height / 2}px`;
    openBackground.style.transform = `translate3d(${openGeom.openBack.x}px, ${openGeom.openBack.y}px, 0)`;

    // OPEN ENVELOPE FOREGROUND (EXACTEMENT LA MÊME IMAGE ET MÊME POSITION PHYSIQUE)
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

    // INVITATION CARD WRAPPER (320 × 568.59, position initiale au repos dans la poche)
    card.style.width = `${cardGeom.width}px`;
    card.style.height = `${cardGeom.height}px`;
    card.style.marginLeft = `${-cardGeom.width / 2}px`;
    card.style.marginTop = `${-cardGeom.height / 2}px`;
    card.style.transform = `translate3d(-6px, 10px, 0) rotate(-90deg) scale(1.0)`;
  }

  setupInteractions() {
    // 1. Clic sur l'enveloppe pour ouvrir
    const handleOpen = (e) => {
      if (this.onOpenRequested) {
        this.onOpenRequested(e);
      }
    };

    this.elements.object3D.addEventListener('click', handleOpen);
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
      if (!this.selectedChoice) {
        this.showRsvpError('Merci de sélectionner une réponse.');
        return;
      }
      this.clearRsvpError();
      if (this.onRsvpSubmit) {
        this.onRsvpSubmit(this.selectedChoice);
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
        this.elements.rsvpSubmit.textContent = 'Envoi...';
      } else {
        this.elements.rsvpSubmit.textContent = 'Valider';
      }
    }
  }

  displayConfirmation(status) {
    const { confirmationTitle, confirmationText } = this.elements;
    if (status === 'PRESENT') {
      confirmationTitle.textContent = 'Merci pour votre réponse';
      confirmationText.innerHTML = `Votre présence a bien été enregistrée.<br>Nous avons hâte de partager ce moment avec vous.`;
    } else {
      confirmationTitle.textContent = 'Merci pour votre réponse';
      confirmationText.innerHTML = `Nous vous remercions de nous avoir prévenus<br>et pour vos douaas.`;
    }
  }

  computeRuntimeScale(vw, vh) {
    let targetWidthRatio = 0.58;
    if (vw < 600) {
      targetWidthRatio = 0.90;
    } else if (vw < 1024) {
      targetWidthRatio = 0.75;
    } else {
      targetWidthRatio = 0.58;
    }

    const targetWidth = vw * targetWidthRatio;
    const scaleByWidth = targetWidth / PHYSICAL_ENVELOPE.width;

    const maxAvailableHeight = vh * 0.58;
    const scaleByHeight = maxAvailableHeight / PHYSICAL_ENVELOPE.height;

    const maxScale = 1.15;
    return Math.min(scaleByWidth, scaleByHeight, maxScale);
  }

  updateResponsiveScale() {
    this.viewportWidth = window.innerWidth;
    this.viewportHeight = window.innerHeight;

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
    this.container.innerHTML = '';
  }
}
