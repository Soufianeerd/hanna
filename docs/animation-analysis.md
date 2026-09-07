# Analyse Géométrique et Scénario d'Animation — Phase 1.1

Ce document formalise les mesures réelles, les corrections d'échelle et l'audit rigoureux du document officiel :
`scenarioAniationInvitation_compressed.pdf`.

---

## 1. Verrouillage Physique FRONT vs BACK (Résolution de l'erreur critique)

Dans la Phase 1 initiale, le FRONT mesurait `820 × 546.67` et le BACK `820 × 461.42`. Cette différence de hauteur de **85.25 px** rendait impossible un flip 3D réaliste.

### Analyse des canvases natifs vs Bounding Boxes visibles :
- **FRONT (`envelope-front.png`)** :
  - Canvas natif : `1536 × 1024` (ratio 1.5000)
  - Visible BBox : `left: 15, top: 33, right: 1520, bottom: 1024`
  - Dimensions visibles : `1505 × 991 px` (ratio visible = **1.5187**)
  - Centre visible : `(767.5, 528.5)` vs centre canvas `(768.0, 512.0)` -> décalage `X: -0.5 px, Y: +16.5 px`.
- **BACK (`envelope-back-closed.png`)** :
  - Canvas natif : `1672 × 941` (ratio 1.7768)
  - Visible BBox : `left: 29, top: 0, right: 1644, bottom: 928`
  - Dimensions visibles : `1615 × 928 px` (ratio visible = **1.7403**)
  - Centre visible : `(836.5, 464.0)` vs centre canvas `(836.0, 470.5)` -> décalage `X: +0.5 px, Y: -6.5 px`.

### Boîte physique canonique (`PHYSICAL_ENVELOPE`) :
Pour assurer une continuité parfaite sans rupture lors du retournement à 180°, nous définissons :
```javascript
PHYSICAL_ENVELOPE = {
  width: 820,
  height: 490,
  centerX: 0,
  centerY: 0,
  aspectRatio: 1.6735
};
```

