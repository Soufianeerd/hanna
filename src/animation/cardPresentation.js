/**
 * Animation de Présentation Continue de la Carte d'Invitation (CARD_PRESENTING -> CARD_READY)
 * 
 * Assure un passage 100% continu et fluide entre la fin de l'extraction et la taille finale.
 * Mesure la bounding box réelle de la carte à la libération, passe en position fixed
 * sans le moindre saut visuel, puis anime vers targetRect calculé via visualViewport.
 */

import gsap from 'gsap';
import { EXPERIENCE_STATE } from '../experience/experienceState.js';
import { computeFinalCardRect } from '../utils/visualViewport.js';

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
      rsvpOverlay 
    } = this.scene.elements;

    if (!card) {
      if (onComplete) onComplete();
      return;
    }

    this.stateManager.setState(EXPERIENCE_STATE.CARD_PRESENTING);

    // 1. Mesure exacte de la position et de la dimension courantes de la carte
    const startRect = card.getBoundingClientRect();

    // 2. Calcul de la cible optimale basée sur le visualViewport (garantit 0 rognage sur Safari iOS)
    const targetRect = computeFinalCardRect();

    // 3. Déplacer la carte vers le viewport racine pour garantir que position: fixed
    // soit strictement relative à la fenêtre globale sans subir de transform parente
    const viewport = this.scene.elements.viewport || document.getElementById('experience-viewport') || document.body;
    viewport.appendChild(card);

    // 4. Bascule instantanée en position fixed aux coordonnées exactes (0 saut visuel)
    gsap.set(card, {
      position: 'fixed',
      left: startRect.left,
      top: startRect.top,
      width: startRect.width,
      height: startRect.height,
      x: 0,
      y: 0,
      margin: 0,
      rotation: 0,
      scale: 1,
      zIndex: 500,
      transform: 'none'
    });

    if (cardCanvas) {
      cardCanvas.style.width = '100%';
      cardCanvas.style.height = '100%';
    }

    // 5. Disparition fluide en parallèle des faces de l'enveloppe
    const envelopeElements = [openBackground, openForeground].filter(Boolean);
    if (envelopeElements.length > 0) {
      gsap.to(envelopeElements, {
        y: '+=45',
        scale: 0.94,
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

    // 5. Animation continue et progressive de la carte vers sa géométrie finale
    const animObj = {
      left: startRect.left,
      top: startRect.top,
      width: startRect.width,
      height: startRect.height
    };

    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = isReduced ? 0.4 : 1.05;

    this.tween = gsap.to(animObj, {
      left: targetRect.left,
      top: targetRect.top,
      width: targetRect.width,
      height: targetRect.height,
      duration: duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        gsap.set(card, {
          left: animObj.left,
          top: animObj.top,
          width: animObj.width,
          height: animObj.height
        });
      },
      onComplete: () => {
        // Enregistrement de la position finale pour le responsive resize
        this.scene.setFinalCardGeometry(targetRect);

        // Transition vers CARD_READY uniquement maintenant
        this.stateManager.setState(EXPERIENCE_STATE.CARD_READY);
        if (this.scene.setCardReady) {
          this.scene.setCardReady();
        }

        // Activation du hotspot d'adresse
        if (addressHotspot) {
          addressHotspot.style.pointerEvents = 'auto';
        }

        // Révélation élégante du RSVP
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
