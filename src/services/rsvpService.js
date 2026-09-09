/**
 * Service de gestion et soumission RSVP (Sans accompagnants)
 * Connecté au Web App Google Apps Script via import.meta.env.VITE_RSVP_ENDPOINT
 * Fallback local autorisé uniquement en environnement DEV (import.meta.env.DEV)
 */

export const RSVP_ENDPOINT = (import.meta.env.VITE_RSVP_ENDPOINT || '').trim();

/**
 * Récupère les données d'un invité via son code personnalisé
 * @param {string} code Code invité (ex: HN-XXXXXXXXXXXX)
 * @returns {Promise<{ ok: boolean, guest?: { firstName: string, rsvp: string|null }, error?: string }>}
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
          rsvp: null
        }
      };
    } catch (_) {
      return {
        ok: true,
        guest: {
          firstName: 'Invité Démo',
          rsvp: null
        }
      };
    }
  }

  // 3. En production sans endpoint configuré
  console.error('[rsvpService] VITE_RSVP_ENDPOINT n’est pas configuré sur cette instance.');
  return { ok: false, error: 'NO_ENDPOINT_CONFIGURED' };
}

/**
 * Soumet la réponse RSVP (PRESENT ou ABSENT)
 * @param {{ code: string, status: 'PRESENT'|'ABSENT', submittedAt?: string }} payload
 * @returns {Promise<{ ok: boolean, saved?: any, error?: string, message?: string }>}
 */
export async function submitRsvp(payload) {
  const code = (payload.code || '').trim();
  const status = payload.status;
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
        submittedAt
      };
      localStorage.setItem('hanna-rsvp', JSON.stringify(data));
      if (code) {
        localStorage.setItem(`hanna-guest-${code}`, JSON.stringify({
          firstName: 'Invité Démo',
          rsvp: status
        }));
      }
      return {
        ok: true,
        saved: { status }
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

/**
 * Soumission de démonstration sans code invité (ne persiste rien dans Google Sheets)
 * @returns {Promise<{ ok: boolean, demo: boolean }>}
 */
export async function submitDemoRsvp() {
  await new Promise((resolve) => setTimeout(resolve, 250));
  return {
    ok: true,
    demo: true
  };
}
