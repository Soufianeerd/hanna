/**
 * ============================================================================
 * HANNA — GOOGLE APPS SCRIPT BACKEND RSVP & DASHBOARD
 * Compte officiel : Hamidi.salma54@gmail.com
 * Site Netlify : https://hannasalma.netlify.app/
 * ============================================================================
 */

const CONFIG = {
  SHEET_INVITES: 'INVITES',
  SHEET_DASHBOARD: 'DASHBOARD',
  SHEET_LOGS: 'LOGS',
  SITE_BASE_URL: 'https://hannasalma.netlify.app/',
  DEFAULT_MAX_PARTY: 4
};

/**
 * Initialisation idempotente du Google Spreadsheet
 * Crée les feuilles, les en-têtes et le tableau de bord sans effacer les données existantes.
 */
function setupHanna() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  // 1. Feuille INVITES
  let sheetInvites = ss.getSheetByName(CONFIG.SHEET_INVITES);
  if (!sheetInvites) {
    sheetInvites = ss.insertSheet(CONFIG.SHEET_INVITES, 0);
  }

  const invitesHeaders = [
    'CODE',              // A (1)
    'PRENOM',            // B (2)
    'NOM',               // C (3)
    'MAX_PERSONNES',     // D (4)
    'RSVP',              // E (5)
    'NB_PERSONNES',      // F (6)
    'NB_ACCOMPAGNANTS',  // G (7)
    'DATE_REPONSE',      // H (8)
    'UPDATED_AT',        // I (9)
    'ACTIF',             // J (10)
    'LIEN_INVITATION'    // K (11)
  ];

  if (sheetInvites.getLastRow() === 0) {
    sheetInvites.appendRow(invitesHeaders);
  } else {
    // S'assure que la ligne d'en-tête est conforme
    sheetInvites.getRange(1, 1, 1, invitesHeaders.length).setValues([invitesHeaders]);
  }

  // Formatage INVITES
  sheetInvites.setFrozenRows(1);
  const headerRange = sheetInvites.getRange(1, 1, 1, invitesHeaders.length);
  headerRange.setBackground('#155039')
             .setFontColor('#F7F4EC')
             .setFontWeight('bold')
             .setFontFamily('Georgia')
             .setFontSize(10)
             .setHorizontalAlignment('center');

  sheetInvites.setColumnWidth(1, 170); // CODE
  sheetInvites.setColumnWidth(2, 130); // PRENOM
  sheetInvites.setColumnWidth(3, 130); // NOM
  sheetInvites.setColumnWidth(4, 130); // MAX_PERSONNES
  sheetInvites.setColumnWidth(5, 110); // RSVP
  sheetInvites.setColumnWidth(6, 120); // NB_PERSONNES
  sheetInvites.setColumnWidth(7, 150); // NB_ACCOMPAGNANTS
  sheetInvites.setColumnWidth(8, 170); // DATE_REPONSE
  sheetInvites.setColumnWidth(9, 170); // UPDATED_AT
  sheetInvites.setColumnWidth(10, 90); // ACTIF
  sheetInvites.setColumnWidth(11, 340); // LIEN_INVITATION

  // 2. Feuille DASHBOARD
  let sheetDashboard = ss.getSheetByName(CONFIG.SHEET_DASHBOARD);
  if (!sheetDashboard) {
    sheetDashboard = ss.insertSheet(CONFIG.SHEET_DASHBOARD, 1);
  }

  formatDashboardLayout_(sheetDashboard);

  // 3. Feuille LOGS
  let sheetLogs = ss.getSheetByName(CONFIG.SHEET_LOGS);
  if (!sheetLogs) {
    sheetLogs = ss.insertSheet(CONFIG.SHEET_LOGS, 2);
  }

  const logsHeaders = ['TIMESTAMP', 'ACTION', 'CODE', 'STATUS', 'DETAIL'];
  if (sheetLogs.getLastRow() === 0) {
    sheetLogs.appendRow(logsHeaders);
  }
  sheetLogs.setFrozenRows(1);
  const logHeaderRange = sheetLogs.getRange(1, 1, 1, logsHeaders.length);
  logHeaderRange.setBackground('#1F2937')
                .setFontColor('#F9FAFB')
                .setFontWeight('bold')
                .setHorizontalAlignment('center');

  sheetLogs.setColumnWidth(1, 180);
  sheetLogs.setColumnWidth(2, 130);
  sheetLogs.setColumnWidth(3, 170);
  sheetLogs.setColumnWidth(4, 100);
  sheetLogs.setColumnWidth(5, 300);

  // Mise à jour immédiate du dashboard
  updateDashboard_(ss);
  logAction_('SETUP', 'SYSTEM', 'OK', 'setupHanna exécuté avec succès');
}