### Facteurs de mise à l'échelle et déformations calculées :
- **FRONT** :
  - `scaleX = 820 / 1505 = 0.54485` (+10.2% d'étirement en largeur par rapport au ratio 1.5187)
  - `scaleY = 490 / 991 = 0.49445` (-9.2% de compression en hauteur)
  - Dimensions conteneur : `836.89 × 506.32 px`
  - Position du conteneur : `x = +0.27 px, y = -8.16 px`
- **BACK** :
  - `scaleX = 820 / 1615 = 0.50774` (-3.8% de compression en largeur par rapport au ratio 1.7403)
  - `scaleY = 490 / 928 = 0.52802` (+4.0% d'extension en hauteur)
  - Dimensions conteneur : `848.94 × 496.86 px`
  - Position du conteneur : `x = -0.25 px, y = +3.43 px`

### Résultat géométrique :
| Bord extérieur | FRONT visible | BACK visible | Écart |
| :--- | :---: | :---: | :---: |
| **Bord gauche** | `-410.00 px` | `-410.00 px` | **0.00 px** |
| **Bord droit** | `+410.00 px` | `+410.00 px` | **0.00 px** |
| **Bord supérieur** | `-245.00 px` | `-245.00 px` | **0.00 px** |
| **Bord inférieur** | `+245.00 px` | `+245.00 px` | **0.00 px** |
| **Centre (X, Y)** | `(0.00, 0.00)` | `(0.00, 0.00)` | **0.00 px** |

---

## 2. Recalibration du Sceau (Mesure Page 2 du PDF)

Sur la page 2 du scénario PDF, l'enveloppe fermée avec sceau a été mesurée pixel par pixel :
- **Enveloppe fermée** : largeur = `1113 px`, hauteur = `626 px`, centre = `(594.5, 759.0)`
- **Sceau de cire** : diamètre = `103 px`, centre = `(592.5, 878.0)`
- **Positionnement relatif mesuré** :
  - Décalage horizontal : `dx = -0.0018 * env_w ≈ 0 px` (parfaitement centré sur l'axe X).
  - Décalage vertical : `dy = +0.1901 * env_h` (exactement **19.0%** de la hauteur de l'enveloppe sous le centre, sur la pointe du rabat).
  - Diamètre relatif : `103 / 1113 = 0.0925` (soit **9.25%** de la largeur de l'enveloppe).
- **Application au stage logique (enveloppe 820 × 490)** :
  - Diamètre : `820 * 0.0925 ≈ 76 px`
  - Position : `x = 0 px, y = +93.1 px` (et non plus l'ancienne valeur approximative `y: 4`).

---

## 3. Mesures Réelles de l'Enveloppe Ouverte (`old-envelope-open.png`)

Cette image sert d'**étalon de calibration uniquement** et ne fait pas partie du runtime final.
Mesures sur l'image native (`1448 × 1086`) :
- **BBox visible** : `left=192, top=5, right=1253, bottom=1054`
- **Dimensions visibles** : `1061 × 1049 px` (ratio = `1.0114`)
- **Centre visible** : `(722.5, 529.5)`
- **Sommet du rabat ouvert (apex)** : `Y = 5 px` (décalage au centre = `-524.5 px`, soit -50% de la hauteur visible)
- **Pointe du V de la poche** : `Y = 633 px` (décalage au centre = `+103.5 px`, soit +9.8% de la hauteur visible)
- **Bas de l'enveloppe** : `Y = 1054 px` (décalage au centre = `+524.5 px`, soit +50% de la hauteur visible)
- **Profondeur utile de la poche** : `421 px` (40.1% de la hauteur visible)
- **Hauteur du rabat supérieur** : `628 px` (59.9% de la hauteur visible).

---

## 4. Précision sur les Dimensions de la Carte (`carteInvitation.png`)

Dans le premier rapport, il avait été noté que `941 × 1672` (carte) correspondait à `1672 × 941` (dos fermé).
**Correction rigoureuse** :
- Le canvas du dos fermé fait `1672 × 941`, mais sa **bounding box visible réelle** fait `1615 × 928`.
- La carte ne fait donc pas physiquement les dimensions du canvas du dos. Elle est proportionnée pour s'insérer au format paysage dans la poche utile (largeur visible utile ~`600-650 px` sur le stage, hauteur `320 px`).

---

## 5. Matrice Complète des 15 Poses PDF (P12 à P26) — Mesures Réelles

Toutes les poses ont été mesurées à partir des matrices de transformation (`transform` et `cm`) du PDF :

| Pose | Page PDF | Étape du scénario | Angle mesuré | `x` stage | `y` stage | Scale | % Sortie | Statut |
| :---: | :---: | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **P12** | 12 | Carte au fond de la poche | **-90.00°** | -0.2 px | +110.0 px | 1.00 | 15% | **measured** |
| **P13** | 13 | Début du pivot gauche | **-78.42°** | +6.6 px | +80.0 px | 1.02 | 25% | **measured** |
| **P14** | 14 | Pivot dynamique accentué | **-62.98°** | -0.1 px | +40.0 px | 1.05 | 40% | **measured** |
| **P15** | 15 | Pivot mi-parcours | **-46.61°** | +10.3 px | 0.0 px | 1.08 | 55% | **measured** |
| **P16** | 16 | Dégagement rotatif avancé | **-31.84°** | +15.7 px | -45.0 px | 1.10 | 70% | **measured** |
| **P17** | 17 | Carte redressée à la verticale | **0.00°** | +0.4 px | -95.0 px | 1.12 | 80% | **measured** |
| **P18** | 18 | Ascension verticale 1 | **0.00°** | -15.7 px | -135.0 px | 1.14 | 85% | **measured** |
| **P19** | 19 | Ascension verticale 2 | **0.00°** | +20.3 px | -175.0 px | 1.16 | 90% | **measured** |
| **P20** | 20 | Ascension verticale 3 | **0.00°** | 0.0 px | -215.0 px | 1.18 | 92% | **measured** |
| **P21** | 21 | Ascension verticale 4 | **0.00°** | +17.2 px | -255.0 px | 1.20 | 94% | **measured** |
| **P22** | 22 | Ascension verticale 5 | **0.00°** | +25.5 px | -290.0 px | 1.20 | 96% | **measured** |
| **P23** | 23 | Affleurement haut de poche | **0.00°** | +21.2 px | -325.0 px | 1.22 | 98% | **measured** |
| **P24** | 24 | Seuil de libération de la poche | **0.00°** | +13.5 px | -360.0 px | 1.24 | 99% | **measured** |
| **P25** | 25 | Descente vers le centre | **0.00°** | +13.2 px | -160.0 px | 1.26 | 100% | **measured** |
| **P26** | 26 | Carte extraite autonome (finale) | **0.00°** | 0.0 px | 0.0 px | 1.30 | 100% | **measured** |
