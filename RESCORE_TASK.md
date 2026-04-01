# Re-score Task — V1 → V2 Point System Migration

## The Problem

The database contains entries from two eras with different scoring systems:

- **V1 (old)**: `additionalRarity` was manually entered as a number. The `specs` checkboxes may not have been set — the notes field was often used to describe what earned the extra points instead.
- **V2 (current)**: `additionalRarity` is auto-calculated by summing the points of checked `specs` flags (bodykit, rims, drift, etc.).

This means ~85% of entries may have a non-zero `additionalRarity` that does not reflect the current attribute flag system.

## Current Scoring Rules (V2)

**Total Rarity = Base Rarity + Additional Rarity**

| Points | Attributes |
|---|---|
| 1 pt each | Bodykit, Aero Mods, Disrespected, Front Swap, Track Day, Drift, Livery, Rims, VIP, Stance, Two-tone |
| 2 pts each | Rare OEM, Rare Aftermarket, Showcar |
| 5 pts | Hall of Fame |

## The Blocker — Needs Verification First

**Before doing anything, check whether old V1 entries have their `specs` flags populated in Firestore.**

Steps:
1. Open the Firebase console → `jdmdb-498da` project → Firestore → `entries` collection
2. Click on an older entry that has `Additional > 0`
3. Check what the `specs` field looks like

**If `specs` has flags set** (e.g. `{ rims: true, bodykit: true }`) → re-score is safe. A script can recalculate `additionalRarity` by summing the flags and update `totalRarity = baseRarity + additionalRarity`.

**If `specs` is empty or missing** → re-score from flags would zero out additional points on old entries. A different approach would be needed (e.g. manually re-tagging entries, or interpreting the notes field as hints).

## What the CSV Told Us

A full export (`jdmdb-export-2026-04-01.csv`) was reviewed. The CSV only exports `Base`, `Additional`, `Total` as numbers — no `specs` columns. It cannot be used to drive a re-score on its own.

Pattern observed in old entries: notes like `"TE37"`, `"Nismo Bodykit"`, `"VeilSide Combat C1 bodykit"` describe what earned the extra points — suggesting specs may have been left unchecked and described in notes instead.

## Next Steps

1. Verify `specs` field state on a V1 entry (see above)
2. Report back to Claude with findings
3. If specs are populated: Claude writes a migration script that reads all entries, recalculates `additionalRarity` from `specs`, and batch-updates Firestore
4. If specs are empty: decide on approach (manual re-tag vs. notes parsing vs. leaving as-is)

## Safe Migration Workflow (when ready)

1. Export full CSV backup first (already done: `jdmdb-export-2026-04-01.csv`)
2. Run a dry-run preview script (old score → new score, no writes)
3. Review the preview output
4. Confirm, then run the actual update script
