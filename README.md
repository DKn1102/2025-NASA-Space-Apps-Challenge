# 2025-NASA-Space-Apps-Challenge
Space Biology Publications Dashboard (v4.2 – Global Translate)

New in v4.2
- Global Translate: Language selector (KO/EN ready; ES/FR/JA/ZH scaffolding).
- All UI labels are translatable; dynamic texts use a translation map when provided.
- Kept offline-first: translations are bundled as data/i18n.js (no network fetch).

How to run
- Unzip and double-click index.html (file://). No server needed.

How to add more languages
- Edit data/i18n.js → window.I18N_RES['<lang>'].ui / .content
- For dynamic text (e.g., summary templates), add original string → translated string pairs in .content.

Data
- Raw CSV: data/SB_publication_PMC.csv (raw rows: 607)
- Normalized data: data/publications.js (window.PUBLICATIONS=[...]) – generated from CSV.

Build scripts (optional)
- You can regenerate publications.js by running a normalizer script (see previous v4.1 notes).
