# Re-score Task — V1 → V2 Point System Migration

## Status: Partially Complete (2026-04-02)

---

## What Was Done

### 1. V1 Key Migration — COMPLETE
Six camelCase V1 spec keys were renamed to their V2 lowercase equivalents across 185 entries.

| V1 key (old) | V2 key (canonical) | Entries affected |
|---|---|---|
| `aeroMods` | `aeromods` | 112 |
| `hallOfFame` | `hof` | 23 |
| `rareOEM` | `rareoem` | 20 |
| `rareAftermarket` | `rareafter` | 15 |
| `twoTone` | `twotone` | 13 |
| `frontSwap` | `frontswap` | 2 |

Script used: `migrate-v1-keys.js`

### 2. Mismatch Rescore — COMPLETE
254 entries had spec flags set but `additionalRarity` didn't match the flags sum (V1 manual scores mixed with partial V2 flags). These were recalculated from flags and updated.

Script used: `rescore-mismatches.js`

---

## What Remains

### V1 Orphans — 76 entries — MANUAL WORK NEEDED
These entries have `additionalRarity > 0` but **zero spec flags set** — they were logged in V1 with a manually typed score and no checkboxes. There is nothing to recalculate from; they need to be opened individually in the app and re-tagged.

Priority order for re-tagging:
1. Entries with descriptive notes (notes mention mods like "TE37", "Nismo bodykit", "aero kit") — these make it obvious which flags to set
2. Entries with no notes and a small additional score (e.g. `additional=1`) — lower priority, may need the Street View URL for reference

Script `diagnose-scores.js` will still list all orphans if needed as a working reference.

---

## Diagnostic & Migration Scripts

| Script | Purpose |
|---|---|
| `diagnose-scores.js` | Read-only. Reports entry score categories (clean / V2 match / orphan / mismatch) |
| `diagnose-keys.js` | Read-only. Scans all specs objects for unknown keys |
| `rescore-mismatches.js` | Dry-run + write. Recalculates additionalRarity from flags for mismatch entries |
| `migrate-v1-keys.js` | Dry-run + write. Renames V1 camelCase keys to V2 lowercase equivalents |

All scripts are safe to re-run for verification. Write mode requires explicit `--write` flag.
