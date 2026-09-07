# Analyse Détaillée du Scénario d'Animation (PDF)

Ce document formalise l'analyse page par page du document de référence :
`scenarioAniationInvitation_compressed.pdf`.

> **Règle fondamentale** : Les pages 1 à 7 et 8 à 11 expliquent les composants et la composition physique (mise en place de la carte dans l'enveloppe). Elles ne constituent pas des étapes consécutives de lecture runtime de l'animation d'ouverture. La sortie de carte commence à la **Page 12** (carte insérée au fond) et progresse jusqu'à la **Page 26** (carte entièrement extraite).

---

## 1. Découpage Structurel des Pages

### Pages 1 à 7 : Anatomie et Décomposition des Éléments
- **Page 1 — Face avant** :
  Vue frontale de l'enveloppe fermée. Teinte dominante vert olive / sauge, cadre et arabesques dorées, typographie Serif « Hanna Invitation ».
- **Page 2 — Dos fermé avec sceau** :
  Vue arrière de l'enveloppe avec les quatre rabats repliés. Un sceau de cire doré scelle la pointe du rabat supérieur.
- **Page 3 — Dos fermé sans sceau** :
  Même vue que P2, mais sans le sceau de cire, démontrant que le sceau doit être un calque indépendant détachable.
- **Page 4 — Enveloppe ouverte complète** :
  Vue étalée de référence : rabat triangulaire supérieur grand ouvert pointant vers le haut, intérieur blanc ivoire visible, poche inférieure fermée.
- **Page 5 — Poche avant** :
  Composant isolé de la poche inférieure (rabat avant), indispensable pour créer le masquage physique avant de la carte lorsqu'elle est insérée.
- **Pages 6 et 7 — Schéma d'assemblage éclaté** :
  Démonstration de l'empilement des calques :
  `Arrière enveloppe ouverte (fond)` → `Carte d'invitation` → `Poche avant (masque)`.

---

### Pages 8 à 12 : Insertion et Position de Repos
- **Pages 8 à 11 — Insertion latérale** :
  Ces pages illustrent la logique d'introduction de la carte à l'horizontale (orientation paysage) dans l'enveloppe par le haut/côté.
- **Page 12 — Carte insérée au fond de l'enveloppe (État initial de l'animation)** :
  La carte est complètement au fond de la poche, orientée à 90° (paysage par rapport à sa forme portrait). Seul le bord supérieur dépasse ou affleure discrètement.

---

### Pages 13 à 18 : Amorçage de la Sortie et Pivotement Dynamique
> **Interdiction formelle** : Il est interdit de réduire ce mouvement à une simple translation verticale `translateY` ou à une rotation instantanée.
- **Page 13 — Début du pivotement** :
  Le coin supérieur gauche de la carte commence à émerger en premier. L'angle passe de -90° (horizontal) à environ -75°.
- **Page 14 — Pivot accentué (~ -55°)** :
  La carte continue de monter en pivotant. Le haut de la carte devient nettement visible à gauche de l'enveloppe.
- **Page 15 — Pivot intermédiaire (~ -40°)** :
  La carte gagne en hauteur et son angle s'ouvre.
- **Page 16 — Pivot intermédiaire avancé (~ -25°)** :
  Plus de 50% de la surface de la carte est maintenant hors de la poche, le redressement vers la verticale s'accélère.
- **Page 17 — Redressement proche (~ -12°)** :
  La carte est presque droite. Le bas de la carte est toujours inséré dans la poche.
- **Page 18 — Quasi-verticale (~ -5°)** :
  Fin de la phase de rotation principale.

---

### Pages 19 à 24 : Ascension Purement Verticale
- **Pages 19 & 20 — Verticale parfaite (0°)** :
  La rotation est terminée (rotation = 0°). Le mouvement devient une translation Y purement vers le haut.
- **Pages 21 à 24 — Dégagement progressif** :
  La carte monte graduellement jusqu'à ce que son bord inférieur sorte complètement de la ligne supérieure de la poche.

---

### Pages 25 à 26 : Établissement de la Carte Principale
- **Page 25 — Carte détachée** :
  La carte est entièrement sortie de l'enveloppe et commence à occuper le centre du viewport.
- **Page 26 — Carte finale plein cadre** :
  L'enveloppe s'efface ou se stabilise en arrière-plan. La carte d'invitation devient l'interface principale prête pour les interactions futures (RSVP).

---

## 2. Matrice Numérique des Key Poses Déduites du PDF

| Page PDF | État / Phase | Rotation estimée | Translation X | Translation Y | Niveau de sortie | Notes géométriques |
| :---: | :--- | :---: | :---: | :---: | :---: | :--- |
| **P12** | Carte au fond (repos) | -90° | -5 px | +110 px | 15% visible | Position couchée au fond de la poche |
| **P13** | Début de pivot | -75° | -25 px | +80 px | 30% visible | Coin supérieur gauche émerge en premier |
| **P14** | Pivot dynamique 1 | -55° | -35 px | +50 px | 45% visible | Forte impulsion rotative |
| **P15** | Pivot dynamique 2 | -40° | -30 px | +15 px | 60% visible | Élévation continue |
| **P16** | Pivot dynamique 3 | -25° | -20 px | -20 px | 75% visible | Franchissement du centre de gravité |
| **P17** | Pré-redressement | -12° | -10 px | -50 px | 85% visible | Angle résiduel |
| **P18** | Redressement quasi complet | -5° | -5 px | -80 px | 90% visible | Ralentissement angulaire |
| **P20** | Redressement complet | 0° | 0 px | -110 px | 92% visible | Carte parfaitement verticale |
| **P22** | Ascension verticale | 0° | 0 px | -150 px | 96% visible | Translation Y pure |
| **P24** | Seuil de libération | 0° | 0 px | -190 px | 99% visible | Le bas quitte la poche |
| **P26** | Carte extraite autonome | 0° | 0 px | 0 px | 100% visible | Centrée sur le stage (scale 1.05) |

---

## 3. Analyse des Incohérences et Tolérances entre Fichiers PNG Fournis

1. **Ratios d'aspect différents entre Face Avant et Dos Fermé** :
   - `envelope-front.png` : 1536 × 1024 (ratio natif 1.500)
   - `envelope-back-closed.png` : 1672 × 941 (ratio natif 1.7768)
   - *Conséquence* : Le dos fermé est légèrement plus étiré horizontalement que la face avant si on conserve leurs dimensions natives brutes. Lors de la rotation 3D (Phase 2), il faudra soit calibrer leurs dimensions apparentes (820 × 546 vs 820 × 461) pour assurer une transition harmonieuse, soit harmoniser les marges transparentes.
2. **Proportions Carte vs Dos Fermé** :
   - `carteInvitation.png` : 941 × 1672
   - `envelope-back-closed.png` : 1672 × 941
   - Les dimensions sont rigoureusement identiques à 90° près ! La carte au format paysage a exactement la même largeur que le dos fermé de l'enveloppe.
3. **Poche avant (`old-envelope-pocket.png`)** :
   - Dimensions : 1536 × 1024, visible 1507 × 983.
   - Son profil découpé en V s'ajuste avec une translation Y de +45px sur le stage de 1600×1000 pour masquer parfaitement le bas de la carte tout en laissant apparaître le fond de l'enveloppe ouverte.
