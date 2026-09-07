# Hanna Invitation — Phase 0 & Phase 1

Projet d'invitation digitale interactive de Henna Day (**Quiet Luxury**).
Ce dépôt contient le socle géométrique, l'audit automatisé des assets et le banc d'essai technique de calibration interactif (Phases 0 et 1).

---

## 1. Concept du Projet

L'invitation propose une expérience immersive haut de gamme sur mobile et desktop :
1. Écran d'accueil ivoire
2. Arrivée de l'enveloppe par le bas et flottaison subtile
3. Interaction utilisateur (clic / tap) → Rotation 3D de 180° vers le dos
4. Présentation du sceau de cire doré
5. Rupture du sceau et ouverture du rabat supérieur
6. Carte d'invitation contenue physiquement à l'intérieur
7. Extraction réaliste de la carte : montée progressive + pivotement continu (conforme au scénario PDF)
8. Redressement de la carte vers la verticale
9. La carte devient l'interface principale (formulaire RSVP Présent / Absent)
10. Soumission de la réponse et glissement de la carte vers le haut (effet d'envoi postal).

---

## 2. Stack Technique

- **Langage / Core** : HTML5 sémantique, CSS3 Vanilla (variables, transforms 3D, flex/grid), JavaScript ES Modules natifs.
- **Outillage de Développement** : Vite Vanilla JavaScript (sans framework).
- **Audit des Assets** : Script Python autonome (`Pillow`) pour extraire les bounding boxes alpha et dimensions réelles.
- **Règles d'architecture** :
  - Aucun framework lourd (pas de React, Next.js, Vue, Tailwind, Angular, Three.js, etc.).
  - Pas encore de bibliothèque d'animation (GSAP sera introduit en Phase 2).
  - Aucun backend actif dans cette phase.

---

## 3. Installation et Démarrage

```bash
# Installation des dépendances Vite
npm install

# Démarrage du serveur de développement local
npm run dev

# Construction du bundle de production (vérification syntaxe / build)
npm run build
```

---

## 4. Structure du Projet

```text
hanna-invitation/
├── index.html                     # Point d'entrée HTML
├── package.json                   # Dépendances Vite
├── vite.config.js                 # Configuration Vite
├── .gitignore                     # Exclusions Git
│
├── public/
│   └── assets/
│       └── hanna/
│           ├── envelope/          # envelope-front, envelope-back-closed, envelope-seal, etc.
│           ├── invitation/        # carteInvitation.png
│           └── references/        # old-envelope-open.png, old-envelope-pocket.png
│
├── src/
│   ├── main.js                    # Point d'entrée applicatif et routage mode calibration
│   ├── styles/
│   │   ├── global.css             # Tokens Quiet Luxury & reset
│   │   └── calibration.css        # Styles sombres du banc de calibration
│   │
│   ├── config/
│   │   ├── assets.js              # Registre centralisé des 6 assets audités
│   │   └── geometry.js            # Coordonnées du stage et 11 key poses du PDF
│   │
│   ├── calibration/
│   │   ├── calibration.js         # Contrôleur d'événements, sliders et presets PDF
│   │   └── calibrationView.js     # Template DOM et composants de rendu
│   │
│   └── utils/
│       └── imageMetrics.js        # Utilitaires de conversion logique ↔ CSS
│
├── scripts/
│   └── analyze-assets.py          # Script Python Pillow d'audit des PNG
│
├── docs/
│   ├── scenarioAniationInvitation_compressed.pdf   # Scénario officiel de référence
│   ├── assets-analysis.json       # Données brutes de l'audit des images
│   └── animation-analysis.md      # Analyse page par page et matrice des poses
│
└── README.md
```

---

## 5. Rôle des Assets Fournis

| Fichier | Emplacement | Rôle dans l'application |
| :--- | :--- | :--- |
| `envelope-front.png` | `public/assets/hanna/envelope/` | Face avant de l'enveloppe (vert sauge, arabesques dorées). |
| `envelope-back-closed.png` | `public/assets/hanna/envelope/` | Dos fermé de l'enveloppe avec rabats repliés. |
| `envelope-seal.png` | `public/assets/hanna/envelope/` | Sceau de cire indépendant positionné sur le dos. |
| `old-envelope-open.png` | `public/assets/hanna/references/` | Référence de calibration de l'enveloppe grande ouverte. |
| `old-envelope-pocket.png` | `public/assets/hanna/envelope/` | Poche avant inférieure servant de masque physique à la carte. |
| `carteInvitation.png` | `public/assets/hanna/invitation/` | Carte d'invitation complète servant de référence visuelle. |

*Note : Les images originales sont préservées intactes sans retouche physique, recadrage ni recompression.*

---

## 6. Convention Géométrique du Stage Logique

Afin de garantir une indépendance totale vis-à-vis du viewport et une parfaite fluidité responsive :
- **Largeur logique (`STAGE_WIDTH`)** : `1600`
- **Hauteur logique (`STAGE_HEIGHT`)** : `1000`
- **Centre exact (`0, 0`)** : Coordonnées `x = 0, y = 0` au centre du stage
- **Axe X** : Positif vers la droite (`+X`), négatif vers la gauche (`-X`)
- **Axe Y** : Positif vers le bas (`+Y`), négatif vers le haut (`-Y`)
- **Adaptation Responsive** : Le stage logique de 1600×1000 est mis à l'échelle via CSS `transform: scale(...)` de façon isotrope pour s'adapter aussi bien sur desktop (1440×900) que sur mobile (390×844) sans jamais modifier les coordonnées internes.

---

## 7. Mode Calibration

Le banc de calibration technique sombre est accessible directement via :
```text
http://localhost:5173/?dev=calibration
```
(ou en cliquant sur le bouton « Ouvrir la Calibration » depuis l'accueil).

### Fonctionnalités du banc :
- **Onglet A. CLOSED FRONT** : Ajustement de la face avant.
- **Onglet B. CLOSED BACK** : Ajustement indépendant du dos fermé et du sceau de cire.
- **Onglet C. OPEN REFERENCE** : Visualisation de l'enveloppe ouverte avec relevé des points clés.
- **Onglet D. CARD + POCKET** : Empilement réel (Fond → Carte → Poche masque) avec **11 boutons de sélection rapide des poses du PDF** (`P12` à `P26`).
- **Onglet E. INDIVIDUAL ASSETS** : Inspecteur détaillé de chaque PNG avec bounding box visible, couverture canvas et ratios.
- **Outils** : Bascule Grille (100px / 20px), Axes (X/Y), Bounding Boxes, Alpha Bounds, Coordonnées curseur en temps réel, Copie JSON complète dans le presse-papier et Réinitialisation.

---

## 8. État du Développement

- [x] **Phase 0** : Initialisation du projet Vite Vanilla JS, arborescence propre, audit automatisé des PNG par script Python, extraction des bounding boxes alpha.
- [x] **Phase 1** : Registre centralisé (`assets.js`, `geometry.js`), conventions du stage logique, analyse rigoureuse du PDF d'animation, création du banc de calibration interactif complet.
- [ ] **Phase 2 (En attente de validation)** : Apparition de l'enveloppe depuis le bas et flottaison continue (GSAP).
- [ ] **Phase 3** : Rotation 3D 180° et détachement du sceau.
- [ ] **Phase 4** : Ouverture du rabat et extraction dynamique de la carte (pivot + ascension).
- [ ] **Phase 5** : Formulaire interactif RSVP et animation de confirmation d'envoi.
