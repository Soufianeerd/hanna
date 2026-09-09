/**
 * Animation d'envoi de la carte vers le haut et apparition du message de confirmation
 */

import gsap from 'gsap';
import { MOTION } from '../config/motion.js';
import { EXPERIENCE_STATE } from '../experience/experienceState.js';

export class CardSendAnimation {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.timeline = null;
  }

  play({ onComplete } = {}) {
    this.kill();

    const targetCard = this.scene.elements.card;
    const { rsvpOverlay, routeButton, fullscreenPage, confirmationMessage } = this.scene.elements;
    const cfg = MOTION.cardSend;
    const confCfg = MOTION.confirmation;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.timeline = gsap.timeline({
      onComplete: () => {
        this.stateManager.setState(EXPERIENCE_STATE.COMPLETED);
        if (onComplete) onComplete();
      }
    });

    // 1. Disparition rapide des boutons d'interaction (RSVP + Itinéraire)
    const interactiveOverlays = [rsvpOverlay, routeButton].filter(Boolean);
    if (interactiveOverlays.length > 0) {
      this.timeline.to(interactiveOverlays, {
        opacity: 0,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => {
          interactiveOverlays.forEach((el) => {
            el.style.display = 'none';
          });
        }
      }, 0);
    }

    this.timeline.add(() => {
      this.stateManager.setState(EXPERIENCE_STATE.CARD_SENDING);
    });

    if (isReduced) {
      // Reduced motion : fade-out sobre vers le haut
      this.timeline.to(targetCard, {
        y: -60,
        opacity: 0,
        duration: 0.5,
        ease: 'power2.out',
        onComplete: () => {
          if (targetCard) targetCard.style.display = 'none';
          if (fullscreenPage) fullscreenPage.style.display = 'none';
        }
      });
    } else {
      // 2. Petite anticipation physique
      this.timeline.to(targetCard, {
        y: `+=${cfg.anticipationY}`,
        scale: `*=${cfg.anticipationScale}`,
        duration: cfg.anticipationDuration,
        ease: cfg.anticipationEase
      });

      // 3. Départ gracieux vers le haut
      this.timeline.to(targetCard, {
        y: cfg.departureY,
        duration: cfg.departureDuration,
        ease: cfg.departureEase
      });

      // Opacité maintenue jusqu'aux derniers 15% de l'envol
      this.timeline.to(targetCard, {
        opacity: 0,
        duration: cfg.departureDuration * 0.15,
        ease: 'power1.in',
        onComplete: () => {
          if (targetCard) targetCard.style.display = 'none';
          if (fullscreenPage) fullscreenPage.style.display = 'none';
        }
      }, `-=${cfg.departureDuration * 0.15}`);
    }

    // 4. Pause puis apparition élégante du message de confirmation
    this.timeline.to({}, { duration: confCfg.delay });

    if (confirmationMessage) {
      this.timeline.add(() => {
        confirmationMessage.style.display = 'flex';
      });

      this.timeline.fromTo(confirmationMessage, 
        { opacity: 0, y: confCfg.yFrom },
        {
          opacity: 1,
          y: 0,
          duration: confCfg.duration,
          ease: confCfg.ease
        }
      );
    }
  }

  kill() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }
}
