# Electrinder by RaYSun

Animation de stand pour l'Odoo Experience : une carte du partage d'énergie
qui se remplit en direct, et un jeu de matching qui fait faire le métier de
RaYSun aux visiteurs.

Quatre écrans dans une seule application.

| Adresse | À quoi ça sert | Sur quoi ça tourne |
|---|---|---|
| `/` | Inscription en 30 secondes | La tablette posée sur le comptoir |
| `/#/mur` | La carte qui se remplit | Le grand écran du stand |
| `/#/jeu` | Electrinder, le jeu de matching | Le téléphone des visiteurs, et la tablette |
| `/#/classement` | Le tableau des scores | Un second écran, ou la tablette entre deux joueurs |
| `/#/reglages` | Connexion, rayon, durée, amorçage | Votre portable, en coulisse |

Vite + React, Supabase pour les données, Netlify pour l'hébergement.

---

## Démarrer

```bash
npm install
npm run dev
```

Puis http://localhost:5173. Sans base de données configurée, tout reste dans
le navigateur : suffisant pour juger du rendu, insuffisant pour faire tourner
la tablette et le mur sur deux machines différentes.

## Brancher Supabase

1. Créez un projet sur https://supabase.com (région Frankfurt).
2. **SQL Editor → New query**, collez tout le contenu de
   `supabase/migrations/20260907120000_schema_initial.sql`, **Run**.
   Le fichier est réexécutable : il ajoute ce qui manque et n'efface rien.

   Si l'intégration GitHub de Supabase est branchée sur ce dépôt
   (Project Settings → Integrations), cette étape se fait toute seule à
   chaque poussée sur `main`.
3. **Project Settings → API** : relevez **Project URL** et la clé **anon public**.
4. Créez un `.env` à la racine (voir `.env.example`) :

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

Les clés doivent être dans le build, pas seulement saisies dans l'écran
Réglages. Sinon chaque téléphone de visiteur repart sans base et garde ses
données pour lui — c'est le piège principal de ce dispositif, et l'écran mur
affiche désormais un bandeau rouge quand il s'y trouve.

## Déployer

```bash
npm run build
```

Puis déposez le dossier `dist` sur Netlify (`netlify.toml` est déjà configuré
si vous branchez un dépôt Git).

---

## Comment se forment les communautés

Deux entreprises sont partageables si elles sont à moins du rayon réglé
(8 km par défaut) l'une de l'autre.

La règle naïve — relier de proche en proche tout ce qui est à portée — ne
tient pas : à quelques centaines de participants, tout le pays fusionne en une
seule communauté par effet de chaîne, A touche B, B touche C, et Ostende se
retrouve avec Arlon. Le classement devient vide de sens.

L'application prend donc à chaque tour le site restant qui a le plus de
voisins, lui rattache ses voisins encore libres, et recommence. Chaque membre
est réellement à portée d'un même point central, ce qui correspond à la
réalité physique d'un partage. À 300 participants on obtient une trentaine de
communautés crédibles, calculées en quelques millisecondes.

Une communauté n'est comptée dans les indicateurs que si elle réunit au moins
un producteur et un consommateur. Sans ça, il n'y a rien à partager.

## Le jeu

Une toiture s'affiche en haut de l'écran avec sa production. Des entreprises
défilent en cartes : à gauche pour passer, à droite pour relier. Sur chaque
carte, un graphique 24 heures montre la consommation du candidat superposée à
la production solaire.

C'est là que le métier se comprend en une seconde. Le car-wash remplit la
cloche du soleil : 87 % de sa consommation tombe en journée. La discothèque
encadre un trou : 15 %. Personne n'a besoin d'explication.

Trois choses font perdre des points : un site à plus de 12 km, un site dont
les horaires ne collent pas, et un enchaînement cassé — le multiplicateur
monte à ×3 tant qu'on ne se trompe pas. Une erreur coûte aussi 4 secondes.
Quand une toiture est placée à plus de 82 %, la communauté est bouclée, le
joueur touche un bonus et une nouvelle toiture arrive.

