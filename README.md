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
