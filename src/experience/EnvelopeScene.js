/**
 * EnvelopeScene — Hiérarchie DOM complète et gestion des calques
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
 * │           ├── OpenEnvelopeBack (old-envelope-open.png, z-index 10)
 * │           ├── CardRasterLayer (carteInvitation.png pour l'extraction P12->P26, z-index 20 -> 50)
 * │           ├── PocketLayer (old-envelope-pocket.png, z-index 30)
 * │           └── InteractiveInvitationCard (Carte HTML/CSS interactive complète, z-index 60)
 * │
 * └── ConfirmationMessage (Message final Quiet Luxury après envoi)
 */

import { ASSETS } from '../config/assets.js';
import { GEOMETRY, OPEN_ENVELOPE_GEOMETRY, PDF_CARD_POSES, PHYSICAL_ENVELOPE } from '../config/geometry.js';
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
              <!-- Fond enveloppe ouverte avec rabat supérieur -->
              <div class="open-envelope-layer" id="open-envelope-layer">
                <img class="open-envelope-img" src="${ASSETS.envelopeOpenReference.src}" alt="Fond enveloppe ouverte" />
              </div>

              <!-- Carte Raster pour l'extraction fidèle du PDF (P12 -> P26) -->
              <div class="card-raster-layer" id="card-raster-layer">
                <img class="card-raster-img" src="${ASSETS.invitationCard.src}" alt="Carte d'invitation" />
              </div>

              <!-- Poche avant (masque physique inférieur parfaitement aligné sur le corps) -->
              <div class="pocket-layer" id="pocket-layer">
                <img class="pocket-img" src="${ASSETS.envelopePocket.src}" alt="Poche avant enveloppe" />
              </div>

              <!-- 3. Carte Interactive reconstruite en HTML/CSS (active à CARD_READY) -->
              <div class="interactive-invitation-card" id="interactive-invitation-card">
                <!-- Décorations visuelles extraites de carteInvitation.png -->
                <div class="decor-layer" aria-hidden="true">
                  <img class="interactive-decor-top" src="${ASSETS.invitationCard.src}" alt="" />
                  <img class="interactive-decor-tassels" src="${ASSETS.invitationCard.src}" alt="" />
                  <img class="interactive-decor-table" src="${ASSETS.invitationCard.src}" alt="" />
                  <img class="interactive-decor-bottom-right" src="${ASSETS.invitationCard.src}" alt="" />
                </div>

                <!-- Contenu typographique et interactif -->
                <div class="interactive-card-content">
                  <div class="card-bismillah">بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ</div>
                  <div class="card-welcome">MARHABABIKOUM TO</div>
                  <div class="card-main-title">Salma's Henna Day</div>

                  <div class="card-date-container">
                    <div class="card-date-line"></div>
                    <div class="card-date-row">
                      <span class="date-day">MERCREDI</span>
                      <span class="date-num">21</span>
                      <span class="date-month">OCTOBRE</span>
                    </div>
                    <div class="card-date-line"></div>
                  </div>

                  <div class="card-time">À PARTIR DE 18H30</div>

                  <!-- Bloc adresse entièrement cliquable vers Google Maps -->
                  <a class="card-venue-block" 
                     href="https://www.google.com/maps/search/?api=1&query=${mapsQuery}" 
                     target="_blank" 
                     rel="noopener noreferrer" 
                     aria-label="Ouvrir l’itinéraire vers la salle sur Google Maps">
                    <div class="venue-title">LA SALLE DES FÊTES</div>
                    <div class="venue-subtitle">MAURICE GÉRARDIN DE DOMMARTIN-LÈS-TOUL</div>
                    <div class="venue-street">All. de l’Île des Sables,<br>54200 Dommartin-lès-Toul</div>
                    <div class="venue-itinerary-hint">Voir l'itinéraire ↗</div>
                  </a>

                  <!-- Ligne séparatrice délicate -->
                  <div class="card-soft-separator"></div>

                  <!-- Formulaire RSVP intégré dans la composition -->
                  <div class="card-integrated-rsvp" id="card-integrated-rsvp">
                    <div class="rsvp-top-label">RSVP</div>
                    <div class="rsvp-prompt-text">Serez-vous présent(e) ?</div>

                    <div class="rsvp-buttons-group" role="group" aria-label="Présence à l'événement">
                      <button type="button" class="rsvp-choice-btn" data-choice="PRESENT" aria-pressed="false">
                        Présent(e)
                      </button>
                      <button type="button" class="rsvp-choice-btn" data-choice="ABSENT" aria-pressed="false">
                        Absent(e)
                      </button>
                    </div>

                    <button type="button" class="rsvp-validate-btn" id="rsvp-validate-btn">
                      Valider ma réponse
                    </button>

                    <div class="rsvp-status-message" id="rsvp-status-message" aria-live="polite"></div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        </div>

        <!-- 4. Message de confirmation final après envoi -->
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
      openEnvelope: this.container.querySelector('#open-envelope-layer'),
      card: this.container.querySelector('#card-raster-layer'),
      pocket: this.container.querySelector('#pocket-layer'),
      interactiveCard: this.container.querySelector('#interactive-invitation-card'),

      // RSVP & Confirmation
      rsvpSubmit: this.container.querySelector('#rsvp-validate-btn'),
      rsvpStatusMsg: this.container.querySelector('#rsvp-status-message'),
      rsvpOptionBtns: this.container.querySelectorAll('.rsvp-choice-btn'),
      confirmationMessage: this.container.querySelector('#confirmation-message'),
      confirmationTitle: this.container.querySelector('#confirmation-title'),
      confirmationText: this.container.querySelector('#confirmation-text')
    };
  }

  applyCalibratedGeometry() {
    const { object3D, frontFace, backFace, seal, openEnvelope, card, pocket, interactiveCard } = this.elements;
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

    // OPEN ENVELOPE BACK (calibré rigoureusement sur le même corps 820 × 490, bottom=+245)
    openEnvelope.style.width = `${openGeom.openBack.width}px`;
    openEnvelope.style.height = `${openGeom.openBack.height}px`;
    openEnvelope.style.marginLeft = `${-openGeom.openBack.width / 2}px`;
    openEnvelope.style.marginTop = `${-openGeom.openBack.height / 2}px`;
    openEnvelope.style.transform = `translate3d(${openGeom.openBack.x}px, ${openGeom.openBack.y}px, 0)`;

    // POCKET (calibré rigoureusement sur le même corps 820 × 490, bottom=+245)
    pocket.style.width = `${openGeom.pocket.width}px`;
    pocket.style.height = `${openGeom.pocket.height}px`;
    pocket.style.marginLeft = `${-openGeom.pocket.width / 2}px`;
    pocket.style.marginTop = `${-openGeom.pocket.height / 2}px`;
    pocket.style.transform = `translate3d(${openGeom.pocket.x}px, ${openGeom.pocket.y}px, 0)`;

    // CARD RASTER (320 × 568.59, position initiale P12)
    card.style.width = `${cardGeom.width}px`;
    card.style.height = `${cardGeom.height}px`;
    card.style.marginLeft = `${-cardGeom.width / 2}px`;
    card.style.marginTop = `${-cardGeom.height / 2}px`;
    const p12 = PDF_CARD_POSES.P12;
    card.style.transform = `translate3d(${p12.x}px, ${p12.y}px, 0) rotate(${p12.rotation}deg) scale(${p12.scale})`;

    // INTERACTIVE INVITATION CARD (dimensions finales P26 : 320*1.30 = 416px par 739.17px)
    const cardFinalW = cardGeom.width * PDF_CARD_POSES.P26.scale;
    const cardFinalH = cardGeom.height * PDF_CARD_POSES.P26.scale;
    interactiveCard.style.width = `${cardFinalW}px`;
    interactiveCard.style.height = `${cardFinalH}px`;
    interactiveCard.style.marginLeft = `${-cardFinalW / 2}px`;
    interactiveCard.style.marginTop = `${-cardFinalH / 2}px`;
    interactiveCard.style.transform = `translate3d(0px, 0px, 0px)`;
  }

  setupInteractions() {
    // 1. Clic sur l'enveloppe
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
        this.elements.rsvpSubmit.textContent = 'Envoi en cours...';
      } else {
        this.elements.rsvpSubmit.textContent = 'Valider ma réponse';
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
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
