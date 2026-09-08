/**
 * Service de gestion et soumission RSVP
 * Connecté au Web App Google Apps Script via import.meta.env.VITE_RSVP_ENDPOINT
 * Fallback local autorisé uniquement en environnement DEV (import.meta.env.DEV)
 */

export const RSVP_ENDPOINT = (import.meta.env.VITE_RSVP_ENDPOINT || '').trim();

/**
 * Récupère les données d'un invité via son code personnalisé
 * @param {string} code Code invité (ex: HN-XXXXXXXXXXXX)
 * @returns {Promise<{ ok: boolean, guest?: { firstName: string, maxPartySize: number, rsvp: string|null, partySize: number }, error?: string }>}
 */
export async function getGuest(code) {
  const sanitizedCode = (code || '').trim();
  if (!sanitizedCode) {
    return { ok: false, error: 'CODE_MISSING' };
  }

  // 1. Appel au Web App Google Apps Script si configuré
  if (RSVP_ENDPOINT) {
    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          action: 'getGuest',
          data: JSON.stringify({ code: sanitizedCode })
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('[rsvpService] Erreur lors de la récupération de l’invité:', err);
      return { ok: false, error: 'NETWORK_ERROR' };
    }
  }

  // 2. Fallback développement local uniquement
  if (import.meta.env.DEV) {
    try {
      const raw = localStorage.getItem(`hanna-guest-${sanitizedCode}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ok: true, guest: parsed };
      }
      return {
        ok: true,
        guest: {
          firstName: 'Invité Démo',
          maxPartySize: 4,
          rsvp: null,
          partySize: 1
        }
      };
    } catch (_) {
      return {
        ok: true,
        guest: {
          firstName: 'Invité Démo',
          maxPartySize: 4,
          rsvp: null,
          partySize: 1
        }
      };
    }
  }

  // 3. En production sans endpoint configuré
  console.error('[rsvpService] VITE_RSVP_ENDPOINT n’est pas configuré sur cette instance.');
  return { ok: false, error: 'NO_ENDPOINT_CONFIGURED' };
}

/**
 * Soumet la réponse RSVP
 * @param {{ code: string, status: 'PRESENT'|'ABSENT', partySize: number, submittedAt?: string }} payload
 * @returns {Promise<{ ok: boolean, saved?: any, error?: string, message?: string }>}
 */
export async function submitRsvp(payload) {
  const code = (payload.code || '').trim();
  const status = payload.status;
  const partySize = status === 'ABSENT' ? 0 : Math.max(1, parseInt(payload.partySize, 10) || 1);
  const submittedAt = payload.submittedAt || new Date().toISOString();

  if (status !== 'PRESENT' && status !== 'ABSENT') {
    return { ok: false, error: 'INVALID_STATUS', message: 'Veuillez choisir Présent(e) ou Absent(e).' };
  }

  // 1. Envoi vers le Web App Google Apps Script
  if (RSVP_ENDPOINT) {
    try {
      const response = await fetch(RSVP_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          action: 'saveRsvp',
          data: JSON.stringify({
            code,
            status,
            partySize,
            submittedAt
          })
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (err) {
      console.error('[rsvpService] Erreur lors de l’enregistrement Apps Script:', err);
      return {
        ok: false,
        error: 'NETWORK_ERROR',
        message: 'Une erreur de connexion est survenue. Merci de réessayer.'
      };
    }
  }

  // 2. Fallback développement local (uniquement en DEV)
  if (import.meta.env.DEV) {
    try {
      const data = {
        code,
        status,
        partySize,
        submittedAt
      };
      localStorage.setItem('hanna-rsvp', JSON.stringify(data));
      if (code) {
        localStorage.setItem(`hanna-guest-${code}`, JSON.stringify({
          firstName: 'Invité Démo',
          maxPartySize: 4,
          rsvp: status,
          partySize: partySize
        }));
      }
      return {
        ok: true,
        saved: { status, partySize }
      };
    } catch (err) {
      return { ok: false, error: 'LOCAL_STORAGE_ERROR' };
    }
  }

  // 3. En production si aucun endpoint n'est configuré
  console.error('[rsvpService] VITE_RSVP_ENDPOINT non configuré en production.');
  return {
    ok: false,
    error: 'NO_ENDPOINT_CONFIGURED',
    message: 'Le service de réponse en ligne n’est pas disponible pour le moment.'
  };
}
