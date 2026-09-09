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
  SITE_BASE_URL: 'https://hannasalma.netlify.app/'
};

// Schéma officiel à 8 colonnes
const INVITES_HEADERS = [
  'CODE',            // A (1)
  'PRENOM',          // B (2)
  'NOM',             // C (3)
  'RSVP',            // D (4) - vide, PRESENT ou ABSENT
  'DATE_REPONSE',    // E (5)
  'UPDATED_AT',      // F (6)
  'ACTIF',           // G (7) - TRUE ou FALSE
  'LIEN_INVITATION'  // H (8)
];

/**
 * Menu personnalisé automatique dans Google Sheets
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Hanna')
    .addItem('Créer 1 lien d’invitation', 'createOneInviteLink')
    .addItem('Créer 10 liens d’invitation', 'createTenInviteLinks')
    .addSeparator()
    .addItem('Mettre à jour le dashboard', 'refreshDashboard')
    .addItem('Vérifier / initialiser Hanna', 'setupHanna')
    .addToUi();
}

/**
 * Fonctions déclenchées depuis le menu Hanna
 */
function createOneInviteLink() {
  createInviteLinks_(1);
}

function createTenInviteLinks() {
  createInviteLinks_(10);
}

function refreshDashboard() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  updateDashboard_(ss);
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert('Tableau de bord actualisé avec succès !');
}

/**
 * Initialisation idempotente du Google Spreadsheet
 * Crée ou met à jour les feuilles INVITES, DASHBOARD et LOGS sans perte de données.
 */
function setupHanna() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  // 1. Feuille INVITES
  let sheetInvites = ss.getSheetByName(CONFIG.SHEET_INVITES);
  if (!sheetInvites) {
    sheetInvites = ss.insertSheet(CONFIG.SHEET_INVITES, 0);
    sheetInvites.appendRow(INVITES_HEADERS);
  } else {
    // S'assure que les en-têtes sont à jour
    sheetInvites.getRange(1, 1, 1, INVITES_HEADERS.length).setValues([INVITES_HEADERS]);
  }

  // Formatage esthétique de la feuille INVITES
  sheetInvites.setFrozenRows(1);
  const headerRange = sheetInvites.getRange(1, 1, 1, INVITES_HEADERS.length);
  headerRange.setBackground('#155039')
             .setFontColor('#F7F4EC')
             .setFontWeight('bold')
             .setFontFamily('Georgia')
             .setFontSize(10)
             .setHorizontalAlignment('center');

  sheetInvites.setColumnWidth(1, 180); // CODE
  sheetInvites.setColumnWidth(2, 140); // PRENOM
  sheetInvites.setColumnWidth(3, 140); // NOM
  sheetInvites.setColumnWidth(4, 120); // RSVP
  sheetInvites.setColumnWidth(5, 175); // DATE_REPONSE
  sheetInvites.setColumnWidth(6, 175); // UPDATED_AT
  sheetInvites.setColumnWidth(7, 95);  // ACTIF
  sheetInvites.setColumnWidth(8, 380); // LIEN_INVITATION

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
  sheetLogs.getRange(1, 1, 1, logsHeaders.length)
           .setBackground('#1F2937')
           .setFontColor('#F9FAFB')
           .setFontWeight('bold')
           .setHorizontalAlignment('center');

  sheetLogs.setColumnWidth(1, 180);
  sheetLogs.setColumnWidth(2, 130);
  sheetLogs.setColumnWidth(3, 170);
  sheetLogs.setColumnWidth(4, 110);
  sheetLogs.setColumnWidth(5, 300);

  // Calcul initial du tableau de bord
  updateDashboard_(ss);
  SpreadsheetApp.flush();
}

/**
 * Crée N nouveaux liens d'invitation avec code unique et prêt à envoyer
 * @param {number} count Nombre de liens à générer
 */
function createInviteLinks_(count = 1) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_INVITES);
  if (!sheet) {
    setupHanna();
    sheet = ss.getSheetByName(CONFIG.SHEET_INVITES);
  }

  const existingCodes = new Set();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const codes = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    codes.forEach(r => {
      const c = String(r[0] || '').trim();
      if (c) existingCodes.add(c);
    });
  }

  const newRows = [];
  for (let i = 0; i < count; i++) {
    let newCode = generateSecureCode_();
    while (existingCodes.has(newCode)) {
      newCode = generateSecureCode_();
    }
    existingCodes.add(newCode);

    const lien = CONFIG.SITE_BASE_URL + '?code=' + newCode;
    newRows.push([
      newCode, // A: CODE
      '',      // B: PRENOM (vide au départ)
      '',      // C: NOM (vide au départ)
      '',      // D: RSVP (vide au départ)
      '',      // E: DATE_REPONSE
      '',      // F: UPDATED_AT
      true,    // G: ACTIF
      lien     // H: LIEN_INVITATION
    ]);
  }

  if (newRows.length > 0) {
    const startRow = Math.max(2, sheet.getLastRow() + 1);
    sheet.getRange(startRow, 1, newRows.length, INVITES_HEADERS.length).setValues(newRows);
    updateDashboard_(ss);
    SpreadsheetApp.flush();
    logAction_('CREATE_LINKS', '', 'SUCCESS', `${count} nouveau(x) lien(s) généré(s)`);
  }
}