/**
 * Met en page le tableau de bord avec une mise en forme sobre et élégante
 */
function formatDashboardLayout_(sheet) {
  sheet.clear();
  sheet.setColumnWidth(1, 40);
  sheet.setColumnWidth(2, 280);
  sheet.setColumnWidth(3, 140);
  sheet.setColumnWidth(4, 40);

  // Titre
  sheet.getRange('B2:C2').merge()
       .setValue("TABLEAU DE BORD — SALMA'S HENNA DAY")
       .setBackground('#155039')
       .setFontColor('#F7F4EC')
       .setFontFamily('Georgia')
       .setFontSize(13)
       .setFontWeight('bold')
       .setHorizontalAlignment('center')
       .setVerticalAlignment('middle');
  sheet.setRowHeight(2, 38);

  const labels = [
    ['TOTAL INVITATIONS ACTIVES', 0],
    ['RÉPONSES REÇUES', 0],
    ['EN ATTENTE', 0],
    ['PRÉSENTS (Invitations)', 0],
    ['ABSENTS (Invitations)', 0],
    ['TOTAL PERSONNES ATTENDUES', 0],
    ['TOTAL ACCOMPAGNANTS', 0]
  ];

  for (let i = 0; i < labels.length; i++) {
    const row = 4 + i;
    sheet.getRange(row, 2).setValue(labels[i][0])
         .setFontFamily('Georgia')
         .setFontSize(10)
         .setFontWeight('bold')
         .setFontColor('#155039')
         .setBackground(i % 2 === 0 ? '#F7F4EC' : '#FFFFFF')
         .setVerticalAlignment('middle');

    sheet.getRange(row, 3).setValue(labels[i][1])
         .setFontFamily('Georgia')
         .setFontSize(12)
         .setFontWeight('bold')
         .setFontColor('#155039')
         .setBackground(i % 2 === 0 ? '#F7F4EC' : '#FFFFFF')
         .setHorizontalAlignment('center')
         .setVerticalAlignment('middle');

    sheet.setRowHeight(row, 30);
  }

  // Dernière mise à jour
  sheet.getRange('B12:C12').merge()
       .setValue('Dernière mise à jour : —')
       .setFontFamily('Arial')
       .setFontSize(9)
       .setFontStyle('italic')
       .setFontColor('#6B7280')
       .setHorizontalAlignment('center');
}

/**
 * Recalcule et actualise les compteurs du DASHBOARD directement en code
 * (indépendant de toute formule Google Sheets localisée FR/EN)
 */
function updateDashboard_(ss) {
  if (!ss) ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetInvites = ss.getSheetByName(CONFIG.SHEET_INVITES);
  const sheetDashboard = ss.getSheetByName(CONFIG.SHEET_DASHBOARD);
  if (!sheetInvites || !sheetDashboard) return;

  const data = sheetInvites.getDataRange().getValues();
  if (data.length <= 1) {
    // Pas de données invités
    return;
  }

  let totalActive = 0;
  let responsesReceived = 0;
  let presentsCount = 0;
  let absentsCount = 0;
  let totalPersonsExpected = 0;
  let totalGuestsExpected = 0;

  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const prenom = String(row[1] || '').trim();
    if (!prenom) continue; // Ligne vide

    const actifVal = row[9];
    const isActif = actifVal === true || String(actifVal).toUpperCase() === 'TRUE';
    if (!isActif) continue;

    totalActive++;

    const rsvpStatus = String(row[4] || '').toUpperCase().trim();
    if (rsvpStatus === 'PRESENT') {
      responsesReceived++;
      presentsCount++;
      const nbPers = parseInt(row[5], 10) || 1;
      const nbAcc = parseInt(row[6], 10) || Math.max(0, nbPers - 1);
      totalPersonsExpected += nbPers;
      totalGuestsExpected += nbAcc;
    } else if (rsvpStatus === 'ABSENT') {
      responsesReceived++;
      absentsCount++;
    }
  }

  const pending = Math.max(0, totalActive - responsesReceived);

  sheetDashboard.getRange(4, 3).setValue(totalActive);
  sheetDashboard.getRange(5, 3).setValue(responsesReceived);
  sheetDashboard.getRange(6, 3).setValue(pending);
  sheetDashboard.getRange(7, 3).setValue(presentsCount);
  sheetDashboard.getRange(8, 3).setValue(absentsCount);
  sheetDashboard.getRange(9, 3).setValue(totalPersonsExpected);
  sheetDashboard.getRange(10, 3).setValue(totalGuestsExpected);

  const nowStr = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm:ss');
  sheetDashboard.getRange('B12:C12').setValue('Dernière mise à jour : ' + nowStr);
}

