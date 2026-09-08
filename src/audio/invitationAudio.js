/**
 * Gestionnaire audio pour l'expérience d'ouverture d'invitation Hanna
 * Morceau : "Lilet Elhena" (intro d'ouverture uniquement)
 * Arrêt en fondu à l'apparition finale de la carte (CARD_READY)
 */

import gsap from 'gsap';
import { AUDIO } from '../config/audio.js';

export class InvitationAudioManager {
  constructor({ onAvailabilityChange } = {}) {
    this.audio = null;
    this.isPlaying = false;
    this.isMuted = false;
    this.hasFadedOut = false;
    this.available = false;
    this.fadeTween = null;
    this.onAvailabilityChange = onAvailabilityChange;
    this.onMuteChange = null;

    this.initAudio();
  }

  initAudio() {
    try {
      this.audio = new Audio();
      this.audio.src = AUDIO.invitationMusic.src;
      this.audio.preload = 'auto';
      this.audio.loop = false;
      this.audio.volume = 0;

      this.audio.addEventListener('error', () => {
        this.available = false;
        if (this.onAvailabilityChange) {
          this.onAvailabilityChange(false);
        }
      });

      this.audio.addEventListener('canplaythrough', () => {
        this.available = true;
        if (this.onAvailabilityChange) {
          this.onAvailabilityChange(true);
        }
      });
    } catch (err) {
      console.warn('[Audio] Initialisation audio ignorée:', err);
    }
  }

  async checkAvailability() {
    if (typeof window === 'undefined') return false;
    try {
      const res = await fetch(AUDIO.invitationMusic.src, { method: 'HEAD' });
      this.available = res.ok;
    } catch (_) {
      this.available = false;
    }
    if (this.onAvailabilityChange) {
      this.onAvailabilityChange(this.available);
    }
    return this.available;
  }

  preload() {
    this.checkAvailability().then((ok) => {
      if (ok && this.audio) {
        try {
          this.audio.load();
        } catch (_) {}
      }
    });
  }

  /**
   * Démarre la musique immédiatement dans le call-stack du geste utilisateur (ex: pointerdown enveloppe)
   * Méthode la plus fiable sur iOS Safari et Chrome Mobile
   */
  start() {
    this.playOnUserGesture();
  }

  playOnUserGesture() {
    if (!this.available || !this.audio || this.isPlaying || this.hasFadedOut) return;

    try {
      const targetVolume = this.isMuted ? 0 : AUDIO.invitationMusic.volume;
      const playPromise = this.audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.isPlaying = true;
            if (this.fadeTween) this.fadeTween.kill();
            this.fadeTween = gsap.to(this.audio, {
              volume: targetVolume,
              duration: AUDIO.invitationMusic.fadeIn,
              ease: 'power1.out'
            });
          })
          .catch((err) => {
            console.warn('[Audio] Lecture rejetée:', err);
          });
      }
    } catch (err) {
      console.warn('[Audio] Erreur déclenchement sonore:', err);
    }
  }

  /**
   * Fade out progressif et arrêt (appelé à CARD_READY)
   * @param {number} duration Durée du fondu en secondes (défaut: 0.8s)
   */
  fadeOutAndStop(duration = AUDIO.invitationMusic.fadeOut) {
    if (!this.audio || !this.isPlaying || this.hasFadedOut) return;
    this.hasFadedOut = true;

    if (this.fadeTween) this.fadeTween.kill();

    this.fadeTween = gsap.to(this.audio, {
      volume: 0,
      duration: duration,
      ease: 'power2.out',
      onComplete: () => {
        this.stop();
      }
    });
  }

  stop() {
    if (!this.audio) return;
    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch (_) {}
    this.isPlaying = false;
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.audio) {
      if (this.isMuted) {
        this.audio.volume = 0;
      } else if (this.isPlaying && !this.hasFadedOut) {
        this.audio.volume = AUDIO.invitationMusic.volume;
      }
    }
    if (this.onMuteChange) {
      this.onMuteChange(this.isMuted);
    }
    return this.isMuted;
  }

  destroy() {
    if (this.fadeTween) {
      this.fadeTween.kill();
      this.fadeTween = null;
    }
    this.stop();
    this.audio = null;
  }
}
