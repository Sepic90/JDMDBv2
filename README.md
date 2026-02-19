# JDMDB v2 - Operations Console

A minimal, dark, dense interface for cataloging JDM car sightings from Google Street View.

## Features

- **Database**: Browse, filter, sort, and export all entries
- **New Entry**: Compact submission form with cascading selects and rarity calculator
- **Showroom**: Statistics dashboard with top 10, Hall of Fame spotlight, and analytics
- **Settings**: Master data management with Excel import

## Design

Operations Console theme - dark, dense, minimal, professional.

- IBM Plex Mono + IBM Plex Sans typography
- Ultra-compact 32px row heights
- Subtle blue (#3b82f6) accent color
- Left sidebar navigation

## Setup

```bash
npm install
npm run dev
```

## Deploy

```bash
firebase login
npm run deploy
```

Deploys to: https://jdmdb-498da.web.app

## Stack

- React 18 + Vite 5
- Firebase Firestore
- Lucide React icons
