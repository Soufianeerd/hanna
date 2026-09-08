# Hanna — Guide Complet Google Sheets & Google Apps Script (RSVP)

Documentation officielle pour **Salma Hamidi** (`Hamidi.salma54@gmail.com`).  
Ce guide explique comment configurer et déployer le backend Google Sheets pour l'invitation interactive de Henna Day.

---

## 1. Vue d'ensemble de l'Architecture

Le site [https://hannasalma.netlify.app/](https://hannasalma.netlify.app/) est un site statique ultra-performant hébergé sur Netlify.
Lorsqu'un invité valide son RSVP (**Présent(e)** ou **Absent(e)**), le formulaire envoie directement sa réponse à un script Google Apps Script relié à votre feuille Google Sheets privée.

### Les 3 feuilles créées automatiquement :
1. **`INVITES`** : Liste de vos invités avec leurs codes personnalisés et leurs réponses.
2. **`DASHBOARD`** : Tableau récapitulatif des compteurs actualisé en temps réel (Actifs, Réponses reçues, En attente, Présents, Absents).
3. **`LOGS`** : Journal technique horodaté de toutes les consultations et réponses pour traçabilité.

---

## 2. Structure exacte de la feuille `INVITES` (8 Colonnes)

| Colonne | En-tête | Description |
|---|---|---|
| **A** | `CODE` | Identifiant sécurisé unique (ex: `HN-A7K3Q9M2P8ZX`). |
| **B** | `PRENOM` | Prénom de l'invité. |
| **C** | `NOM` | Nom de l'invité. |
| **D** | `RSVP` | Statut de la réponse (`PRESENT`, `ABSENT` ou vide si en attente). |
| **E** | `DATE_REPONSE` | Date et heure de la première validation. |
| **F** | `UPDATED_AT` | Date et heure de la dernière modification. |
| **G** | `ACTIF` | `TRUE` (invitation active) ou `FALSE` (désactivée). |
| **H** | `LIEN_INVITATION` | Lien personnel direct à envoyer à l'invité (ex: `https://hannasalma.netlify.app/?code=HN-...`). |

---

## 3. Configuration Initiale Pas-à-Pas

### Étape 1 : Connexion au bon compte Google
1. Vérifiez que vous êtes connectée avec l'adresse : **`Hamidi.salma54@gmail.com`**.
2. Ouvrez [Google Sheets](https://sheets.google.com).
3. Créez une nouvelle feuille de calcul vide et nommez-la : **`Hanna — RSVP Henna Day`**.

### Étape 2 : Ajout du Script Google Apps Script
1. Dans le menu de votre feuille, cliquez sur **Extensions** > **Apps Script**.
2. Un éditeur s'ouvre. Effacez le texte par défaut (`function myFunction() { ... }`).
3. Ouvrez le fichier [Code.gs](Code.gs), copiez l'intégralité du contenu et collez-le dans l'éditeur.
4. Cliquez sur l'icône de disquette (**Enregistrer**).

### Étape 3 : Exécution de l'initialisation (`setupHanna`)
1. En haut de l'éditeur, sélectionnez la fonction **`setupHanna`** dans le menu déroulant.
2. Cliquez sur le bouton **Exécuter**.
3. Google affiche une demande d'autorisation :
   - Cliquez sur **Examiner les autorisations**.
   - Choisissez votre compte **`Hamidi.salma54@gmail.com`**.
   - Cliquez sur **Paramètres avancés** (en bas à gauche du pop-up).
   - Cliquez sur **Accéder à Hanna RSVP (non sécurisé)**.
   - Cliquez sur **Autoriser**.
4. Revenez sur votre feuille Google Sheets : les feuilles `INVITES`, `DASHBOARD` et `LOGS` sont maintenant créées et formatées.

---

## 4. Déploiement du Web App Google Apps Script

1. Dans l'éditeur Apps Script, cliquez sur le bouton bleu **Déployer** (en haut à droite) > **Nouveau déploiement**.
2. Cliquez sur l'icône d'engrenage à côté de *Sélectionner un type* et choisissez **Application Web**.
3. Remplissez la configuration suivante :
   - **Description** : `Production RSVP Hanna v2`
   - **Exécuter en tant que** : **Moi (Hamidi.salma54@gmail.com)**
   - **Qui a accès** : **Tout le monde** (*Anyone*)
4. Cliquez sur **Déployer**.
5. Google génère l'URL de l'application Web.
6. **Copiez l'URL se terminant par `/exec`** (Exemple : `https://script.google.com/macros/s/AKfycbx.../exec`).

> [!WARNING]
> Copiez toujours l'URL se terminant par `/exec`. Ne jamais utiliser l'URL se terminant par `/dev`.

---

## 5. Liaison avec Netlify

1. Connectez-vous sur [Netlify](https://app.netlify.com/).
2. Ouvrez le site **`hannasalma`**.
3. Allez dans **Site configuration** > **Environment variables**.
4. Ajoutez ou modifiez la variable :
   - **Key** : `VITE_RSVP_ENDPOINT`
   - **Value** : Collez l'URL de votre Web App Apps Script (terminant par `/exec`).
5. Allez dans l'onglet **Deploys** > **Trigger deploy** > **Deploy site**.

---

## 6. Ajout des Invités et Génération Automatique des Liens

1. Dans la feuille **`INVITES`**, remplissez simplement les colonnes :
   - `PRENOM` (ex: `Salma`)
   - `NOM` (ex: `Dupont`)
   - `ACTIF` (mettre `TRUE`)
   *(Laissez les colonnes `CODE` et `LIEN_INVITATION` vides).*
2. Dans l'éditeur Apps Script, sélectionnez la fonction **`generateMissingInviteCodes`** et cliquez sur **Exécuter**.
3. De retour sur Google Sheets, les colonnes `CODE` et `LIEN_INVITATION` ont été automatiquement générées avec des codes sécurisés.
4. Il vous suffit de copier l'URL dans `LIEN_INVITATION` et de la transmettre à l'invité par SMS ou WhatsApp.

---

## 7. Tableau de Bord (`DASHBOARD`)

Le tableau de bord est recalculé automatiquement côté serveur à chaque réponse validée :
- **TOTAL INVITATIONS ACTIVES** : Nombre total d'invitations actives (`ACTIF = TRUE`).
- **RÉPONSES REÇUES** : Total des invités ayant déjà répondu.
- **EN ATTENTE** : Invités n'ayant pas encore répondu.
- **PRÉSENTS** : Nombre de confirmations `PRESENT`.
- **ABSENTS** : Nombre de réponses `ABSENT`.
- **DERNIÈRE MISE À JOUR** : Date et heure du dernier enregistrement.