function generateSecureCode_() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let entropy = '';
  for (let i = 0; i < 12; i++) {
    const r = Math.floor(Math.random() * chars.length);
    entropy += chars.charAt(r);
  }
  return 'HN-' + entropy;
}

/**
 * Point d'entrée HTTP Web App
 * Supporte application/x-www-form-urlencoded pour éviter les préflights CORS
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

    switch (action) {
      case 'getGuest':
        responseData = handleGetGuest_(payload);
        break;
      case 'saveRsvp':
        responseData = handleSaveRsvp_(payload);
        break;
      default:
        responseData = { ok: false, error: 'INVALID_ACTION', message: 'Action inconnue' };
    }

    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    logAction_('ERROR', '', 'CRASH', error.toString());
    return ContentService.createTextOutput(JSON.stringify({
      ok: false,
      error: 'SERVER_ERROR',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGetGuest_(payload) {
  const code = (payload.code || '').trim();
  if (!code) {
    return { ok: false, error: 'CODE_REQUIRED', message: 'Code d’invitation obligatoire' };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_INVITES);
  if (!sheet) return { ok: false, error: 'SHEET_NOT_FOUND' };

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return { ok: false, error: 'GUEST_NOT_FOUND' };

  const data = sheet.getRange(2, 1, lastRow - 1, INVITES_HEADERS.length).getValues();

  for (let i = 0; i < data.length; i++) {
    const rowCode = String(data[i][0] || '').trim();
    if (rowCode === code) {
      const actif = data[i][6];
      if (actif !== true && String(actif).toUpperCase() !== 'TRUE') {
        return { ok: false, error: 'INVITE_INACTIVE', message: 'Cette invitation est désactivée.' };
      }

      logAction_('GET_GUEST', code, 'SUCCESS', `Consultation code ${code}`);

      return {
        ok: true,
        guest: {
          firstName: data[i][1] || '',
          lastName: data[i][2] || '',
          rsvp: data[i][3] || null
        }
      };
    }
  }

  logAction_('GET_GUEST', code, 'NOT_FOUND', 'Code invité inexistant');
  return { ok: false, error: 'GUEST_NOT_FOUND', message: 'Invitation introuvable.' };
}

function handleSaveRsvp_(payload) {
  const code = (payload.code || '').trim();
  const firstName = (payload.firstName || '').trim();
  const lastName = (payload.lastName || '').trim();
  const status = (payload.status || '').trim().toUpperCase();

  if (!code) {
    return { ok: false, error: 'CODE_REQUIRED', message: 'Code d’invitation obligatoire' };
  }
  if (!firstName || !lastName) {
    return { ok: false, error: 'NAME_REQUIRED', message: 'Merci de renseigner votre nom et votre prénom.' };
  }
  if (status !== 'PRESENT' && status !== 'ABSENT') {
    return { ok: false, error: 'INVALID_STATUS', message: 'Réponse invalide (PRESENT ou ABSENT requis)' };
  }

  // Verrouillage transactionnel pour empêcher toute collision d'écriture concurrente
  const lock = LockService.getScriptLock();
  const hasLock = lock.tryLock(10000);
  if (!hasLock) {
    return { ok: false, error: 'LOCK_TIMEOUT', message: 'Serveur occupé. Merci de réessayer dans un instant.' };
  }

  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_INVITES);
    if (!sheet) return { ok: false, error: 'SHEET_NOT_FOUND' };

    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return { ok: false, error: 'GUEST_NOT_FOUND' };

    const data = sheet.getRange(2, 1, lastRow - 1, INVITES_HEADERS.length).getValues();
    let rowIndex = -1;

    for (let i = 0; i < data.length; i++) {
      if (String(data[i][0] || '').trim() === code) {
        rowIndex = i + 2;
        break;
      }
    }

    if (rowIndex === -1) {
      return { ok: false, error: 'GUEST_NOT_FOUND', message: 'Code invité introuvable.' };
    }

    const currentRow = data[rowIndex - 2];
    const actif = currentRow[6];
    if (actif !== true && String(actif).toUpperCase() !== 'TRUE') {
      return { ok: false, error: 'INVITE_INACTIVE', message: 'Cette invitation est désactivée.' };
    }

    const nowStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    const firstResponseDate = currentRow[4] || nowStr;

    // Mise à jour ciblée : B (PRENOM), C (NOM), D (RSVP), E (DATE_REPONSE), F (UPDATED_AT)
    sheet.getRange(rowIndex, 2, 1, 5).setValues([
      [firstName, lastName, status, firstResponseDate, nowStr]
    ]);

    // Recalcul immédiat du tableau de bord
    updateDashboard_(ss);
    SpreadsheetApp.flush();

    logAction_('SAVE_RSVP', code, 'SUCCESS', `RSVP enregistré: ${firstName} ${lastName} -> ${status}`);

    return {
      ok: true,
      saved: {
        firstName: firstName,
        lastName: lastName,
        status: status
      }
    };

  } finally {
    lock.releaseLock();
  }
}

/**
 * Recalcule et actualise les statistiques dans la feuille DASHBOARD
 */
