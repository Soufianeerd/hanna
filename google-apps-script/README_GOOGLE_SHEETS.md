# Guide de Configuration Google Sheets & Apps Script — Hanna

Ce guide détaille la mise en place du système RSVP et de gestion des invitations pour Salma.

- **Compte Google propriétaire** : `Hamidi.salma54@gmail.com`
- **Application Web Netlify** : `https://hannasalma.netlify.app/`

---

## 1. Création du Google Sheet

1. Connectez-vous à votre compte Google : **Hamidi.salma54@gmail.com**.
2. Rendez-vous sur [Google Sheets](https://sheets.new) et créez une nouvelle feuille de calcul.
3. Nommez-la exactement :
   ```
   Hanna — RSVP Henna Day
   ```

---

## 2. Installation du Script Backend

1. Dans votre feuille de calcul, cliquez sur le menu **Extensions** > **Apps Script**.
2. Une nouvelle page s'ouvre avec un fichier nommé `Code.gs`.
3. Effacez l'intégralité du contenu existant et collez le code complet du fichier :
   [`google-apps-script/Code.gs`](./Code.gs).
4. Cliquez sur l'icône **Enregistrer** (disquette) ou faites `Cmd + S` (`Ctrl + S`).

---

## 3. Initialisation Automatique du Tableau de Bord

1. Dans la barre d'outils de l'éditeur Apps Script, sélectionnez la fonction **`setupHanna`** dans la liste déroulante à côté de "Exécuter".
2. Cliquez sur le bouton **Exécuter**.
3. Google va demander une autorisation d'accès :
   - Cliquez sur **Examiner les autorisations**.
   - Choisissez votre compte `Hamidi.salma54@gmail.com`.
   - Si un avertissement apparaît ("Google n'a pas validé cette application"), cliquez sur **Paramètres avancés** (en bas à gauche), puis sur **Accéder à Hanna — RSVP Henna Day (non sécurisé)**.
   - Cliquez sur **Autoriser**.
4. L'exécution se termine en quelques secondes.
5. Revenez sur votre Google Sheet. Vous constaterez que 3 feuilles ont été créées et stylisées :
   - **`INVITES`** : La base de données principale (8 colonnes).
   - **`DASHBOARD`** : Le tableau de bord récapitulatif en temps réel.
   - **`LOGS`** : Le journal d'audit de toutes les requêtes.
6. Actualisez la page de votre navigateur Google Sheet (F5 ou `Cmd + R`) : le menu personnalisé **Hanna** apparaît dans la barre de menu.

---

## 4. Déploiement de l'Application Web

1. En haut à droite de l'éditeur Apps Script, cliquez sur le bouton bleu **Déployer** > **Nouveau déploiement**.
2. Cliquez sur la roue crantée à gauche de "Sélectionner le type" et choisissez **Application Web**.
3. Renseignez les paramètres suivants :
   - **Description** : `Hanna Web App Production`
   - **Exécuter en tant que** : `Moi (Hamidi.salma54@gmail.com)`
   - **Qui a accès** : **`Tous les utilisateurs (Anyone)`** *(obligatoire pour que les invités puissent envoyer leur réponse sans avoir à se connecter à un compte Google)*.
4. Cliquez sur **Déployer**.
5. Copiez l'**URL de l'application Web** qui se termine par `/exec` :
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```

---

## 5. Configuration sur Netlify

1. Rendez-vous sur votre tableau de bord [Netlify](https://app.netlify.com/).
2. Ouvrez le projet du site **hannasalma**.
3. Allez dans **Site configuration** > **Environment variables**.
4. Ajoutez la variable suivante :
   - **Key** : `VITE_RSVP_ENDPOINT`
   - **Value** : `https://script.google.com/macros/s/AKfycb.../exec` *(votre URL copiée à l'étape 4)*
5. Cliquez sur **Save**.
6. Déclenchez un redéploiement du site (**Deploys** > **Trigger deploy** > **Deploy site**) pour que la variable soit prise en compte.

---

## 6. Utilisation Quotidienne par Salma

### Comment inviter une personne :
1. Ouvrez le Google Sheet **Hanna — RSVP Henna Day**.
2. Dans le menu **Hanna**, cliquez sur **Créer 1 lien d’invitation** (ou **Créer 10 liens d’invitation** pour en préparer plusieurs).
3. Une nouvelle ligne est ajoutée tout en bas de la feuille **`INVITES`** avec un code unique et un lien d'invitation pré-généré dans la colonne **`LIEN_INVITATION`** (colonne H).
4. Copiez ce lien (ex: `https://hannasalma.netlify.app/?code=HN-A7K92BM4P8X1`).
5. Envoyez ce lien directement par WhatsApp ou SMS à la personne de votre choix.

### Ce qui se passe lorsque l'invité répond :
1. L'invité ouvre son lien sur son téléphone et découvre l'invitation animée avec musique.
2. Lorsqu'il arrive sur la page finale, il renseigne son **Prénom** et son **Nom**, choisit **Présent(e)** ou **Absent(e)**, puis clique sur **Valider**.
3. Dès validation :
   - La ligne correspondante dans la feuille **`INVITES`** est instantanément complétée avec son Prénom (colonne B), son Nom (colonne C) et son choix RSVP (colonne D).
   - Le tableau de bord **`DASHBOARD`** est actualisé en temps réel (**INVITÉS PRÉSENTS** augmente de 1).
   - La carte s'envole élégamment vers le haut et affiche le message de confirmation avec la musique qui continue en boucle.

### Si un invité modifie sa réponse :
Si l'invité rouvre son lien personnalisé plus tard, ses informations (**Prénom**, **Nom** et son choix) sont automatiquement préremplies. S'il change d'avis et valide à nouveau, la même ligne est mise à jour dans le Sheet sans créer de doublon.
