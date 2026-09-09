/**
 * Service RSVP simplifié — Hanna
 * Envoi direct en POST JSON (text/plain) vers Google Apps Script
 * Endpoint production réel configuré avec fallback env
 */

const PRODUCTION_ENDPOINT = 'https://script.google.com/macros/s/AKfycbzOjyqLuUQpsaqMTEEZ2h-WPsuTJFPl_f_K9OxQlQ7mYBonpdoPjOZg0hj9f-wMgVrb/exec';

const RSVP_ENDPOINT =
  import.meta.env.VITE_RSVP_ENDPOINT?.trim()
  || PRODUCTION_ENDPOINT;

export { RSVP_ENDPOINT };

/**
 * Soumet la réponse RSVP (Prénom, Nom, Email, Présence)
 * @param {{ firstName: string, lastName: string, email: string, status: 'PRESENT'|'ABSENT' }} payload
 * @returns {Promise<{ success: boolean, error?: string, message?: string }>}
 */
export async function submitRsvp({
  firstName,
  lastName,
  email,
  status
}) {
  const attendance =
    status === 'PRESENT'
      ? 'oui'
      : 'non';

  const response = await fetch(
    RSVP_ENDPOINT,
    {
      method: 'POST',
      headers: {
        'Content-Type':
          'text/plain;charset=utf-8'
      },
      body: JSON.stringify({
        firstName:
          firstName.trim(),
        lastName:
          lastName.trim(),
        email:
          email.trim().toLowerCase(),
        attendance
      })
    }
  );

  const result =
    await response.json();

  if (!result.success) {
    throw new Error(
      result.error ||
      'Impossible d’enregistrer la réponse.'
    );
  }

  return result;
}
