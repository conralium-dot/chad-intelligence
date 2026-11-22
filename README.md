# Chad Intelligence

La référence des données sur le Tchad : fiche pays, comparateur régional, éducation, humanitaire, sources.
Site statique bilingue FR/EN, données publiques Banque mondiale (CC BY 4.0) et HCR.

## Structure
- `public/index.html` : le site (HTML, CSS et JS sans dépendance)
- `netlify.toml` : configuration Netlify (dossier publié : `public`)

## Déploiement
Chaque push sur `main` est déployé automatiquement par Netlify une fois le dépôt relié au projet Netlify.

## Prochaines étapes
- Pipeline de collecte (Banque mondiale, HDX, HCR, INSEED) vers Supabase
- Fiches des 23 provinces
- Assistant IA avec sources citées

## Fonctions et données en direct
- `netlify/functions/tenders.mts` : sert `/api/tenders`, les avis de marché de la Banque mondiale pour le Tchad (API publique, cache CDN de 6 h).
- Formulaire `alertes` (Netlify Forms) : inscriptions aux alertes d'appels d'offres et à la lettre mensuelle. Les inscriptions se consultent dans Netlify → Forms.
- Carte : contours geoBoundaries (© contributeurs OpenStreetMap, ODbL). Sécurité : ACLED via HDX HAPI (instantané nov. 2025 - oct. 2026).

## Source et pré-rendu (SEO)

- On édite **`src/index.html`** (page unique : HTML, CSS, JS).
- `public/index.html` est **généré** par `python3 scripts/prerender.py` : le script exécute la page dans Chrome headless et enregistre le contenu rendu (version française), pour que Google et les aperçus de liens voient les chiffres, les provinces, le catalogue, etc. Il génère aussi `public/sitemap.xml` et `public/robots.txt`.
- Après toute modification de `src/index.html` : lancer le script, puis committer les deux fichiers.
- Côté visiteur, le JavaScript reprend la main (langue mémorisée, appels d'offres et catalogue « Les voix » en direct). En mode pré-rendu (`window.__PRERENDER`), ces appels réseau sont désactivés.

## Catalogue « Les voix » (Airtable)

- Source : base Airtable « Tchad Open Data » (`appfjYjsJjGwSF4jV`), tables `Oeuvres_Acteurs` et `Personnes`.
- La page embarque un instantané (`data/voix-snapshot.json`) et tente ensuite `/api/voix` (`netlify/functions/voix.mts`), qui lit Airtable en direct.
- Pour activer le direct : créer un jeton personnel Airtable en lecture seule (portée `data.records:read`, accès à la seule base Tchad Open Data) et l'ajouter dans Netlify comme variable d'environnement `AIRTABLE_TOKEN`. Sans jeton, la fonction renvoie 503 et l'instantané reste affiché.