/**
 * Génère un code unique sécurisé non devinable à 12 caractères
 * Exemple : HN-A7K3Q9M2P8ZX
 */
function generateSecureCode_() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclut 0, 1, I, O pour lisibilité
  let result = 'HN-';
  for (let i = 0; i < 12; i++) {
    const idx = Math.floor(Math.random() * chars.length);
    result += chars.charAt(idx);
  }
  return result;
}

/**
 * Parcourt la feuille INVITES et génère le CODE et le LIEN_INVITATION
 * pour toutes les lignes où le PRENOM est présent mais le CODE est vide.
 */
function generateMissingInviteCodes() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_INVITES);
  if (!sheet) {
    throw new Error("Feuille 'INVITES' introuvable. Exécutez setupHanna d'abord.");
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return;

  const existingCodes = new Set();
  for (let i = 1; i < data.length; i++) {
    const c = String(data[i][0] || '').trim();
    if (c) existingCodes.add(c);
  }

  let generatedCount = 0;

  for (let i = 1; i < data.length; i++) {
    const rowNum = i + 1;
    const currentCode = String(data[i][0] || '').trim();
    const prenom = String(data[i][1] || '').trim();

    if (prenom && !currentCode) {
      let newCode = '';
      do {
        newCode = generateSecureCode_();
      } while (existingCodes.has(newCode));

      existingCodes.add(newCode);

      // Valeurs par défaut
      const maxPers = data[i][3] || CONFIG.DEFAULT_MAX_PARTY;
      const actif = data[i][9] !== false && String(data[i][9]).toUpperCase() !== 'FALSE';
      const link = CONFIG.SITE_BASE_URL + '?code=' + newCode;

      sheet.getRange(rowNum, 1).setValue(newCode); // CODE
      if (!data[i][3]) sheet.getRange(rowNum, 4).setValue(maxPers); // MAX_PERSONNES
      if (data[i][9] === '' || data[i][9] === undefined) sheet.getRange(rowNum, 10).setValue(true); // ACTIF
      sheet.getRange(rowNum, 11).setValue(link); // LIEN_INVITATION

      generatedCount++;
    }
  }

  logAction_('GENERATE_CODES', 'BATCH', 'OK', generatedCount + ' codes générés');
  SpreadsheetApp.getActiveSpreadsheet().toast(
    generatedCount + ' invitation(s) générée(s) avec succès.',
    'Génération terminée',
    5
  );
}

/**
 * Routeur POST pour les requêtes web (format application/x-www-form-urlencoded)
 */
