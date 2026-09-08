# Hanna — Invitation Digitale Interactive de Henna Day

Site officiel en production : [https://hannasalma.netlify.app/](https://hannasalma.netlify.app/)  
Dépôt GitHub : [https://github.com/Soufianeerd/hanna.git](https://github.com/Soufianeerd/hanna.git)

---

## 1. Présentation Hanna

**Hanna** est une invitation de mariage digitale interactive haut de gamme (*Quiet Luxury*) dédiée à la célébration du **Henna Day de Salma**.

L'expérience transporte l'invité à travers une mise en scène physique et fluide :
1. **Écran initial ivoire (#F7F4EC)** : une atmosphère épurée et solennelle.
2. **Arrivée de l'enveloppe** : surgissement fluide depuis le bas avec stabilisation en apesanteur.
3. **Flottement permanent (idle)** : mouvement doux et organique invitant à l'interaction.
4. **Accompagnement musical** : introduction musicale traditionnelle (« Lilet Elhena ») rythmée pendant l'expérience d'ouverture.
5. **Retournement 3D & Sceau** : rotation fluide vers le dos mettant en valeur le sceau de cire doré.
6. **Ouverture & Extraction** : rupture du sceau, rabat ouvert, et extraction continue de la carte d'invitation sans à-coups.
7. **Invitation Plein Écran** : sur mobile, la carte devient l'écran lui-même (largeur 100vw, ratio préservé sans découpe).
8. **RSVP Interactif & Cartographie** : confirmation de présence avec sélection d'accompagnants (1 à 4 personnes) et redirection directe vers Google Maps pour la salle.
9. **Enregistrement Google Sheets** : liaison en temps réel via Google Apps Script vers la feuille privée de Salma (`Hamidi.salma54@gmail.com`).

---

## 2. Stack Technique

- **Langage / Core** : HTML5 sémantique, CSS3 Vanilla moderne (variables CSS, transform 3D, flex/grid).
- **Typographie** : *Great Vibes* (calligraphie du S de Salma), *Alex Brush* (script complémentaire), *Cinzel* & *Cinzel Decorative* (titres et majuscules d'inspiration romaine), *Cormorant Garamond* (corps de texte élégant).
- **Moteur d'Animation** : GSAP 3 (GreenSock Animation Platform) en Vanilla JS pur.
- **Audio** : HTMLAudioElement avec gestion fine de l'autoplay mobile, fondu progressif (*fade out*) et bouton mute tactile discret.
- **Backend Serverless** : Google Apps Script (`Code.gs`) connecté à Google Sheets (`INVITES`, `DASHBOARD`, `LOGS`).
- **Hébergement & Déploiement** : Netlify (build Vite Vanilla JS).
- **Philosophie** : Zéro framework lourd (pas de React, Vue, Tailwind ou Three.js). Performances 60 FPS garanties sur smartphone.

---

## 3. Installation et Démarrage Local

### Prérequis
- Node.js (v18 ou supérieure)
- Gestionnaire de paquets `npm`

### Commandes
```bash
# Cloner le dépôt
git clone https://github.com/Soufianeerd/hanna.git
cd Hanna

# Installer les dépendances
npm install

# Lancer le serveur local de développement
npm run dev
# Accessible sur http://localhost:5173/

# Construire pour la production
npm run build
```

---

## 4. Assets du Projet

Tous les fichiers statiques résident dans le dossier `assets/hanna/` :
- `envelope/` :
  - `envelope-front.png` : Face avant de l'enveloppe fermée.
  - `envelope-back-closed.png` : Dos de l'enveloppe fermée.
  - `envelope-seal.png` : Sceau de cire doré indépendant.
  - `envelope-open-bg.png` : Fond de l'enveloppe ouverte (intérieur ivoire et rabat relevé).
  - `envelope-open-pocket.png` : Poche avant de l'enveloppe ouverte maintenant la carte insérée.
- `invitation/` :
  - `carteInvitation.png` (941 × 1672) : Modèle de référence original intact (pompons, table traditionnelle en laiton, calligraphie arabe).
  - `card-paper-patch.png` : Bande de papier ivoire texturée échantillonnée directement sur la carte pour les patchs chirurgicaux.
- `audio/` :
  - `lilet-elhena-intro.mp3` : Fichier audio d'introduction (à déposer manuellement dans ce dossier).

---

## 5. Animation et Scénario Visuel

Le cycle complet est géré par une machine à états stricte (`experienceState.js`) :
- **`IDLE`** : Flottement subtil de l'enveloppe fermée (mouvement vertical, micro-tangage et ombre réactive).
- **`FLIPPING`** : Neutralisation de l'idle et retournement 3D à 180° autour de l'axe central.
- **`BACK_SEAL`** : Révélation du dos et du sceau de cire.
- **`OPENING`** : Le sceau disparaît doucement, le rabat supérieur s'ouvre, révélant la tête de la carte d'invitation.
- **`EXTRACTING`** : La carte monte progressivement hors de la poche, pivote avec fluidité sans collision.
- **`CARD_READY`** : L'enveloppe s'efface, la musique s'estompe en fondu doux (~0.8s), et la carte s'impose au premier plan.
- **`SENDING`** : Après validation du RSVP, la carte s'envole vers le haut avec une perspective aérienne.
- **`CONFIRMED`** : Message final de remerciement aux invités.

---

## 6. Responsive Mobile & Immersion Plein Écran

Sur smartphone (écran ≤ 600px, testé sur iPhone 390×844, 393×852, 430×932) :
- **Largeur Pleine** : La carte occupe **100vw** de l'écran pour une présence imposante.
- **Proportions Respectées** : Le ratio natif de `941 / 1672` est strictement conservé. Aucun élément décoratif (pompons, table, broderies) n'est rogné ou masqué.
- **Fond Continu** : Le fond du viewport adopte exactement l'ivoire de la carte (`#F7F4EC`), offrant l'illusion d'une invitation papier plein écran continue.
- **Zéro Aspect Modal** : Pas de bordure arrondie artificielle, pas d'ombre excessive sur mobile.

Sur ordinateur de bureau (*desktop*) :
- La carte se centre élégamment avec une hauteur maximale de `94dvh` et une largeur proportionnelle.

---

## 7. Gestion Audio

- **Fichier attendu** : `assets/hanna/audio/lilet-elhena-intro.mp3`.
- **Comportement intelligent** :
  - Préchargement automatique (`preload: auto`).
  - Démarrage dès le premier geste utilisateur (clic ou tap sur l'enveloppe) pour contourner les restrictions strictes d'autoplay sur iOS Safari et Chrome Mobile.
  - Fin automatique en fondu doux (`fade out` de 0.8 seconde) dès que l'état `CARD_READY` est atteint.
  - Volume de confort calibré à **0.28** pour rester discret en arrière-plan.
  - Pas de boucle sonore (`loop: false`).
  - Sécurité délai max : si l'utilisateur ne clique pas sur l'enveloppe après 20 secondes, la musique s'arrête.
  - Bouton de sourdine discret (*mute toggle*) en haut à droite avec une cible tactile de 42×42px.

---

## 8. Système RSVP & Accompagnants

Le formulaire RSVP est intégré de façon invisible dans la zone ivoire disponible de la carte :
- **Choix du statut** :
  - `Présent(e)` : Déploie immédiatement la sélection du nombre total de personnes.
  - `Absent(e)` : Masque la sélection et fixe le nombre de personnes à `0`.
- **Nombre total de personnes** :
  - Boutons interactifs `[ 1 ] [ 2 ] [ 3 ] [ 4 ]`.
  - Le nombre inclut l'invité principal (1 = seul, 2 = invité + 1 accompagnant, etc.).
  - Le maximum affiché est dynamiquement limité par la propriété `MAX_PERSONNES` de l'invité dans le Google Sheet.
- **Modification possible** : Un invité rouvrant son lien personnel retrouve sa réponse précédente pré-remplie et peut la modifier.
- **Mode Démo** : Si aucun paramètre `?code=` n'est présent dans l'URL en production, la carte reste consultable mais le bouton RSVP indique discrètement que la réponse n'est pas enregistrable sans lien personnel.

---

## 9. Google Apps Script (`Code.gs`)

Le fichier source complet est situé dans `google-apps-script/Code.gs` :
- **Actions supportées** :
  - `getGuest` : Récupère le prénom, `maxPartySize`, `rsvp` actuel et `partySize` pour le code invité donné.
  - `saveRsvp` : Valide et enregistre la réponse de l'invité de manière atomique.
- **Sécurité & Concurrence** :
  - Utilisation systématique de `LockService.getScriptLock()` avec timeout de 10 secondes pour éviter toute corruption concurrente de la feuille de calcul.
  - Aucune information personnelle (nom complet, coordonnées des autres invités) n'est jamais exposée par l'API.

---

## 10. Structure du Google Sheet

Le classeur Google Sheets généré automatiquement par `setupHanna()` comporte 3 feuilles :

### Feuille `INVITES`
| Colonne | Nom | Description |
|---|---|---|
| A | **CODE** | Identifiant unique non devinable (ex: `HN-A7K3Q9M2P8ZX`) |
| B | **PRENOM** | Prénom de l'invité |
| C | **NOM** | Nom de famille |
| D | **MAX_PERSONNES** | Nombre maximal de personnes autorisées (1 à 4) |
| E | **RSVP** | `PRESENT`, `ABSENT` ou vide |
| F | **NB_PERSONNES** | Total de personnes venant (1 à 4 si Présent, 0 si Absent) |
| G | **NB_ACCOMPAGNANTS** | Accompagnants uniquement (`partySize - 1` si Présent, 0 sinon) |
| H | **DATE_REPONSE** | Date et heure de la première réponse enregistrée |
| I | **UPDATED_AT** | Date et heure de la dernière mise à jour |
| J | **ACTIF** | `TRUE` pour autoriser la réponse, `FALSE` pour désactiver |
| K | **LIEN_INVITATION** | Lien personnalisé direct envoyé à l'invité |

### Feuille `DASHBOARD`
Calculé automatiquement côté serveur après chaque soumission de réponse :
- **TOTAL INVITATIONS ACTIVES** : Nombre total d'invitations avec `ACTIF = TRUE`.
- **RÉPONSES REÇUES** : Nombre de réponses reçues (`PRESENT` ou `ABSENT`).
- **EN ATTENTE** : Invitations sans réponse.
- **PRÉSENTS** : Nombre d'invitations ayant répondu `PRESENT`.
- **ABSENTS** : Nombre d'invitations ayant répondu `ABSENT`.
- **TOTAL PERSONNES ATTENDUES** : Somme réelle des personnes attendues (invités + accompagnants).
- **TOTAL ACCOMPAGNANTS** : Somme des accompagnants seuls.

### Feuille `LOGS`
Journalisation horodatée des requêtes `GET_GUEST` et `SAVE_RSVP` pour traçabilité et diagnostic.

---

## 11. Guide Pas-à-Pas pour Salma (Compte Google)

> [!IMPORTANT]
> Le classeur Google Sheets doit obligatoirement être créé sur le compte de Salma : **`Hamidi.salma54@gmail.com`**.

1. Se déconnecter de tout autre compte Google personnel ou ouvrir une fenêtre de navigation privée.
2. Se connecter avec l'adresse **`Hamidi.salma54@gmail.com`**.
3. Se rendre sur [Google Sheets](https://sheets.google.com).
4. Créer une nouvelle feuille de calcul vierge et la nommer : **`Hanna — RSVP Henna Day`**.
5. Dans le menu, cliquer sur **Extensions** > **Apps Script**.
6. Supprimer le contenu par défaut de l'éditeur (`myFunction`).
7. Ouvrir le fichier [`google-apps-script/Code.gs`](google-apps-script/Code.gs) du projet, copier l'intégralité du texte et le coller dans l'éditeur Apps Script.
8. Cliquer sur l'icône de disquette (**Enregistrer le projet**).
9. Dans le sélecteur de fonction en haut, choisir **`setupHanna`** et cliquer sur **Exécuter**.
10. Une fenêtre d'autorisation Google apparaît :
    - Cliquer sur *Examiner les autorisations*.
    - Choisir le compte *Hamidi.salma54@gmail.com*.
    - Cliquer sur *Paramètres avancés* puis sur *Accéder à Hanna RSVP (non sécurisé)*.
    - Cliquer sur *Autoriser*.
11. Revenir sur le Google Sheet : les feuilles `INVITES`, `DASHBOARD` et `LOGS` sont maintenant créées et formatées.

---

## 12. Déploiement du Web App Google Apps Script

1. Dans l'éditeur Apps Script, cliquer sur le bouton bleu **Déployer** (en haut à droite) > **Nouveau déploiement**.
2. Cliquer sur l'icône d'engrenage à côté de *Sélectionner un type* et choisir **Application Web**.
3. Remplir la configuration suivante :
   - **Description** : `Production RSVP Hanna v1`
   - **Exécuter en tant que** : **Moi (Hamidi.salma54@gmail.com)**
   - **Qui a accès** : **Tout le monde** (*Anyone*)
4. Cliquer sur **Déployer**.
5. Google affiche l'URL de l'application Web.
6. **Copier l'URL se terminant par `/exec`** (Exemple : `https://script.google.com/macros/s/AKfycbx.../exec`).  
   *(Attention : ne jamais copier l'URL se terminant par `/dev`).*

---

## 13. Configuration Netlify

1. Se connecter à [Netlify](https://app.netlify.com/).
2. Accéder au site **`hannasalma`** (ou au dashboard de production).
3. Aller dans **Site configuration** > **Environment variables**.
4. Cliquer sur **Add a variable** > **Add a single variable** :
   - **Key** : `VITE_RSVP_ENDPOINT`
   - **Value** : Coller l'URL du Web App Google Apps Script copiée à l'étape précédente (se terminant par `/exec`).
5. Aller dans l'onglet **Deploys** > **Trigger deploy** > **Deploy site**.
6. Une fois le déploiement terminé, le site de production est connecté en direct au Google Sheet.

---

## 14. Génération des Liens Invités et Procédure de Test

### Création des invités
1. Dans la feuille Google Sheets `INVITES`, ajouter manuellement les invités sur les colonnes B, C, D et J :
   - `PRENOM` : Ex. `Salma`
   - `NOM` : Ex. `Dupont`
   - `MAX_PERSONNES` : Ex. `4` (ou `2` pour un couple)
   - `ACTIF` : `TRUE`
2. Dans Apps Script, sélectionner la fonction **`generateMissingInviteCodes`** et cliquer sur **Exécuter**.
3. De retour sur la feuille, les colonnes `CODE` et `LIEN_INVITATION` ont été automatiquement générées avec des identifiants cryptographiques sécurisés.
4. Transmettre le lien de la colonne `LIEN_INVITATION` à l'invité (ex: `https://hannasalma.netlify.app/?code=HN-XXXXXXXXXXXX`).

### Protocole de Test
1. Ouvrir le lien généré dans un navigateur (sur mobile ou desktop).
2. Vérifier l'apparition de l'enveloppe et le flottement.
3. Cliquer sur l'enveloppe : l'audio d'intro démarre, l'enveloppe tourne à 180°, le sceau s'ouvre, la carte s'extrait.
4. À l'affichage de la carte : la musique s'estompe délicatement.
5. Vérifier que l'heure indique bien **`À PARTIR DE 18H`** et que le **S** de Salma est calligraphié.
6. Cliquer sur **Présent(e)** > Choisir **3 personnes** > Cliquer sur **Valider**.
7. Vérifier sur le Google Sheet :
   - `RSVP` = `PRESENT`
   - `NB_PERSONNES` = `3`
   - `NB_ACCOMPAGNANTS` = `2`
   - `DASHBOARD` : Les compteurs de présences se sont immédiatement actualisés.
8. Rouvrir le même lien, choisir **Absent(e)** > Valider.
9. Vérifier sur le Google Sheet :
   - `RSVP` = `ABSENT`
   - `NB_PERSONNES` = `0`
   - `NB_ACCOMPAGNANTS` = `0`
   - `DASHBOARD` : Compteurs mis à jour instantanément.

---

## 15. Dépannage et FAQ

- **Le son ne démarre pas immédiatement sur iPhone ?**  
  C'est le comportement normal d'iOS Safari pour économiser la batterie et la bande passante. Le gestionnaire audio précharge le flux et démarre le son dès le premier appui de l'invité sur l'enveloppe.
- **Erreur `Cette invitation ne permet pas d'enregistrer une réponse` ?**  
  L'utilisateur a ouvert le site sans code invité (`?code=...`) ou le code n'est plus marqué comme `ACTIF = TRUE` dans le Google Sheet.
- **Le RSVP ne s'enregistre pas sur Google Sheets ?**  
  Vérifier que la variable d'environnement `VITE_RSVP_ENDPOINT` sur Netlify contient bien l'URL `/exec` du Web App, que le déploiement a été redéclenché (*Trigger deploy*), et que le Web App Apps Script est bien configuré avec l'accès *« Tout le monde » (Anyone)*.
