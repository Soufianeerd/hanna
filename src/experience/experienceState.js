/**
 * Modèle d'états complet de l'expérience Hanna (MVP)
 */

export const EXPERIENCE_STATE = {
  LOADING: 'LOADING',
  ENVELOPE_ENTERING: 'ENVELOPE_ENTERING',
  ENVELOPE_SETTLING: 'ENVELOPE_SETTLING',
  ENVELOPE_IDLE: 'ENVELOPE_IDLE',
  ENVELOPE_TURNING: 'ENVELOPE_TURNING',
  ENVELOPE_BACK_READY: 'ENVELOPE_BACK_READY',
  SEAL_OPENING: 'SEAL_OPENING',
  OPEN_ENVELOPE_READY: 'OPEN_ENVELOPE_READY',
  CARD_EXTRACTING: 'CARD_EXTRACTING',
  CARD_READY: 'CARD_READY',
  RSVP_SUBMITTING: 'RSVP_SUBMITTING',
  RSVP_SUCCESS: 'RSVP_SUCCESS',
  CARD_SENDING: 'CARD_SENDING',
  COMPLETED: 'COMPLETED'
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
