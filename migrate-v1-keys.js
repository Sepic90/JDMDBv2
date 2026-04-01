// migrate-v1-keys.js — Rename V1 camelCase spec keys to V2 lowercase equivalents.
// Recalculates additionalRarity and totalRarity from the corrected specs.
//
// DRY RUN (default — no writes):
//   node migrate-v1-keys.js
//
// LIVE WRITE (updates Firestore):
//   node migrate-v1-keys.js --write

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

// V1 → V2 key mapping
const KEY_MAP = {
  aeroMods:        'aeromods',
  hallOfFame:      'hof',
  rareOEM:         'rareoem',
  rareAftermarket: 'rareafter',
  twoTone:         'twotone',
  frontSwap:       'frontswap',
};

// V2 scoring rules
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

function calcAdditional(specs) {
  return ATTRIBUTES.reduce((sum, a) => sum + (specs[a.key] ? a.points : 0), 0);
}

// Returns a cleaned specs object with V1 keys renamed to V2.
// If both V1 and V2 key exist for the same attribute, they are merged (OR).
function migrateSpecs(specs) {
  const result = { ...specs };
  for (const [v1, v2] of Object.entries(KEY_MAP)) {
    if (v1 in result) {
      result[v2] = result[v2] || result[v1]; // merge: true wins
      delete result[v1];
    }
  }
  return result;
}

function hasV1Keys(specs) {
  return Object.keys(KEY_MAP).some(k => k in specs);
}

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function migrate() {
  console.log(DRY_RUN
    ? '=== DRY RUN — no writes will occur ===\n'
    : '=== LIVE WRITE MODE — Firestore will be updated ===\n'
  );

  console.log('Fetching all entries...\n');
  const snapshot = await getDocs(collection(db, 'entries'));
  const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total entries: ${entries.length}`);

  const toUpdate = entries.filter(e => e.specs && hasV1Keys(e.specs));
  console.log(`Entries with V1 keys: ${toUpdate.length}\n`);

  if (toUpdate.length === 0) {
    console.log('Nothing to migrate.');
    process.exit(0);
  }

  let scoreUp = 0, scoreDown = 0, scoreEqual = 0;

  console.log('=== PREVIEW OF CHANGES ===\n');
  toUpdate.forEach(e => {
    const oldSpecs = e.specs;
    const newSpecs = migrateSpecs(oldSpecs);

    // Which V1 keys are being renamed on this entry
    const renamedKeys = Object.keys(KEY_MAP)
      .filter(v1 => oldSpecs[v1] === true)
      .map(v1 => `${v1} → ${KEY_MAP[v1]}`);

    const oldAdditional = e.additionalRarity ?? 0;
    const newAdditional = calcAdditional(newSpecs);
    const oldTotal = e.totalRarity ?? 0;
    const newTotal = (e.baseRarity ?? 0) + newAdditional;
    const diff = newAdditional - oldAdditional;
    const arrow = diff > 0 ? ` ▲ +${diff}` : diff < 0 ? ` ▼ ${diff}` : '';

    if (diff > 0) scoreUp++;
    else if (diff < 0) scoreDown++;
    else scoreEqual++;

    console.log(`  [${e.id}] ${e.make} ${e.model} ${e.variant}`);
    console.log(`    keys:       ${renamedKeys.join(', ')}`);
    console.log(`    additional: ${oldAdditional} → ${newAdditional}  |  total: ${oldTotal} → ${newTotal}${arrow}`);
    if (e.notes) console.log(`    notes:      ${e.notes}`);
    console.log('');
  });

  console.log('=== SUMMARY ===');
  console.log(`  Entries to migrate:  ${toUpdate.length}`);
  console.log(`  Score increases (▲): ${scoreUp}`);
  console.log(`  Score decreases (▼): ${scoreDown}`);
  console.log(`  Score unchanged:     ${scoreEqual}`);
  console.log('');

  if (DRY_RUN) {
    console.log('Dry run complete. To apply these changes, run:');
    console.log('  node migrate-v1-keys.js --write');
    process.exit(0);
  }

  // --- LIVE WRITE ---
  console.log('Writing to Firestore...');
  const BATCH_SIZE = 500;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const chunk = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = writeBatch(db);
    chunk.forEach(e => {
      const newSpecs = migrateSpecs(e.specs);
      const newAdditional = calcAdditional(newSpecs);
      const newTotal = (e.baseRarity ?? 0) + newAdditional;
      batch.update(doc(db, 'entries', e.id), {
        specs: newSpecs,
        additionalRarity: newAdditional,
        totalRarity: newTotal,
      });
    });
    await batch.commit();
    console.log(`  Committed batch ${Math.floor(i / BATCH_SIZE) + 1} (${chunk.length} entries)`);
  }

  console.log('\nMigration complete. All V1 keys have been renamed to V2.');
  process.exit(0);
}

migrate().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
