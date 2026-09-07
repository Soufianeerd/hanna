/**
 * Modèle d'états de l'expérience Hanna — Phase 2
 */

export const EXPERIENCE_STATE = {
  LOADING: 'LOADING',
  ENVELOPE_ENTERING: 'ENVELOPE_ENTERING',
  ENVELOPE_SETTLING: 'ENVELOPE_SETTLING',
  ENVELOPE_IDLE: 'ENVELOPE_IDLE',

  // Réservé pour la Phase 3 (non actif en Phase 2)
  ENVELOPE_TURNING: 'ENVELOPE_TURNING'
};

export class ExperienceStateManager {
  constructor(initialState = EXPERIENCE_STATE.LOADING) {
    this.currentState = initialState;
    this.listeners = new Set();
  }

  getState() {
    return this.currentState;
  }

  is(state) {
    return this.currentState === state;
  }

  setState(newState) {
    if (this.currentState === newState) return;
    const oldState = this.currentState;
    this.currentState = newState;

    for (const listener of this.listeners) {
      try {
        listener(newState, oldState);
      } catch (err) {
        console.error('[ExperienceStateManager] Error in state listener:', err);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  destroy() {
    this.listeners.clear();
  }
}
