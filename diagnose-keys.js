// diagnose-keys.js — READ ONLY. Scans all specs objects and reports every
// unique key found, how many entries use it, and whether it's a known V2 key.
// Run with: node diagnose-keys.js

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

// Current V2 canonical keys
const V2_KEYS = new Set([
  'bodykit', 'aeromods', 'disrespected', 'rareoem', 'rareafter',
  'frontswap', 'trackday', 'drift', 'livery', 'rims',
  'vip', 'stance', 'twotone', 'showcar', 'hof'
]);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function diagnose() {
  console.log('Fetching all entries...\n');
  const snapshot = await getDocs(collection(db, 'entries'));
  const entries = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`Total entries: ${entries.length}\n`);

  // Count how many entries use each key (only where value is true)
  const keyCounts = {};
  let noSpecs = 0;

  for (const entry of entries) {
    if (!entry.specs || typeof entry.specs !== 'object') {
      noSpecs++;
      continue;
    }
    for (const [key, val] of Object.entries(entry.specs)) {
      if (val === true) {
        keyCounts[key] = (keyCounts[key] || 0) + 1;
      }
    }
  }

  const allKeys = Object.entries(keyCounts).sort((a, b) => b[1] - a[1]);
  const knownKeys = allKeys.filter(([k]) => V2_KEYS.has(k));
  const unknownKeys = allKeys.filter(([k]) => !V2_KEYS.has(k));

  console.log('=== ALL KEYS FOUND IN SPECS (sorted by usage) ===\n');
  console.log('  [count]  key                      known?');
  console.log('  -------  ---                      ------');
  allKeys.forEach(([key, count]) => {
    const known = V2_KEYS.has(key) ? 'V2 ✓' : '*** UNKNOWN ***';
    console.log(`  [${String(count).padStart(4)}]  ${key.padEnd(24)} ${known}`);
  });

  console.log(`\n  Entries with no specs object at all: ${noSpecs}`);

  if (unknownKeys.length === 0) {
    console.log('\n✓ No unknown keys found. All specs use current V2 key names.');
  } else {
    console.log(`\n*** FOUND ${unknownKeys.length} UNKNOWN KEY(S) — these are invisible to the current filter system ***\n`);
    unknownKeys.forEach(([key, count]) => {
      console.log(`  "${key}" — used in ${count} entries`);

      // Show sample entries for this key
      const samples = entries.filter(e => e.specs?.[key] === true).slice(0, 3);
      samples.forEach(e => {
        console.log(`    [${e.id}] ${e.make} ${e.model} ${e.variant} — additional=${e.additionalRarity} notes: ${e.notes || '(none)'}`);
      });
      console.log('');
    });
  }

  console.log('=== DIAGNOSIS COMPLETE — no data was modified ===');
  process.exit(0);
}

diagnose().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
