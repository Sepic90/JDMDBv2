# JDMDB v2 — Claude Documentation

## Project Overview

JDMDB v2 is a web-based **Operations Console for cataloging JDM (Japanese Domestic Market) car sightings** found via Google Street View. Users log rare or modified vehicles with metadata and a rarity scoring system. The database is public and collaborative — no authentication required.

**Live URL**: https://jdmdb-498da.web.app  
**Firebase Project**: `jdmdb-498da`

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18.3 + Vite 5.4 |
| Database | Firebase Firestore (NoSQL) |
| Hosting | Firebase Hosting |
| Icons | Lucide React |
| Styling | Custom CSS (single file, 1800+ lines) |
| Typography | IBM Plex Mono + IBM Plex Sans |

No auth, no backend server — fully serverless via Firebase.

---

## Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Start Vite dev server → http://localhost:5173
npm run build        # Production build to /dist
npm run preview      # Preview production build locally
npm run deploy       # Build + deploy to Firebase Hosting
```

No `.env` file needed. Firebase config is hardcoded in `src/firebase.js`.

---

## Project Structure

```
src/
├── main.jsx                  # React entry point
├── App.jsx                   # Root component — navigation, global state
├── firebase.js               # Firestore init and config
├── index.css                 # All styles (CSS variables, layout, components)
└── components/
    ├── Showroom.jsx           # Analytics dashboard (15+ stat widgets)
    ├── NewEntry.jsx           # Entry submission form + rarity calculator
    ├── DatabaseView.jsx       # Data grid — filter, sort, edit, delete, export
    ├── EditModal.jsx          # Modal for editing existing entries
    ├── SettingsView.jsx       # Master data management + Excel import
    ├── SubmitFind.jsx         # Public user submission form
    ├── PendingSubmissions.jsx # Moderation queue for user submissions
    └── Toast.jsx              # Transient notification component
```

---

## Firestore Data Schema

### `masterData` — Vehicle catalog (source of truth for variants)
```json
{
  "make": "Nissan",
  "model": "Skyline",
  "variant": "R33 GT-R",
  "baseRarity": 8
}
```

### `entries` — Logged sightings
```json
{
  "url": "https://www.google.com/maps/@...",
  "year": "2024",
  "make": "Nissan",
  "model": "Skyline",
  "variant": "R33 GT-R",
  "color": "Black",
  "status": "parked",
  "notes": "...",
  "baseRarity": 8,
  "additionalRarity": 5,
  "totalRarity": 13,
  "specs": {
    "bodykit": true,
    "drift": false,
    "hof": false
    // ...all attribute flags
  },
  "createdAt": "<ISO timestamp>",
  "timestamp": "<ISO timestamp>"
}
```

### `pendingSubmissions` — Awaiting moderation
```json
{
  "url": "https://www.google.com/maps/@...",
  "year": "2024",
  "notes": "...",
  "submittedAt": "<ISO timestamp>"
}
```

---

## Rarity Scoring System

**Total Rarity = Base Rarity + Additional Rarity**

- **Base Rarity**: Fixed per variant, set in master data
- **Additional Rarity**: Sum of checked attribute points

| Points | Attributes |
|---|---|
| 1 pt each | Bodykit, Aero Mods, Disrespected, Front Swap, Track Day, Drift, Livery, Custom Rims, VIP, Stance, Two-tone |
| 2 pts each | Rare OEM, Rare Aftermarket, Show Car |
| 5 pts | Hall of Fame |

**Rarity tiers** (for dashboard display):
- **Stock**: 0–4
- **Modified**: 5–9
- **Wild Build**: 10–14
- **Legendary**: 15+

---

## Features by Tab

### Showroom (Dashboard)
Analytics view with 15+ stat widgets: total entries, collection power, average/max rarity, Hall of Fame rate, top 10 rankings, rarity tier distribution, top makes/models/variants, color distribution, year distribution, status breakdown (parked vs driving), attribute hotlist, most decorated car, rarest make.

### New Entry
Form with cascading Make → Model → Variant dropdowns (from `masterData`), year (2005–2025), 16 color options, parked/driving status, attribute checkbox grid with live rarity calculator, notes, and submit. Also used as a prefill target when accepting pending submissions (URL + year locked in that mode).

### Database
Data grid showing all `entries`. Filterable by make/model/variant/color/status/year and free-text search. Sortable by any column. Paginated at 25 rows. Edit (opens `EditModal`) and delete with confirmation. CSV export respects active filters.

### Settings
Admin panel for `masterData`. Add new variants with base rarity. Autocomplete for make/model fields. Search and sort existing variants. Delete variants. Bulk import from `.xlsx`/`.xls` via the XLSX CDN library — parses sheets and adds/updates variants, skipping duplicates.

### Submit Find
Public form for external contributors. Stores URL + year + notes to `pendingSubmissions`. No authentication.

### Pending Submissions
Moderation queue. Lists all pending submissions with date, link, and notes. Accept → prefills New Entry form. Decline → deletes from Firestore. Sidebar badge shows pending count.

---

## Architecture Notes

- **State management**: Centralized in `App.jsx` via `useState`. Props are drilled to children — no Context or Redux.
- **Data fetching**: All Firestore data loaded on mount via `useEffect`. No real-time listeners — manual `fetchData()` refresh after mutations.
- **Filtering/sorting/aggregations**: Computed client-side with `useMemo`.
- **Styling**: Single monolithic `index.css`. CSS custom properties for theming. Operations console aesthetic — dark, dense, light background (#f0f2f6), blue accent (#4f7ef7).
- **No `.env`**: Firebase config is embedded in source — acceptable for a public read/write database with no sensitive data.

---

## Design Aesthetic

- Operations console / data terminal feel
- Ultra-compact layouts (32px row heights, 40px inputs)
- Left sidebar navigation
- IBM Plex Mono for data, IBM Plex Sans for labels
- Light theme with white card surfaces on a grey background
- Blue (#4f7ef7) primary action color
