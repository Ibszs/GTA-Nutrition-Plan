# GTA Nutrition Plan

Personal, phone-first nutrition control centre. It combines supplied 16-week meal guidance with editable shopping, Sunday preparation, whey-label correction, and a saved fourteen-day response tracker.

## Open it

Published app: <https://ibszs.github.io/GTA-Nutrition-Plan/>

On iPhone or iPad, open that link in Safari, tap Share, then **Add to Home Screen**. On Android, open it in Chrome, open the browser menu, then choose **Install app** or **Add to Home screen**.

Open every page once while online. The app shell and supplied PDFs then work offline. New browser requests, first-time files, and GitHub availability still require a connection.

## Saved data and phone moves

Shopping edits, checks, tracker entries, and whey values use browser storage. They do not leave the device and do not sync automatically. Browser-data clearing removes them.

Use **Home → Back up everything → Export all data** before changing phones or clearing browser data. Move the downloaded JSON file to the other device, then use **Import all data**. Import validates all three sections before replacing saved values.

Shopping also supports list-only text copy and JSON export/import. Tracker supports CSV export.

## Local launch

This is a dependency-free static app. Serve the repository over HTTP; service workers do not run from a direct `file://` opening.

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Then open <http://127.0.0.1:4173/>.

## Tests

Node.js 22 or newer:

```powershell
npm test
```

Tests cover nutrition calculations, date handling, editable shopping transforms, backup validation, links, page structure, PWA metadata, and offline asset completeness.

## Deployment

GitHub Pages serves `main` from repository root. No build command or runtime dependency is required. After changing a cached file, increment `CACHE_NAME` in `sw.js` so installed copies refresh.

## Boundaries

This project is for personal organization. Package labels and current shelf prices override saved text. Nutrition and weight tools support the supplied plan; they do not replace clinician advice.
