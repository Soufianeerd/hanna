# Hanna Invitation — Phase 2 : Apparition de l'Enveloppe & Flottement Idle

Projet d'invitation digitale interactive de Henna Day (**Quiet Luxury**).
Ce dépôt contient le socle géométrique calibré, le banc d'essai technique, ainsi que le moteur d'animation de la Phase 2 (apparition fluide de l'enveloppe, stabilisation et flottement permanent).

---

## 1. Concept du Projet

L'invitation propose une expérience immersive haut de gamme sur mobile et desktop :
1. **Écran initial ivoire (#F7F4EC)** (Phase 2 ✓)
2. **Apparition élégante de l'enveloppe depuis le bas et centrage avec micro-inertie** (Phase 2 ✓)
3. **Flottement permanent discret et organique (idle floating)** (Phase 2 ✓)
4. Interaction utilisateur (clic / tap) → Rotation 3D de 180° vers le dos (Phase 3)
5. Présentation du sceau de cire doré indépendant (Phase 3)
6. Rupture du sceau et ouverture du rabat supérieur (Phase 4)
7. Extraction réaliste de la carte : montée progressive + pivotement continu (Phase 4)
8. Redressement de la carte vers la verticale (Phase 4)
9. La carte devient l'interface principale (formulaire RSVP Présent / Absent) (Phase 5)
10. Soumission de la réponse et confirmation (Phase 5).

---

## 2. Stack Technique

- **Langage / Core** : HTML5 sémantique, CSS3 Vanilla (variables, transforms 3D, flex/grid), JavaScript ES Modules natifs.
- **Animation** : GSAP 3 (Vanilla JS, sans framework).
- **Outillage de Développement** : Vite Vanilla JavaScript.
- **Audit des Assets & Captures** : Python (`Pillow`), Headless Chrome CDP.
- **Règles d'architecture** :
  - Strictement aucun framework frontend (pas de React, Vue, Tailwind, Three.js).
  - Géométrie canonique verrouillée (`PHYSICAL_ENVELOPE` 820 × 490).
  - Séparation stricte des responsabilités de wrappers DOM.

---

## 3. Installation et Démarrage

```bash
# Installation des dépendances (Vite, GSAP)
npm install

# Démarrage du serveur de développement local
npm run dev

# Construction du bundle de production
npm run build
```

---

## 4. Structure du Projet

```text
Hanna/
├── index.html                     # Point d'entrée HTML
├── package.json                   # Dépendances Vite et GSAP
├── vite.config.js                 # Configuration Vite (publicDir: 'assets')
├── .gitignore                     # Exclusions Git
│
├── assets/
│   └── hanna/
│       ├── envelope/              # envelope-front, envelope-back-closed, envelope-seal
│       ├── invitation/            # carteInvitation.png
│       ├── archive/               # old-envelope-open.png, old-envelope-pocket.png
│       └── effects/               # glitter, glow, smoke, sparkle
│
├── src/
│   ├── main.js                    # Routeur d'entrée (expérience publique, dev motion, calibration)
│   │
│   ├── experience/
│   │   ├── HannaExperience.js     # Orchestrateur (préchargement, états, cycle de vie)
│   │   ├── EnvelopeScene.js       # Hiérarchie DOM des wrappers & responsive scale
│   │   └── experienceState.js     # Machine à états (LOADING, ENTERING, SETTLING, IDLE)
│   │
│   ├── animation/
│   │   ├── envelopeEntrance.js    # Timeline GSAP d'entrée hors-écran et micro-settle
│   │   └── envelopeIdle.js        # Tweens déphasés Y, rotateZ et ground shadow
│   │
│   ├── config/
│   │   ├── assets.js              # Registre centralisé des assets
│   │   ├── geometry.js            # Géométrie calibrée (boîte physique 820×490)
│   │   └── motion.js              # Paramètres centralisés de mouvements et d'animation
│   │
│   ├── styles/
│   │   ├── global.css             # Base reset & palette Quiet Luxury
│   │   ├── experience.css         # Styles de l'expérience publique, wrappers, ombre
│   │   └── calibration.css        # Styles sombres du banc de calibration
│   │
│   ├── calibration/
│   │   ├── calibration.js         # Contrôleur du banc de calibration géométrique
│   │   └── calibrationView.js     # Layout DOM de la calibration
│   │
│   └── utils/
│       └── imageMetrics.js        # Calculs de bounding boxes et normalisation
│
├── scripts/
│   ├── analyze-assets.py          # Audit des PNG
│   ├── generate-captures.py       # Générateur de poses de calibration
│   └── capture-phase2.js          # Script automatisé de captures d'écran Phase 2 via CDP
│
├── docs/
│   ├── scenarioAniationInvitation_compressed.pdf
│   ├── assets-analysis.json       # Registre technique d'audit d'assets
│   └── animation-analysis.md      # Analyse page par page du scénario
│
└── README.md
```

---

## 5. Architecture DOM de l'Enveloppe (Phase 2)

```text
HannaExperience (#app)
│
└── ExperienceViewport (.experience-viewport, perspective: 1600px)
    │
    ├── GroundShadow (.ground-shadow, ellipse douce réactive sous l'enveloppe)
    │
    └── EnvelopeViewportScaler (.envelope-viewport-scaler, scale responsive uniquement)
        │
        └── EnvelopeMotionWrapper (.envelope-motion-wrapper, translateY, scale, floating, rotateZ)
            │
            └── EnvelopeObject3D (.envelope-object-3d, 820×490, preserve-3d, curseur idle)
                │
                └── EnvelopeFrontFace (.envelope-front-face, 836.89×506.32, translate(0.27px, -8.16px))
                    └── envelope-front.png
```

---

## 6. Routes Disponibles

- **`http://localhost:5173/`** : Véritable expérience Hanna publique (aucun élément technique, écran ivoire, apparition et flottement).
- **`http://localhost:5173/?dev=motion`** : Expérience publique avec panneau de contrôle DEV (Replay Entrance, Stop/Start Idle, Toggle Bounds 820×490, État en direct).
- **`http://localhost:5173/?dev=calibration`** : Banc de calibration et d'audit géométrique complet (Phase 1.1).

---

## 7. État du Développement

- [x] **Phase 0** : Initialisation du projet Vite Vanilla JS, arborescence, audit automatisé des PNG par script Python, extraction des bounding boxes alpha.
- [x] **Phase 1** : Registre centralisé (`assets.js`, `geometry.js`), conventions du stage logique, analyse rigoureuse du scénario.
- [x] **Phase 1.1** : Verrouillage géométrique absolu, boîte physique canonique `820 × 490`, superposition Front/Back à écart `0.00 px`.
- [x] **Phase 2** : Apparition de l'enveloppe depuis le bas hors-écran, stabilisation sans bounce, transition fluide sans temps mort vers le flottement idle organique, ombre au sol réactive, scaling responsive, support prefers-reduced-motion.
- [ ] **Phase 3** : Clic utilisateur + Retournement 3D 180° vers le dos avec sceau indépendant.
- [ ] **Phase 4** : Rupture du sceau, ouverture du rabat et extraction dynamique de la carte.
- [ ] **Phase 5** : Formulaire interactif RSVP et confirmation finale.