**Une partie, c'est 24 cartes et 90 secondes au maximum** (durée réglable de
30 s à 2 min, et le réglage passe par la base pour s'appliquer aussi aux
téléphones). Le paquet est fixe, et c'est délibéré : avec un simple
chronomètre, celui qui swipe sans regarder passait trois fois plus de cartes
que celui qui lit les courbes, et la vitesse battait la justesse — exactement
l'inverse de ce que le jeu doit enseigner.

Calibrage vérifié sur 300 parties simulées par profil, en tenant compte du
temps réellement passé par carte : un joueur qui trie fait environ 9 500
points, un joueur approximatif 6 500, un joueur qui accepte tout 4 900.
Réfléchir rapporte le double, et personne ne finit à zéro devant son prospect.

### Un bug qui vaut d'être connu

La boucle de jeu tient dans des références et non dans l'état React, avec un
verrou de 320 ms entre deux décisions. Sans ça, deux appuis plus rapides qu'un
rendu lisaient tous les deux la même toiture avec son réservoir encore plein
et plaçaient sa production deux fois. En maintenant une flèche enfoncée, on
dépassait 100 000 points sans regarder une seule courbe. Si vous touchez à
`Jeu.jsx`, gardez ce mécanisme.

## Le classement

Il repart à zéro chaque matin. Si quelqu'un pose un gros score le premier
matin, les visiteurs du dernier jour jouent pour rien et décrochent — un
classement du jour garde la première place accessible pendant les trois jours
et donne trois gagnants au lieu d'un. Le record global reste affiché.

## Amorcer puis nettoyer

**Amorcer la carte** (écran Réglages) place deux entreprises par province, un
producteur et un consommateur dans la même commune, pour qu'un lien apparaisse
immédiatement. Ces entrées s'affichent **en creux**, la légende le dit, et le
compteur précise combien il y en a : personne ne peut vous accuser d'avoir
gonflé les chiffres.

En fin de journée, **Retirer l'amorçage** les supprime toutes. Les vraies
inscriptions restent, et les indicateurs se recalculent sur les seules
entreprises réellement venues au stand.

**Tout effacer** efface aussi les vraies inscriptions et le classement. À
réserver aux répétitions d'avant-ouverture.

---

## Les deux points qui méritent votre attention

**Les hypothèses de calcul.** Toutes en haut de `src/config.js` : 950 kWh par
kWc et par an, 55 € gagnés par MWh partagé, 35 % de la consommation couvrable
en local, 0,15 t de CO₂ par MWh. C'est le seul endroit où un visiteur qui
connaît son dossier peut vous contredire.

**Le RGPD.** La carte n'affiche que le nom d'entreprise et le code postal —
pas d'adresse, pas de nom de personne. Les e-mails partent dans une table
séparée que la clé publique peut remplir mais jamais relire ; ils se
récupèrent depuis le tableau de bord Supabase.

## Structure

```
src/
  config.js              ← les hypothèses de calcul, à relire avant le salon
  lib/geo.js             ← projection, distances
  lib/communautes.js     ← regroupement et indicateurs
  lib/jeu.js             ← courbes de charge par secteur, scoring
  lib/sons.js            ← sons synthétisés, aucun fichier à charger
  lib/donnees.js         ← Supabase, avec repli local hors-ligne
  ecrans/                ← Inscription, Mur, Jeu, Classement, Réglages
  composants/            ← carte, pavé numérique, code QR, courbe de charge
  data/                  ← provinces, contour du pays, 1 145 codes postaux
supabase/migrations/     ← le schéma, appliqué par l'intégration GitHub
```

Les contours du pays et des 11 provinces (Natural Earth) et les codes postaux
belges géolocalisés sont embarqués. Aucune API externe, aucune clé de carto :
la carte s'affiche même si le wifi du hall lâche.
