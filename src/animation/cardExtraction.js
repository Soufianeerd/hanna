/**
 * Animation d'extraction continue de la carte d'invitation (3.0s, sans zigzag)
 * Utilise un tween unique de progression (progress 0 -> 1) et l'interpolateur continu.
 * L'enveloppe recule vers le bas (y: +50px, scale: 0.94, opacity: 0) dès que la carte est libérée.
 * La carte originale carteInvitation.png reste intacte et visible au centre.
 */

import gsap from 'gsap';
import { sampleCardPose } from './cardPoseInterpolator.js';
import { MOTION } from '../config/motion.js';
import { EXPERIENCE_STATE } from '../experience/experienceState.js';

export class CardExtractionAnimation {
  constructor(scene, stateManager) {
    this.scene = scene;
    this.stateManager = stateManager;
    this.timeline = null;
  }

  play({ onCardReady } = {}) {
    this.kill();

    const { 
      card, 
      cardClippingLayer, 
      openScene, 
      openBackground, 
      openForeground, 
      shadow, 
      addressHotspot, 
      rsvpOverlay 
    } = this.scene.elements;

    const cfg = MOTION.extraction;
    const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    this.stateManager.setState(EXPERIENCE_STATE.CARD_EXTRACTING);

    const extractionProgress = { value: 0 };
    let isFreedTriggered = false;

    this.timeline = gsap.timeline();

    const duration = isReduced ? 1.2 : cfg.duration; // 3.0s

    // 1. Tween unique de progression continue
    this.timeline.to(extractionProgress, {
      value: 1,
      duration: duration,
      ease: cfg.ease,
      onUpdate: () => {
        const pose = sampleCardPose(extractionProgress.value);

        if (card) {
          gsap.set(card, {
            x: pose.x,
            y: pose.y,
            rotation: pose.rotation,
            scale: pose.scale
          });
        }

        // Seuil de libération physique à progress >= 0.82
        if (pose.isFreed && !isFreedTriggered) {
          isFreedTriggered = true;

          // A. La carte passe au premier plan au-dessus du foreground
          if (card) {
            card.style.zIndex = '50';
          }
          if (cardClippingLayer) {
            cardClippingLayer.style.clipPath = 'none';
          }

          // B. L'enveloppe entière recule vers le bas et s'efface en douceur
          const envelopeLayers = [openBackground, openForeground].filter(Boolean);
          if (envelopeLayers.length > 0) {
            gsap.to(envelopeLayers, {
              y: cfg.envelopeFadeY,        // +50px
              scale: cfg.envelopeFadeScale, // 0.94
              opacity: 0,
              duration: cfg.envelopeFadeDuration, // 0.65s
              ease: 'power2.inOut',
              onComplete: () => {
                envelopeLayers.forEach((el) => {
                  el.style.display = 'none';
                });
              }
            });
          }

          if (shadow) {
            gsap.to(shadow, {
              opacity: 0,
              duration: cfg.envelopeFadeDuration,
              ease: 'power2.out',
              onComplete: () => {
                shadow.style.display = 'none';
              }
            });
          }
        }
      }
    });

    // 2. Fin d'extraction : la carte originale est centrée et prête pour l'interaction
    this.timeline.add(() => {
      this.stateManager.setState(EXPERIENCE_STATE.CARD_READY);
      if (this.scene.setCardReady) {
        this.scene.setCardReady();
      }

      // Activation du hotspot de l'adresse
      if (addressHotspot) {
        addressHotspot.style.pointerEvents = 'auto';
      }

      // Apparition délicate du RSVP transparent sur le papier
      if (rsvpOverlay) {
        gsap.to(rsvpOverlay, {
          opacity: 1,
          duration: 0.35,
          ease: 'power1.out',
          onStart: () => {
            rsvpOverlay.style.pointerEvents = 'auto';
          },
          onComplete: () => {
            if (onCardReady) onCardReady();
          }
        });
      } else {
        if (onCardReady) onCardReady();
      }
    });
  }

  kill() {
    if (this.timeline) {
      this.timeline.kill();
      this.timeline = null;
    }
  }
}
