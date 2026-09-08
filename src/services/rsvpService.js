/**
 * Service de gestion et soumission RSVP
 * Préparé pour recevoir le webhook Google Apps Script (.gs) tout en offrant
 * un fallback local complet en mode MVP.
 */

// URL du webhook Google Apps Script (à renseigner lors du branchement Google Sheets)
export const RSVP_ENDPOINT = null;

/**
 * Contrat de données officiel du RSVP
 * @typedef {Object} RsvpPayload
 * @property {string} [firstName] - Prénom de l'invité
 * @property {'PRESENT'|'ABSENT'} status - Statut de présence
 * @property {string} submittedAt - Date ISO de soumission
 * @property {number} [partySize] - Nombre de personnes (évolutivité)
 * @property {string} [guestCode] - Code invité personnalisé
 * @property {string} [comment] - Message ou félicitations
 */

/**
 * Soumet la réponse RSVP (Google Apps Script ou fallback localStorage)
 * @param {RsvpPayload} payload
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function submitRsvp(payload) {
  const sanitizedPayload = {
    firstName: payload.firstName || '',
    status: payload.status,
    submittedAt: payload.submittedAt || new Date().toISOString(),
    partySize: payload.partySize || 1,
    guestCode: payload.guestCode || '',
    comment: payload.comment || ''
  };

  if (!sanitizedPayload.status || (sanitizedPayload.status !== 'PRESENT' && sanitizedPayload.status !== 'ABSENT')) {
    return { success: false, error: 'Statut de présence invalide.' };
  }

  // Si un endpoint Google Apps Script est configuré
  if (RSVP_ENDPOINT) {
    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          data: JSON.stringify(sanitizedPayload)
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return { success: true, data: result };
    } catch (err) {
      console.error('[rsvpService] Erreur lors de la soumission Apps Script:', err);
      return { success: false, error: 'Une erreur réseau est survenue. Merci de réessayer.' };
    }
  }

  // Mode MVP / Fallback local (localStorage)
  try {
    localStorage.setItem('hanna-rsvp', JSON.stringify(sanitizedPayload));
    return { success: true, data: sanitizedPayload };
  } catch (err) {
    console.error('[rsvpService] Erreur localStorage:', err);
    return { success: false, error: 'Impossible de sauvegarder la réponse localement.' };
  }
}

/**
 * Récupère la réponse RSVP enregistrée localement
 * @returns {RsvpPayload|null}
 */
export function getStoredRsvp() {
  try {
    const raw = localStorage.getItem('hanna-rsvp');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
