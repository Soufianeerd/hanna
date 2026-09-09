# Guide de Configuration Google Sheets & Apps Script — Hanna

Ce guide détaille la mise en place du système RSVP simplifié pour Salma, calqué sur l'architecture du mariage (Prénom + E-mail).

- **Compte Google propriétaire** : `Hamidi.salma54@gmail.com`
- **Application Web Netlify** : `https://hannasalma.netlify.app/`

---

## 1. Création du Google Sheet

1. Connectez-vous à votre compte Google : **Hamidi.salma54@gmail.com**.
2. Rendez-vous sur [Google Sheets](https://sheets.new) et créez une nouvelle feuille de calcul.
3. Nommez-la :
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

## 3. Initialisation de la Feuille

1. Dans la barre d'outils de l'éditeur Apps Script, sélectionnez la fonction **`setupHanna`** dans la liste déroulante à côté de "Exécuter".
2. Cliquez sur le bouton **Exécuter**.
3. Google va demander une autorisation d'accès :
   - Cliquez sur **Examiner les autorisations**.
   - Choisissez votre compte `Hamidi.salma54@gmail.com`.
   - Si un avertissement apparaît ("Google n'a pas validé cette application"), cliquez sur **Paramètres avancés** (en bas à gauche), puis sur **Accéder à Hanna — RSVP Henna Day (non sécurisé)**.
   - Cliquez sur **Autoriser**.
4. L'exécution crée automatiquement la feuille **`RSVP`** avec les colonnes :
   - `DATE`
   - `PRENOM`
   - `EMAIL`
   - `PRESENCE`

---

## 4. Déploiement de l'Application Web

1. En haut à droite de l'éditeur Apps Script, cliquez sur le bouton bleu **Déployer** > **Nouveau déploiement**.
2. Cliquez sur la roue crantée à gauche de "Sélectionner le type" et choisissez **Application Web**.
3. Renseignez les paramètres suivants :
   - **Description** : `Hanna Web App Production`
   - **Exécuter en tant que** : `Moi (Hamidi.salma54@gmail.com)`
   - **Qui a accès** : **`Tous les utilisateurs (Anyone)`** *(obligatoire pour permettre l'envoi public depuis le site)*.
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
4. Ajoutez ou mettez à jour la variable suivante :
   - **Key** : `VITE_RSVP_ENDPOINT`
   - **Value** : `https://script.google.com/macros/s/AKfycb.../exec` *(votre URL copiée à l'étape 4)*
5. Cliquez sur **Save**.
6. Déclenchez un redéploiement du site (**Deploys** > **Trigger deploy** > **Deploy site**).

---

## 6. Fonctionnement Automatique

- Le même lien d'invitation est partagé à tous : `https://hannasalma.netlify.app/`.
- Chaque invité renseigne son **Prénom**, son **Adresse e-mail**, choisit **Présent(e)** ou **Absent(e)**, puis valide.
- La réponse est enregistrée dans le Sheet. Si le même e-mail répond à nouveau, sa ligne est mise à jour (pas de doublon).
- **Salma** reçoit un e-mail récapitulatif pour chaque réponse sur `Hamidi.salma54@gmail.com`.
- **L'invité** reçoit un e-mail de confirmation personnalisé avec les détails de l'événement.