function doPost(e) {
  try {
    let action = '';
    let payload = {};

    if (e && e.parameter) {
      action = e.parameter.action || '';
      if (e.parameter.data) {
        try {
          payload = JSON.parse(e.parameter.data);
        } catch (_) {
          payload = {};
        }
      }
    }

    if (!action && e && e.postData && e.postData.contents) {
      try {
        const body = JSON.parse(e.postData.contents);
        action = body.action || '';
        payload = body.data || body;
      } catch (_) {}
    }

    let responseData = {};

    if (action === 'getGuest') {
      responseData = handleGetGuest_(payload);
    } else if (action === 'saveRsvp') {
      responseData = handleSaveRsvp_(payload);
    } else {
      responseData = { ok: false, error: 'ACTION_INVALIDE' };
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
                         .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    logAction_('ERROR', 'doPost', 'KO', String(err.message || err));
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: 'SERVER_ERROR',
      message: String(err.message || err)
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Routeur GET (Healthcheck)
 */
function doGet(e) {
  return ContentService.createTextOutput(JSON.stringify({
    ok: true,
    message: 'Hanna Invitation RSVP API opérationnelle',
    timestamp: new Date().toISOString()
  })).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Récupère les données d'un invité via son CODE
 */
function handleGetGuest_(payload) {
  const code = String(payload.code || '').trim();
  if (!code) {
    return { ok: false, error: 'CODE_MANQUANT' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_INVITES);
  if (!sheet) return { ok: false, error: 'SHEET_NOT_FOUND' };

  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    const rowCode = String(data[i][0] || '').trim();
    if (rowCode === code) {
      const isActif = data[i][9] === true || String(data[i][9]).toUpperCase() === 'TRUE';
      if (!isActif) {
        logAction_('GET_GUEST', code, 'DENIED', 'Invitation désactivée');
        return { ok: false, error: 'INVITATION_DESACTIVEE' };
      }

      const firstName = String(data[i][1] || '').trim();
      const maxPartySize = Math.min(4, Math.max(1, parseInt(data[i][3], 10) || 4));
      const existingRsvp = String(data[i][4] || '').toUpperCase().trim();
      const currentPartySize = parseInt(data[i][5], 10) || (existingRsvp === 'PRESENT' ? 1 : 0);

      logAction_('GET_GUEST', code, 'OK', 'Invité identifié: ' + firstName);

      return {
        ok: true,
        guest: {
          firstName: firstName,
          maxPartySize: maxPartySize,
          rsvp: existingRsvp ? existingRsvp : null,
          partySize: currentPartySize
        }
      };
    }
  }

  logAction_('GET_GUEST', code, 'NOT_FOUND', 'Code inconnu');
  return { ok: false, error: 'CODE_INTROUVABLE' };
}

/**
 * Enregistre ou met à jour le RSVP d'un invité
 * Utilise LockService pour garantir l'intégrité concurrentielle
 */
function handleSaveRsvp_(payload) {
  const code = String(payload.code || '').trim();
  const status = String(payload.status || '').toUpperCase().trim();
  let partySize = parseInt(payload.partySize, 10);
  const submittedAt = payload.submittedAt || new Date().toISOString();

  if (!code) {
    return { ok: false, error: 'CODE_MANQUANT' };
  }

  if (status !== 'PRESENT' && status !== 'ABSENT') {
    return { ok: false, error: 'STATUT_INVALIDE' };
  }

  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(30000); // 30s timeout

  if (!hasLock) {
    return { ok: false, error: 'LOCK_TIMEOUT', message: 'Serveur occupé, veuillez réessayer.' };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_INVITES);
    if (!sheet) return { ok: false, error: 'SHEET_NOT_FOUND' };

    const data = sheet.getDataRange().getValues();
    let rowIndex = -1;
    let maxAllowedParty = 4;
    let existingDateReponse = '';

    for (let i = 1; i < data.length; i++) {
      const rowCode = String(data[i][0] || '').trim();
      if (rowCode === code) {
        const isActif = data[i][9] === true || String(data[i][9]).toUpperCase() === 'TRUE';
        if (!isActif) {
          return { ok: false, error: 'INVITATION_DESACTIVEE' };
        }
        rowIndex = i + 1; // 1-indexed
        maxAllowedParty = Math.min(4, Math.max(1, parseInt(data[i][3], 10) || 4));
        existingDateReponse = data[i][7];
        break;
      }
    }

    if (rowIndex === -1) {
      return { ok: false, error: 'CODE_INTROUVABLE' };
    }

    // Validation et cohérence des personnes
    let finalPartySize = 0;
    let nbAccompagnants = 0;

    if (status === 'ABSENT') {
      finalPartySize = 0;
      nbAccompagnants = 0;
    } else {
      if (isNaN(partySize) || partySize < 1) {
        partySize = 1;
      }
      finalPartySize = Math.min(partySize, maxAllowedParty);
      nbAccompagnants = Math.max(0, finalPartySize - 1);
    }

    const nowFormatted = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm:ss');
    const firstResponseDate = existingDateReponse ? existingDateReponse : nowFormatted;

    // Mise à jour de la ligne (Colonnes E, F, G, H, I)
    // E (5): RSVP
    // F (6): NB_PERSONNES
    // G (7): NB_ACCOMPAGNANTS
    // H (8): DATE_REPONSE
    // I (9): UPDATED_AT
    sheet.getRange(rowIndex, 5).setValue(status);
    sheet.getRange(rowIndex, 6).setValue(finalPartySize);
    sheet.getRange(rowIndex, 7).setValue(nbAccompagnants);
    sheet.getRange(rowIndex, 8).setValue(firstResponseDate);
    sheet.getRange(rowIndex, 9).setValue(nowFormatted);

    // Mise à jour immédiate du dashboard
    updateDashboard_(ss);

    logAction_('SAVE_RSVP', code, 'OK', status + ' (' + finalPartySize + ' pers.)');

    return {
      ok: true,
      saved: {
        status: status,
        partySize: finalPartySize,
        nbAccompagnants: nbAccompagnants,
        updatedAt: nowFormatted
      }
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Journalise une action dans la feuille LOGS
 */
function logAction_(action, code, status, detail) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_LOGS);
    if (!sheet) return;

    const timestamp = Utilities.formatDate(new Date(), 'Europe/Paris', 'dd/MM/yyyy HH:mm:ss');
    sheet.appendRow([timestamp, action, code, status, detail]);

    // Limiter la taille des logs à 1000 lignes maximum
    if (sheet.getLastRow() > 1050) {
      sheet.deleteRows(2, 100);
    }
  } catch (_) {}
}
