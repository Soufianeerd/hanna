# Hanna — Invitation Digitale Interactive de Henna Day

Site officiel en production : [https://hannasalma.netlify.app/](https://hannasalma.netlify.app/)  
Dépôt GitHub : [https://github.com/Soufianeerd/hanna.git](https://github.com/Soufianeerd/hanna.git)

---

## 1. Présentation Hanna

**Hanna** est une invitation de mariage digitale interactive haut de gamme (*Quiet Luxury*) dédiée à la célébration du **Henna Day de Salma**.

L'expérience transporte l'invité à travers une mise en scène physique continue :
1. **Écran initial ivoire (#F7F4EC)** : une atmosphère épurée et chaleureuse.
2. **Arrivée de l'enveloppe** : surgissement fluide depuis le bas avec stabilisation en apesanteur.
3. **Flottement permanent (idle)** : mouvement doux et organique invitant à l'interaction.
4. **Accompagnement musical** : introduction musicale rythmée pendant l'expérience d'ouverture.
5. **Retournement 3D & Sceau** : rotation fluide vers le dos mettant en valeur le sceau de cire doré.
6. **Ouverture & Extraction** : rupture du sceau, rabat ouvert, et extraction continue de la carte d'invitation sans à-coups.
7. **Présentation Continue (Card Presenting)** : la carte se détache, continue naturellement d'avancer vers l'utilisateur, grandit progressivement et se cale avec douceur dans l'écran visible.
8. **Invitation Plein Écran Sécurisée** : la carte s'adapte au Visual Viewport réel d'iOS Safari pour garantir que l'intégralité du visuel et du RSVP restent visibles sans être masqués par les barres de navigation.
9. **RSVP Épuré & Cartographie** : confirmation de présence (`Présent(e)` / `Absent(e)`) et redirection directe vers Google Maps pour la salle.
10. **Enregistrement Google Sheets** : liaison en temps réel via Google Apps Script vers la feuille privée de Salma (`Hamidi.salma54@gmail.com`).

---

## 2. Stack Technique

- **Langage / Core** : HTML5 sémantique, CSS3 Vanilla moderne (variables CSS, transform 3D, flex/grid, container queries `cqi`).
- **Typographie** : *Great Vibes* (calligraphie élégante du S de Salma), *Alex Brush* (script complémentaire), *Cinzel* & *Cinzel Decorative* (titres d'inspiration romaine), *Cormorant Garamond* (corps de texte et RSVP).
- **Moteur d'Animation** : GSAP 3 (GreenSock Animation Platform) en Vanilla JS pur.
- **Audio** : HTMLAudioElement avec gestion fine de l'autoplay mobile, déclenchement synchrone au `pointerdown`, fondu progressif (*fade out*) et bouton mute tactile discret.
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
  - `README_AUDIO.md` : Guide pour déposer le fichier audio d'intro.

---

## 5. Animation et Scénario Visuel

Le cycle complet est géré par une machine à états stricte (`experienceState.js`) :
- **`IDLE`** : Flottement subtil de l'enveloppe fermée (mouvement vertical, micro-tangage et ombre réactive).
- **`FLIPPING`** : Neutralisation de l'idle et retournement 3D à 180° autour de l'axe central.
- **`BACK_SEAL`** : Révélation du dos et du sceau de cire.
- **`OPENING`** : Le sceau disparaît doucement, le rabat supérieur s'ouvre, révélant la tête de la carte d'invitation.
- **`CARD_EXTRACTING`** : La carte monte progressivement hors de la poche et se redresse.
- **`CARD_PRESENTING`** : Transition continue vers l'avant : la carte grandit progressivement et se rapproche doucement de l'utilisateur pendant que l'enveloppe s'efface (aucun saut DOM ni téléportation).
- **`CARD_READY`** : La carte est calée à sa taille finale optimale, la musique s'estompe en fondu doux (~0.8s), et le RSVP apparaît.
- **`SENDING`** : Après validation du RSVP, la carte s'envole vers le haut avec une perspective aérienne.
- **`CONFIRMED`** : Message final de remerciement aux invités.

---

## 6. Responsive Mobile & Visual Viewport

Sur smartphone (testé sur iPhone 390×844, 393×852, 430×932) :
- **Mesure Visual Viewport** : L'affichage calcule en direct la hauteur réellement visible de Safari (déduction faite des barres d'adresse, barres d'onglets et safe areas).
- **Zéro Rognage** : La carte entière et le bloc RSVP sont **100% visibles sans nécessiter de scroll**.
- **Proportions Strictes** : Le ratio natif de `941 / 1672` est strictement respecté.
- **Fond Continu** : Le fond adopte l'ivoire exact de la carte (`#F7F4EC`), offrant l'impression d'une invitation plein écran continue.

Sur ordinateur de bureau (*desktop*) :
- La carte se centre élégamment avec une hauteur maximale de `94dvh` et une largeur proportionnelle.

---

## 7. Gestion Audio

> [!IMPORTANT]
> **Fichier audio non inclus dans Git** : Le code audio est prêt et testé, mais le fichier audio n'est pas fourni dans le dépôt GitHub pour des raisons de droits.  
> Pour activer la musique, déposez un fichier audio autorisé nommé **`lilet-elhena-intro.mp3`** dans le dossier **`assets/hanna/audio/`**.  
> Si le fichier est absent, le système masque automatiquement le bouton de son sans bloquer l'expérience.

- **Comportement intelligent** :
  - Préchargement automatique (`preload: auto`).
  - Démarrage instantané au premier `pointerdown` tactile de l'invité sur l'enveloppe (méthode native la plus fiable pour iOS Safari).
  - La musique continue pendant le flip, l'ouverture, l'extraction et la présentation continue.
  - Fin automatique en fondu doux (`fade out` de 0.8 seconde) dès que l'état `CARD_READY` est atteint.
  - Bouton mute discret en haut à droite avec une cible tactile de 42×42px.
  - Pas de boucle sonore (`loop: false`).

---

## 8. Système RSVP Épuré (Sans Accompagnants)

Le RSVP est épuré et adapté au tactile :
- **Choix du statut** :
  - `Présent(e)` : Sélectionne la présence.
  - `Absent(e)` : Sélectionne l'absence.
- **Bouton Valider** : Souligné, élégant et lisible.
- **Typographie responsive** : Tailles adaptées via `cqi` (container query inline size) pour une lisibilité parfaite sur smartphone.
- **Zone tactile** : Boutons tactiles avec zone active ≥ 42px.
- **Modification possible** : Un invité rouvrant son lien personnel retrouve sa réponse précédente pré-remplie et peut la modifier.
- **Mode Démo** : Si aucun paramètre `?code=` n'est présent dans l'URL en production, la carte reste consultable mais le bouton RSVP indique discrètement que la réponse nécessite un code invité.

---

## 9. Google Apps Script (`Code.gs`)

Le fichier source complet est situé dans `google-apps-script/Code.gs` :
- **Actions supportées** :
  - `getGuest` : Récupère le prénom et le statut `rsvp` actuel pour le code invité donné.
  - `saveRsvp` : Valide et enregistre la réponse de l'invité (`PRESENT` ou `ABSENT`) de manière atomique.
- **Sécurité & Concurrence** :
  - Utilisation systématique de `LockService.getScriptLock()` avec timeout de 10 secondes pour éviter toute corruption concurrente de la feuille de calcul.
  - Migration automatique : si une feuille contient d'anciennes colonnes, la fonction `migrateLegacyInviteSheet_()` réorganise les données automatiquement sans perte.

---

## 10. Structure du Google Sheet (8 Colonnes)

Le classeur Google Sheets généré automatiquement par `setupHanna()` comporte 3 feuilles :

### Feuille `INVITES`
| Colonne | Nom | Description |
|---|---|---|
| A | **CODE** | Identifiant unique non devinable (ex: `HN-A7K3Q9M2P8ZX`) |
| B | **PRENOM** | Prénom de l'invité |
| C | **NOM** | Nom de famille |
| D | **RSVP** | `PRESENT`, `ABSENT` ou vide |
| E | **DATE_REPONSE** | Date et heure de la première réponse enregistrée |
| F | **UPDATED_AT** | Date et heure de la dernière mise à jour |
| G | **ACTIF** | `TRUE` pour autoriser la réponse, `FALSE` pour désactiver |
| H | **LIEN_INVITATION** | Lien personnalisé direct envoyé à l'invité |

### Feuille `DASHBOARD`
Calculé automatiquement côté serveur après chaque soumission de réponse :
- **TOTAL INVITATIONS ACTIVES** : Nombre total d'invitations avec `ACTIF = TRUE`.
- **RÉPONSES REÇUES** : Nombre de réponses reçues (`PRESENT` ou `ABSENT`).
- **EN ATTENTE** : Invitations sans réponse.
- **PRÉSENTS** : Nombre d'invitations ayant répondu `PRESENT`.
- **ABSENTS** : Nombre d'invitations ayant répondu `ABSENT`.

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
10. Accepter les autorisations Google (Paramètres avancés > Accéder à Hanna RSVP > Autoriser).
11. Revenir sur le Google Sheet : les feuilles `INVITES`, `DASHBOARD` et `LOGS` sont maintenant créées et formatées.

---

## 12. Déploiement du Web App Google Apps Script

1. Dans l'éditeur Apps Script, cliquer sur le bouton bleu **Déployer** (en haut à droite) > **Nouveau déploiement**.
2. Choisir le type **Application Web**.
3. Remplir la configuration :
   - **Description** : `Production RSVP Hanna v2`
   - **Exécuter en tant que** : **Moi (Hamidi.salma54@gmail.com)**
   - **Qui a accès** : **Tout le monde** (*Anyone*)
4. Cliquer sur **Déployer**.
5. **Copier l'URL se terminant par `/exec`** (Exemple : `https://script.google.com/macros/s/AKfycbx.../exec`).

---

## 13. Configuration Netlify

1. Se connecter à [Netlify](https://app.netlify.com/).
2. Accéder au site **`hannasalma`**.
3. Aller dans **Site configuration** > **Environment variables**.
4. Ajouter ou mettre à jour :
   - **Key** : `VITE_RSVP_ENDPOINT`
   - **Value** : Coller l'URL du Web App Google Apps Script (terminant par `/exec`).
5. Aller dans l'onglet **Deploys** > **Trigger deploy** > **Deploy site**.

---

## 14. Génération des Liens Invités et Procédure de Test

### Création des invités
1. Dans la feuille `INVITES`, remplir simplement les colonnes B, C et G :
   - `PRENOM` : Ex. `Salma`
   - `NOM` : Ex. `Dupont`
   - `ACTIF` : `TRUE`
2. Dans Apps Script, exécuter **`generateMissingInviteCodes`**.
3. Le script génère automatiquement `CODE` et `LIEN_INVITATION`.
4. Envoyer le lien personnel à l'invité.

### Test de validation
1. Ouvrir le lien personnel généré sur smartphone.
2. Toucher l'enveloppe : ouverture fluide, extraction, et présentation continue de la carte sans sursaut.
3. Vérifier que la carte et le RSVP tiennent à 100% dans la zone visible.
4. Cliquer sur **Présent(e)** > **Valider**.
5. Vérifier dans Google Sheets : `RSVP = PRESENT`, et le `DASHBOARD` s'actualise immédiatement.

---

## 15. Dépannage et FAQ

- **Le bas de la carte ou le RSVP est-il coupé par Safari ?**  
  Non, le système utilise l'API `window.visualViewport` pour calculer en temps réel la zone utile de Safari en déduisant les barres d'outils et les encoches.
- **La musique ne démarre pas ?**  
  Vérifiez qu'un fichier audio nommé `lilet-elhena-intro.mp3` est bien déposé dans `assets/hanna/audio/`. Sur mobile, la lecture se déclenche au premier toucher de l'enveloppe.
- **Erreur `Cette invitation ne permet pas d'enregistrer une réponse` ?**  
  L'utilisateur a ouvert le site sans code invité (`?code=...`) ou le code n'est pas actif dans Google Sheets.
