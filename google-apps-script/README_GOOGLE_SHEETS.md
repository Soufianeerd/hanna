# Guide d'Installation Google Sheets & Apps Script — Hanna RSVP

Ce guide s'adresse directement à **Salma Hamidi** (`Hamidi.salma54@gmail.com`) pour brancher l'invitation en ligne [hannasalma.netlify.app](https://hannasalma.netlify.app/) sur son propre tableau Google Sheets sécurisé.

---

## 1. Connexion au Bon Compte Google

> [!IMPORTANT]
> Le classeur Google Sheets doit obligatoirement être créé et hébergé sous le compte Google :  
> **`Hamidi.salma54@gmail.com`**

1. Ouvrez votre navigateur (Chrome recommandé).
2. Vérifiez en haut à droite que votre photo/avatar correspond bien à **`Hamidi.salma54@gmail.com`** (déconnectez-vous des autres comptes si besoin ou ouvrez une session dédiée).

---

## 2. Création du Fichier Google Sheets

1. Rendez-vous sur [sheets.google.com](https://sheets.google.com/).
2. Cliquez sur **+ Créer une feuille de calcul vide**.
3. Renommez le classeur en haut à gauche :  
   `Hanna — RSVP Henna Day`

---

## 3. Installation du Code Apps Script

1. Dans le menu en haut du classeur, cliquez sur :  
   **Extensions** > **Apps Script**
2. Un nouvel onglet s'ouvre avec l'éditeur de code Google Apps Script.
3. Effacez le contenu existant par défaut (`function myFunction() { ... }`).
4. Ouvrez le fichier local [`google-apps-script/Code.gs`](file:///Users/soufianeelrhadi/Desktop/Mariage/Hanna/google-apps-script/Code.gs) dans le projet Hanna, copiez l'intégralité du code et collez-le dans l'éditeur Apps Script.
5. Cliquez sur l'icône **Enregistrer** (disquette) en haut.

---

## 4. Initialisation Automatique du Tableau (`setupHanna`)

1. Dans la barre d'outils Apps Script, assurez-vous que la fonction sélectionnée est **`setupHanna`**.
2. Cliquez sur le bouton **Exécuter** (icône ▶).
3. **Autorisation Google requise (première fois uniquement)** :
   - Une boîte de dialogue s'affiche : *« Autorisation requise »* -> Cliquez sur **Examiner les autorisations**.
   - Sélectionnez votre compte `Hamidi.salma54@gmail.com`.
   - Si un écran *« Google n'a pas validé cette application »* s'affiche, cliquez en bas à gauche sur **Paramètres avancés**, puis sur **Accéder à (nom du projet) (non sécurisé)**.
   - Cliquez sur **Autoriser**.
4. L'exécution se termine en quelques secondes.
5. Revenez sur l'onglet de votre Google Sheet : vous constatez que **trois feuilles** ont été créées et mises en forme automatiquement :
   - **`INVITES`** : liste des invités avec colonnes formatées et colorées en vert émeraude.
   - **`DASHBOARD`** : tableau de bord avec les compteurs en temps réel.
   - **`LOGS`** : journal des requêtes et confirmations.

---

## 5. Déploiement du Web App (API RSVP)

Pour que le site Netlify puisse enregistrer les réponses en direct, il faut publier le script sous forme d'application Web :

1. Dans Apps Script, cliquez sur le bouton bleu **Déployer** (en haut à droite) > **Nouveau déploiement**.
2. Cliquez sur l'icône d'engrenage à gauche de *« Sélectionner le type »* et choisissez **Application Web**.
3. Remplissez les champs comme suit :
   - **Description** : `Hanna Production RSVP API`
   - **Exécuter en tant que** : **Moi (Hamidi.salma54@gmail.com)**
   - **Qui a accès** : **Tout le monde** *(Anyone)*  
     *(Nécessaire pour que les invités puissent envoyer leur RSVP depuis leur navigateur mobile ou desktop sans avoir besoin de se connecter à un compte Google)*.
4. Cliquez sur **Déployer**.
5. Copiez l'**URL de l'application Web** fournie.  
   > [!IMPORTANT]
   > L'URL doit impérativement se terminer par **`/exec`** (et non `/dev`).  
   > *Exemple : `https://script.google.com/macros/s/AKfycbx.../exec`*

---

## 6. Configuration sur Netlify

1. Connectez-vous à votre tableau de bord [Netlify](https://app.netlify.com/).
2. Cliquez sur le site **`hannasalma`** (ou rendez-vous dans `Site configuration`).
3. Allez dans **Environment variables** (Variables d'environnement).
4. Cliquez sur **Add a variable** :
   - **Key** : `VITE_RSVP_ENDPOINT`
   - **Value** : Collez l'URL de votre Web App copiée à l'étape 5 (`https://script.google.com/macros/s/.../exec`).
5. Cliquez sur **Save**.
6. Rendez-vous dans l'onglet **Deploys** > **Trigger deploy** > **Deploy site** pour compiler le site avec la nouvelle variable.

---

## 7. Gestion et Ajout des Invités

### Étape A : Ajouter les noms dans la feuille `INVITES`
Dans la feuille **`INVITES`**, remplissez simplement les colonnes :
- **PRENOM** (ex: `Sarah`)
- **NOM** (ex: `Benali`)
- **MAX_PERSONNES** (ex: `2` si elle peut venir avec un accompagnant, ou `4` par défaut)
- **ACTIF** : laissez vide ou mettez `TRUE`

Laissez les colonnes **`CODE`** et **`LIEN_INVITATION`** vides.

### Étape B : Générer les codes et les liens
1. Allez dans Google Apps Script.
2. Sélectionnez la fonction **`generateMissingInviteCodes`** dans la liste déroulante en haut.
3. Cliquez sur **Exécuter** (▶).
4. Revenez dans votre Google Sheet :
   - Un code unique non devinable (ex: `HN-K8N2P4X7M9ZQ`) a été généré pour chaque nouvel invité.
   - La colonne **`LIEN_INVITATION`** contient l'URL personnalisée complète :  
     `https://hannasalma.netlify.app/?code=HN-K8N2P4X7M9ZQ`
5. Vous n'avez plus qu'à copier ce lien et l'envoyer par WhatsApp / SMS à l'invité !

---

## 8. Test Fonctionnel de Bout en Bout

1. Ouvrez un lien d'invitation généré dans un navigateur (ex: navigation privée sur smartphone ou desktop).
2. Cliquez sur l'enveloppe -> admiration du retournement lent -> ouverture -> extraction continue.
3. La carte finale s'affiche avec :
   - L'heure corrigée : **« À PARTIR DE 18H »**.
   - Le nouveau **S** calligraphique élégant de Salma.
   - Le RSVP épuré dans l'espace vide inférieur.
4. Cliquez sur **Présent(e)** :
   - Le sélecteur du nombre de personnes (1 à 4) apparaît discrètement.
   - Choisissez par exemple **3**.
   - Cliquez sur **Valider**.
5. La carte s'envole gracieusement vers le haut et le message de remerciement s'affiche.
6. Ouvrez votre Google Sheet :
   - Dans **`INVITES`** : la ligne de l'invité indique `RSVP = PRESENT`, `NB_PERSONNES = 3`, `NB_ACCOMPAGNANTS = 2`, avec la date et l'heure de réponse.
   - Dans **`DASHBOARD`** : tous les compteurs (Total Présents, Total Personnes, Total Accompagnants) sont recalculés automatiquement.
7. Si le même invité réouvre son lien plus tard, son choix précédent est restauré et il peut modifier sa réponse sans créer de doublon.