function updateDashboard_(ss) {
  let sheetDashboard = ss.getSheetByName(CONFIG.SHEET_DASHBOARD);
  if (!sheetDashboard) {
    sheetDashboard = ss.insertSheet(CONFIG.SHEET_DASHBOARD, 1);
    formatDashboardLayout_(sheetDashboard);
  }

  const sheetInvites = ss.getSheetByName(CONFIG.SHEET_INVITES);
  if (!sheetInvites || sheetInvites.getLastRow() < 2) {
    writeDashboardValues_(sheetDashboard, { actives: 0, reponses: 0, enAttente: 0, presents: 0, absents: 0 });
    return;
  }

  const data = sheetInvites.getRange(2, 1, sheetInvites.getLastRow() - 1, INVITES_HEADERS.length).getValues();

  let actives = 0;
  let reponses = 0;
  let presents = 0;
  let absents = 0;

  for (let i = 0; i < data.length; i++) {
    const actif = data[i][6];
    const isActif = actif === true || String(actif).toUpperCase() === 'TRUE';
    if (!isActif) continue;

    actives++;
    const rsvp = String(data[i][3] || '').trim().toUpperCase();

    if (rsvp === 'PRESENT') {
      reponses++;
      presents++;
    } else if (rsvp === 'ABSENT') {
      reponses++;
      absents++;
    }
  }

  const enAttente = actives - reponses;

  writeDashboardValues_(sheetDashboard, {
    actives,
    reponses,
    enAttente,
    presents,
    absents
  });
}

function writeDashboardValues_(sheet, stats) {
  sheet.getRange('B4').setValue(stats.actives);
  sheet.getRange('B5').setValue(stats.reponses);
  sheet.getRange('B6').setValue(stats.enAttente);
  sheet.getRange('B8').setValue(stats.presents);
  sheet.getRange('B9').setValue(stats.absents);

  const updateTimeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'dd/MM/yyyy HH:mm:ss');
  sheet.getRange('B11').setValue(updateTimeStr);
}

function formatDashboardLayout_(sheet) {
  sheet.clear();
  sheet.setColumnWidth(1, 260);
  sheet.setColumnWidth(2, 160);

  // Titre principal
  sheet.getRange('A1:B1').merge()
       .setValue('HANNA — DASHBOARD HENNA DAY')
       .setBackground('#155039')
       .setFontColor('#F7F4EC')
       .setFontWeight('bold')
       .setFontFamily('Georgia')
       .setFontSize(13)
       .setHorizontalAlignment('center');

  // Sous-titre
  sheet.getRange('A2:B2').merge()
       .setValue('Indicateurs de suivi en temps réel')
       .setBackground('#E5F1EA')
       .setFontColor('#155039')
       .setFontStyle('italic')
       .setFontSize(10)
       .setHorizontalAlignment('center');

  // Libellés demandés
  const labels = [
    ['TOTAL INVITATIONS ACTIVES', 0],
    ['RÉPONSES REÇUES', 0],
    ['EN ATTENTE', 0],
    ['', ''],
    ['INVITÉS PRÉSENTS', 0],
    ['INVITÉS ABSENTS', 0],
    ['', ''],
    ['DERNIÈRE MISE À JOUR', '']
  ];

  sheet.getRange('A4:B11').setValues(labels);

  sheet.getRange('A4:A11')
       .setFontFamily('Georgia')
       .setFontWeight('bold')
       .setFontSize(10)
       .setFontColor('#111827');

  sheet.getRange('B4:B11')
       .setFontFamily('Georgia')
       .setFontWeight('bold')
       .setFontSize(12)
       .setHorizontalAlignment('center');

  sheet.getRange('B8').setFontColor('#155039'); // Présents en vert
  sheet.getRange('B9').setFontColor('#991B1B'); // Absents en rouge
  sheet.getRange('B11').setFontSize(9).setFontWeight('normal').setFontColor('#6B7280');

  // Bordures douces
  sheet.getRange('A4:B6').setBorder(true, true, true, true, false, false, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
  sheet.getRange('A8:B9').setBorder(true, true, true, true, false, false, '#D1D5DB', SpreadsheetApp.BorderStyle.SOLID);
}

function logAction_(action, code, status, detail) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEET_LOGS);
    if (!sheet) return;

    const timeStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    sheet.appendRow([timeStr, action, code, status, detail]);
  } catch (_) {}
}
