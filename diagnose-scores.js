// diagnose-scores.js — READ ONLY diagnostic. No writes to Firestore.
// Run with: node diagnose-scores.js

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyBsuAhbhI8J18aD-tcsNNRy-qtzKJoILWY",
  authDomain: "jdmdb-498da.firebaseapp.com",
  projectId: "jdmdb-498da",
  storageBucket: "jdmdb-498da.firebasestorage.app",
  messagingSenderId: "761610515872",
  appId: "1:761610515872:web:34c9642013a73279a93fe5"
};

// V2 scoring rules — must stay in sync with NewEntry.jsx ATTRIBUTES
const ATTRIBUTES = [
  { key: 'bodykit',      points: 1 },
  { key: 'aeromods',     points: 1 },
  { key: 'disrespected', points: 1 },
  { key: 'rareoem',      points: 2 },
  { key: 'rareafter',    points: 2 },
  { key: 'frontswap',    points: 1 },
  { key: 'trackday',     points: 1 },
  { key: 'drift',        points: 1 },
  { key: 'livery',       points: 1 },
  { key: 'rims',         points: 1 },
  { key: 'vip',          points: 1 },
  { key: 'stance',       points: 1 },
  { key: 'twotone',      points: 1 },
  { key: 'showcar',      points: 2 },
  { key: 'hof',          points: 5 },
];

function calcAdditionalFromSpecs(specs) {
  if (!specs || typeof specs !== 'object') return 0;
  return ATTRIBUTES.reduce((sum, attr) => sum + (specs[attr.key] ? attr.points : 0), 0);
}

function getActiveFlags(specs) {
  if (!specs || typeof specs !== 'object') return [];
  return ATTRIBUTES.filter(a => specs[a.key]).map(a => a.key);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function diagnose() {
  console.log('Fetching all entries from Firestore...\n');
  const snapshot = await getDocs(collection(db, 'entries'));
  const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total entries: ${entries.length}\n`);

  const categories = {
    clean_zero:    [],  // additionalRarity == 0 and specs sum == 0 (no issue)
    v2_match:      [],  // additionalRarity > 0 and specs flags match exactly
    v1_orphan:     [],  // additionalRarity > 0 but specs sum == 0 (old manual entry)
    mismatch:      [],  // specs sum != additionalRarity (partial flags or wrong total)
  };

  for (const entry of entries) {
    const stored = entry.additionalRarity ?? 0;
    const fromFlags = calcAdditionalFromSpecs(entry.specs);

    if (stored === 0 && fromFlags === 0) {
      categories.clean_zero.push(entry);
    } else if (stored === fromFlags) {
      categories.v2_match.push(entry);
    } else if (stored > 0 && fromFlags === 0) {
      categories.v1_orphan.push(entry);
    } else {
      categories.mismatch.push(entry);
    }
  }

  console.log('=== CATEGORY BREAKDOWN ===');
  console.log(`  Clean (additional=0, no flags):      ${categories.clean_zero.length}`);
  console.log(`  V2 match (flags = stored score):     ${categories.v2_match.length}`);
  console.log(`  V1 orphan (score > 0, no flags set): ${categories.v1_orphan.length}`);
  console.log(`  Mismatch (flags ≠ stored score):     ${categories.mismatch.length}`);
  console.log(`  TOTAL:                               ${entries.length}\n`);

  // --- V1 orphans: show all (these are the problematic ones) ---
  if (categories.v1_orphan.length > 0) {
    console.log(`=== V1 ORPHANS (${categories.v1_orphan.length}) — score > 0 but no spec flags ===`);
    console.log('These entries have manually-entered additionalRarity with no flags to recalculate from.\n');
    categories.v1_orphan.slice(0, 20).forEach(e => {
      console.log(`  [${e.id}] ${e.make} ${e.model} ${e.variant}`);
      console.log(`    base=${e.baseRarity} additional=${e.additionalRarity} total=${e.totalRarity}`);
      console.log(`    notes: ${e.notes || '(none)'}`);
      console.log(`    url: ${e.url}`);
      console.log('');
    });
    if (categories.v1_orphan.length > 20) {
      console.log(`  ... and ${categories.v1_orphan.length - 20} more.\n`);
    }
  }

  // --- Mismatches: could indicate partial V1→V2 migration or data entry errors ---
  if (categories.mismatch.length > 0) {
    console.log(`=== MISMATCHES (${categories.mismatch.length}) — stored score ≠ flags sum ===`);
    console.log('These entries have some flags set but they do not add up to the stored additionalRarity.\n');
    categories.mismatch.slice(0, 20).forEach(e => {
      const fromFlags = calcAdditionalFromSpecs(e.specs);
      const flags = getActiveFlags(e.specs);
      console.log(`  [${e.id}] ${e.make} ${e.model} ${e.variant}`);
      console.log(`    stored: additional=${e.additionalRarity} | flags sum: ${fromFlags} | diff: ${e.additionalRarity - fromFlags}`);
      console.log(`    active flags: ${flags.length ? flags.join(', ') : '(none)'}`);
      console.log(`    notes: ${e.notes || '(none)'}`);
      console.log('');
    });
    if (categories.mismatch.length > 20) {
      console.log(`  ... and ${categories.mismatch.length - 20} more.\n`);
    }
  }

  // --- Spot-check a few V2 matches to confirm the system is working ---
  if (categories.v2_match.length > 0) {
    console.log(`=== V2 MATCH SAMPLE (showing up to 5) ===`);
    categories.v2_match.slice(0, 5).forEach(e => {
      const flags = getActiveFlags(e.specs);
      console.log(`  [${e.id}] ${e.make} ${e.model} ${e.variant} — additional=${e.additionalRarity} flags: ${flags.join(', ')}`);
    });
    console.log('');
  }

  console.log('=== DIAGNOSIS COMPLETE — no data was modified ===');
  process.exit(0);
}

diagnose().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
