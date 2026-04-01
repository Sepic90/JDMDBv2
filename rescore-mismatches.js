// rescore-mismatches.js — Recalculate additionalRarity from spec flags for mismatch entries.
//
// DRY RUN (default — no writes):
//   node rescore-mismatches.js
//
// LIVE WRITE (updates Firestore):
//   node rescore-mismatches.js --write

import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, writeBatch } from 'firebase/firestore';

const DRY_RUN = !process.argv.includes('--write');

const firebaseConfig = {
  apiKey: "AIzaSyBsuAhbhI8J18aD-tcsNNRy-qtzKJoILWY",
  authDomain: "jdmdb-498da.firebaseapp.com",
  projectId: "jdmdb-498da",
  storageBucket: "jdmdb-498da.firebasestorage.app",
  messagingSenderId: "761610515872",
  appId: "1:761610515872:web:34c9642013a73279a93fe5"
};

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

async function rescore() {
  console.log(DRY_RUN
    ? '=== DRY RUN — no writes will occur ===\n'
    : '=== LIVE WRITE MODE — Firestore will be updated ===\n'
  );

  console.log('Fetching all entries...\n');
  const snapshot = await getDocs(collection(db, 'entries'));
  const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total entries: ${entries.length}`);

  // Only target mismatches: entries that have at least one flag set but the
  // stored additionalRarity doesn't match the flags sum.
  const toUpdate = entries.filter(e => {
    const fromFlags = calcAdditionalFromSpecs(e.specs);
    const stored = e.additionalRarity ?? 0;
    const hasAnyFlag = fromFlags > 0;
    return hasAnyFlag && fromFlags !== stored;
  });

  console.log(`Mismatch entries to fix: ${toUpdate.length}\n`);

  if (toUpdate.length === 0) {
    console.log('Nothing to do.');
    process.exit(0);
  }

  // Score change counters
  let scoreUp = 0, scoreDown = 0, scoreUnchangedTotal = 0;

  console.log('=== PREVIEW OF CHANGES ===\n');
  toUpdate.forEach(e => {
    const oldAdditional = e.additionalRarity ?? 0;
    const newAdditional = calcAdditionalFromSpecs(e.specs);
    const oldTotal = e.totalRarity ?? 0;
    const newTotal = (e.baseRarity ?? 0) + newAdditional;
    const diff = newAdditional - oldAdditional;
    const arrow = diff > 0 ? `▲ +${diff}` : `▼ ${diff}`;
    const flags = getActiveFlags(e.specs);

    if (diff > 0) scoreUp++;
    else if (diff < 0) scoreDown++;
    else scoreUnchangedTotal++;

    console.log(`  [${e.id}] ${e.make} ${e.model} ${e.variant}`);
    console.log(`    additional: ${oldAdditional} → ${newAdditional}  |  total: ${oldTotal} → ${newTotal}  ${arrow}`);
    console.log(`    flags: ${flags.join(', ')}`);
    if (e.notes) console.log(`    notes: ${e.notes}`);
    console.log('');
  });

  console.log('=== SUMMARY ===');
  console.log(`  Entries to update:   ${toUpdate.length}`);
  console.log(`  Score increases (▲): ${scoreUp}`);
  console.log(`  Score decreases (▼): ${scoreDown}`);
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run complete. To apply these changes, run:');
    console.log('  node rescore-mismatches.js --write');
    process.exit(0);
  }

  // --- LIVE WRITE ---
  // Firestore batches are limited to 500 ops each.
  console.log('Writing to Firestore...');
  const BATCH_SIZE = 500;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(e => {
      const newAdditional = calcAdditionalFromSpecs(e.specs);
      const newTotal = (e.baseRarity ?? 0) + newAdditional;
      batch.update(doc(db, 'entries', e.id), {
        additionalRarity: newAdditional,
        totalRarity: newTotal,
      });
    });
    await batch.commit();
    console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} entries)`);
  }

  console.log('\nDone. All mismatch entries have been rescored.');
  process.exit(0);
}

rescore().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
