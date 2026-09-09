/**
 * ============================================================================
 * HANNA — GOOGLE APPS SCRIPT BACKEND RSVP & EMAIL NOTIFICATIONS
 * Compte officiel : Hamidi.salma54@gmail.com
 * Site Netlify : https://hannasalma.netlify.app/
 * ============================================================================
 */

const CONFIG = {
  SHEET_NAME: 'RSVP',
  ADMIN_EMAIL: 'Hamidi.salma54@gmail.com',
  EVENT_TITLE: "Hanna — Salma's Henna Day",
  EVENT_DATE: 'Mercredi 21 Octobre à partir de 18H',
  EVENT_LOCATION: "La Salle des Fêtes Maurice Gérardin de Dommartin-lès-Toul, Allée de l'Île des Sables, 54200 Dommartin-lès-Toul"
};

const HEADERS = ['DATE', 'PRENOM', 'EMAIL', 'PRESENCE'];

/**
 * Initialisation idempotente de la feuille
 */
function setupHanna() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME, 0);
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);

  const headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
  headerRange.setBackground('#155039')
             .setFontColor('#F7F4EC')
             .setFontWeight('bold')
             .setFontFamily('Georgia')
             .setFontSize(11)
             .setHorizontalAlignment('center');

  sheet.setColumnWidth(1, 175); // DATE
  sheet.setColumnWidth(2, 160); // PRENOM
  sheet.setColumnWidth(3, 240); // EMAIL
  sheet.setColumnWidth(4, 130); // PRESENCE

  SpreadsheetApp.flush();
}

/**
 * Point d'entrée HTTP Web App
 * Lit directement le JSON dans e.postData.contents
 */
function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return createJsonResponse_({ success: false, error: 'NO_DATA', message: 'Aucune donnée reçue' });
    }

    let body = {};
    try {
      body = JSON.parse(e.postData.contents);
    } catch (_) {
      return createJsonResponse_({ success: false, error: 'INVALID_JSON', message: 'Format JSON invalide' });
    }

    const firstName = (body.firstName || '').trim();
    const email = (body.email || '').trim().toLowerCase();
    const attendance = (body.attendance || '').trim().toLowerCase(); // 'oui' ou 'non'

    if (!firstName) {
      return createJsonResponse_({ success: false, error: 'NAME_REQUIRED', message: 'Merci de renseigner votre prénom.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return createJsonResponse_({ success: false, error: 'EMAIL_REQUIRED', message: 'Merci de renseigner une adresse e-mail valide.' });
    }

    if (attendance !== 'oui' && attendance !== 'non') {
      return createJsonResponse_({ success: false, error: 'INVALID_ATTENDANCE', message: 'Merci de sélectionner une réponse.' });
    }

    // Verrouillage transactionnel
    const lock = LockService.getScriptLock();
    const hasLock = lock.tryLock(10000);
    if (!hasLock) {
      return createJsonResponse_({ success: false, error: 'LOCK_TIMEOUT', message: 'Serveur occupé. Merci de réessayer dans un instant.' });
    }

    try {
      const ss = SpreadsheetApp.getActiveSpreadsheet();
      let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      if (!sheet) {
        setupHanna();
        sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
      }

      const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
      const lastRow = sheet.getLastRow();
      let foundRow = -1;

      if (lastRow >= 2) {
        const existingEmails = sheet.getRange(2, 3, lastRow - 1, 1).getValues();
        for (let i = 0; i < existingEmails.length; i++) {
          if (String(existingEmails[i][0] || '').trim().toLowerCase() === email) {
            foundRow = i + 2;
            break;
          }
        }
      }

      const presenceDisplay = attendance === 'oui' ? 'OUI' : 'NON';

      if (foundRow !== -1) {
        // Mise à jour de la ligne existante pour cet e-mail
        sheet.getRange(foundRow, 1, 1, 4).setValues([[nowStr, firstName, email, presenceDisplay]]);
      } else {
        // Nouvelle réponse
        sheet.appendRow([nowStr, firstName, email, presenceDisplay]);
      }

      SpreadsheetApp.flush();

      // Envoi des emails de notification et confirmation
      sendNotificationEmails_(firstName, email, attendance);

      return createJsonResponse_({ success: true });

    } finally {
      lock.releaseLock();
    }

  } catch (error) {
    return createJsonResponse_({
      success: false,
      error: 'SERVER_ERROR',
      message: error.toString()
    });
  }
}

function createJsonResponse_(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Envoi d'email à Salma et à l'invité
 */
function sendNotificationEmails_(firstName, email, attendance) {
  const isPresent = attendance === 'oui';

  // 1. Email pour Salma
  try {
    const adminSubject = `[RSVP Henna Day] ${firstName} a répondu : ${isPresent ? 'PRÉSENT(E)' : 'ABSENT(E)'}`;
    const adminBody = `Bonjour Salma,

Une nouvelle réponse RSVP vient d'être enregistrée pour votre Henna Day :

• Prénom : ${firstName}
• E-mail : ${email}
• Présence : ${isPresent ? 'OUI, présent(e)' : 'NON, absent(e)'}

Vous pouvez consulter votre feuille en temps réel.
`;
    MailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject, adminBody);
  } catch (err) {
    console.warn('Erreur envoi email Salma:', err);
  }

  // 2. Email de confirmation à l'invité
  try {
    const guestSubject = `Confirmation de votre réponse — ${CONFIG.EVENT_TITLE}`;
    let guestBody = '';

    if (isPresent) {
      guestBody = `Chère / Cher ${firstName},

Votre présence à Salma's Henna Day a bien été enregistrée avec succès !
Nous avons hâte de partager ce merveilleux moment avec vous.

Rappel des détails de l'événement :
• Date : ${CONFIG.EVENT_DATE}
• Lieu : ${CONFIG.EVENT_LOCATION}

À très bientôt,
Salma`;
    } else {
      guestBody = `Chère / Cher ${firstName},

Nous avons bien pris note de votre indisponibilité pour Salma's Henna Day.
Nous vous remercions chaleureusement de nous avoir prévenus et pour vos douaas.

Avec toute notre affection,
Salma`;
    }

    MailApp.sendEmail(email, guestSubject, guestBody);
  } catch (err) {
    console.warn('Erreur envoi email invité:', err);
  }
}
