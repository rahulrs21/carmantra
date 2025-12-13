/**
 * Script to create a Firestore user document with role: 'admin'
 *
 * Usage:
 * 1. Place your Firebase service account JSON at the repo root as `serviceAccountKey.json`.
 * 2. Install firebase-admin: `npm install firebase-admin` (or `npm i -D firebase-admin`).
 * 3. Run: `node scripts/create_admin_doc.js <UID> <email> "Display Name"`
 *
 * This will create a document at `users/<UID>` with the admin role.
 */

const admin = require('firebase-admin');
const process = require('process');

if (!process.argv[2]) {
  console.error('Usage: node scripts/create_admin_doc.js <UID> <email> "Display Name"');
  process.exit(1);
}

const uid = process.argv[2];
const email = process.argv[3] || '';
const name = process.argv[4] || 'Admin User';

try {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  (async () => {
    const ref = db.collection('users').doc(uid);
    await ref.set({
      name,
      email,
      role: 'admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    console.log('Created/updated users/' + uid + ' with role admin');
    process.exit(0);
  })();
} catch (err) {
  console.error('Error:', err.message || err);
  process.exit(1);
}
