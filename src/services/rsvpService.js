/**
 * Service RSVP simplifié — Hanna
 * Envoi direct en POST JSON (text/plain) vers Google Apps Script
 * Endpoint configuré via import.meta.env.VITE_RSVP_ENDPOINT
 */

export const RSVP_ENDPOINT = (import.meta.env.VITE_RSVP_ENDPOINT || '').trim();

/**
 * Soumet la réponse RSVP (Prénom, Email, Présence)
 * @param {{ firstName: string, email: string, status: 'PRESENT'|'ABSENT' }} payload
 * @returns {Promise<{ success: boolean, error?: string, message?: string }>}
 */
export async function submitRsvp(payload) {
  const firstName = (payload.firstName || '').trim();
  const email = (payload.email || '').trim();
  const status = payload.status;
  const attendance = status === 'PRESENT' ? 'oui' : 'non';

  if (!firstName) {
    return { success: false, message: 'Merci de renseigner votre prénom.' };
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email)) {
    return { success: false, message: 'Merci de renseigner une adresse e-mail valide.' };
  }

  if (status !== 'PRESENT' && status !== 'ABSENT') {
    return { success: false, message: 'Merci de sélectionner une réponse.' };
  }

  // 1. Envoi réel vers le Web App Google Apps Script si configuré
  if (RSVP_ENDPOINT) {
    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify({
          firstName,
          email,
          attendance
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('[rsvpService] Erreur lors de l’envoi Apps Script:', err);
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: 'Une erreur de connexion est survenue. Merci de réessayer.'
      };
    }
  }

  // 2. Fallback développement local (uniquement en DEV sans endpoint)
  if (import.meta.env.DEV) {
    await new Promise((resolve) => setTimeout(resolve, 300));
    try {
      const stored = {
        firstName,
        email,
        attendance,
        savedAt: new Date().toISOString()
      };
      localStorage.setItem('hanna-rsvp', JSON.stringify(stored));
      return { success: true };
    } catch (_) {
      return { success: true };
    }
  }

  // 3. En production si aucun endpoint n'est configuré
  console.error('[rsvpService] VITE_RSVP_ENDPOINT non configuré.');
  return {
    success: false,
    error: 'NO_ENDPOINT_CONFIGURED',
    message: 'Le service de réponse n’est pas configuré pour le moment.'
  };
}
