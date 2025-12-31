// Check user role in Firestore
// Run this in Firebase Console or Cloud Functions

// Your current authenticated user's UID is stored in the console
// To set your user as admin, run this in the Cloud Functions or use Firebase Admin SDK

// Check your UID first: request.auth.uid

// If you're testing locally, use:
// firebase login  // to ensure you're authenticated
// Then check if your user document has role: 'admin'

// To manually set yourself as admin:
// 1. Go to Firebase Console → Firestore → users collection
// 2. Find your user document (by your UID)
// 3. Add or update field: role = "admin"

console.log('Instructions to fix admin role:');
console.log('1. Go to Firebase Console → Firestore → users collection');
console.log('2. Find your user document (search by your UID)');
console.log('3. Ensure it has field: role = "admin"');
console.log('4. If document does not exist, create it with role field');
