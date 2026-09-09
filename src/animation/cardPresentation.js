/**
 * Animation de Présentation Continue de la Carte d'Invitation (CARD_PRESENTING -> CARD_READY)
 * 
 * Assure un passage 100% continu et fluide entre la fin de l'extraction et la taille finale.
 * Mesure la bounding box réelle de la carte à la libération, passe en position fixed
 * sans le moindre saut visuel, puis anime vers targetRect calculé via visualViewport.
 */

import gsap from 'gsap';
import { EXPERIENCE_STATE } from '../experience/experienceState.js';
import { computeFinalCardRect, getVisualViewportRect } from '../utils/visualViewport.js';

export class CardPresentationAnimation {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.tween = null;
  }

  play({ onComplete } = {}) {
    this.kill();

    const { 
      card, 
      cardCanvas,
      openScene, 
      openBackground, 
      openForeground, 
      addressHotspot, 
      routeButton,
      rsvpOverlay,
      fullscreenPage
    } = this.scene.elements;

    if (!card) {
      if (onComplete) onComplete();
      return;
    }

    this.stateManager.setState(EXPERIENCE_STATE.CARD_PRESENTING);

    // 1. Mesure exacte de la bounding box actuelle de la carte avant déplacement
    const startRect = card.getBoundingClientRect();

    // 2. Visual Viewport courant
    const vv = getVisualViewportRect();

    // 3. Calcul de la cible plein écran (largeur 100% sur mobile 390×844)
    const targetRect = computeFinalCardRect();

    // 4. Préparation de la page plein écran (#F7F4EC)
    const pageContainer = fullscreenPage || document.getElementById('invitation-fullscreen-page') || document.body;
    pageContainer.style.display = 'block';
    pageContainer.style.position = 'fixed';
    pageContainer.style.left = `${vv.offsetLeft}px`;
    pageContainer.style.top = `${vv.offsetTop}px`;
    pageContainer.style.width = `${vv.width}px`;
    pageContainer.style.height = `${vv.height}px`;
    pageContainer.style.zIndex = '500';
    pageContainer.style.overflowY = 'auto';
    pageContainer.style.overflowX = 'hidden';
    pageContainer.style.webkitOverflowScrolling = 'touch';
    pageContainer.scrollTop = 0;

    // Déplacer la carte dans le conteneur plein écran
    pageContainer.appendChild(card);

    // Coordonnées de départ relatives à la page plein écran (0 saut visuel)
    const startX = startRect.left - vv.offsetLeft;
    const startY = startRect.top - vv.offsetTop;

    gsap.set(card, {
      position: 'absolute',
      left: startX,
      top: startY,
      width: startRect.width,
      height: startRect.height,
      x: 0,
      y: 0,
      margin: 0,
      rotation: 0,
      scale: 1,
      borderRadius: '4px',
      boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08)',
      transform: 'none'
    });

    if (cardCanvas) {
      cardCanvas.style.width = '100%';
      cardCanvas.style.height = '100%';
    }

    // 5. Fondu progressif du fond de la page plein écran (sans flash)
    gsap.fromTo(pageContainer, 
      { backgroundColor: 'rgba(247, 244, 236, 0)' }, 
      { backgroundColor: 'rgba(247, 244, 236, 1)', duration: 0.85, ease: 'power2.inOut' }
    );

    // Disparition douce en parallèle des faces de l'enveloppe
    const envelopeElements = [openBackground, openForeground].filter(Boolean);
    if (envelopeElements.length > 0) {
      gsap.to(envelopeElements, {
        y: '+=40',
        scale: 0.96,
        opacity: 0,
        duration: 0.70,
        ease: 'power2.inOut',
        onComplete: () => {
          envelopeElements.forEach((el) => {
            el.style.display = 'none';
          });
        }
      });
    }

    // 6. Animation continue et progressive (1.20s, power3.inOut) vers la page plein écran
    const targetX = targetRect.left - vv.offsetLeft;
    const targetY = targetRect.top - vv.offsetTop;

    const animObj = {
      left: startX,
      top: startY,
      width: startRect.width,
      height: startRect.height,
      borderRadius: 4,
      shadowOpacity: 0.08
    };

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = isReduced ? 0.4 : 1.20;

    this.tween = gsap.to(animObj, {
      left: targetX,
      top: targetY,
      width: targetRect.width,
      height: targetRect.height,
      borderRadius: 0,
      shadowOpacity: 0,
      duration: duration,
      ease: 'power3.inOut',
      onUpdate: () => {
        gsap.set(card, {
          left: animObj.left,
          top: animObj.top,
          width: animObj.width,
          height: animObj.height,
          borderRadius: `${animObj.borderRadius}px`,
          boxShadow: `0 10px 30px rgba(0, 0, 0, ${animObj.shadowOpacity})`
        });
      },
      onComplete: () => {
        // Enregistrement de la position finale pour le responsive resize
        this.scene.setFinalCardGeometry(targetRect);

        // Transition vers CARD_READY
        this.stateManager.setState(EXPERIENCE_STATE.CARD_READY);
        if (this.scene.setCardReady) {
          this.scene.setCardReady();
        }

        // Suppression définitive de tout look de carte flottante
        card.style.borderRadius = '0';
        card.style.boxShadow = 'none';

        // Position de scroll initiale en haut
        pageContainer.scrollTop = 0;

        // Activation du hotspot d'adresse invisible
        if (addressHotspot) {
          addressHotspot.style.pointerEvents = 'auto';
        }

        // Révélation du bouton Itinéraire visible
        if (routeButton) {
          gsap.to(routeButton, {
            opacity: 1,
            duration: 0.35,
            ease: 'power1.out',
            onStart: () => {
              routeButton.style.pointerEvents = 'auto';
            }
          });
        }

        // Révélation élégante du formulaire RSVP
        if (rsvpOverlay) {
          gsap.to(rsvpOverlay, {
            opacity: 1,
            duration: 0.35,
            ease: 'power1.out',
            onStart: () => {
              rsvpOverlay.style.pointerEvents = 'auto';
            },
            onComplete: () => {
              if (onComplete) onComplete();
            }
          });
        } else {
          if (onComplete) onComplete();
        }
      }
    });
  }

  kill() {
    if (this.tween) {
      this.tween.kill();
      this.tween = null;
    }
  }
}
