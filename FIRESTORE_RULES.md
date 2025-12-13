# Firestore Rules & Deployment

This repo includes a `firestore.rules` file that you should deploy to your Firebase project so security rules match the app behavior.

Key points:
- `users/{userId}`: Owners can read their own doc; admin users (role === 'admin') can read other user docs.
- `crm-leads/{leadId}`: Anyone (public) can create a lead (so contact/submit forms work), but only admin users can read/update/delete leads.

How to deploy rules (Firebase CLI):

1. Install Firebase CLI if you don't have it:

```bash
npm install -g firebase-tools
```

2. Login and initialize (if not already):

```bash
firebase login
firebase init firestore
```

3. Deploy just the rules:

```bash
firebase deploy --only firestore:rules
```

Make sure you are using the same Firebase project that your web app uses (check `firebase use` or `--project` flag).

Create admin user doc helper (optional):
1. Add a service account JSON to repo root `serviceAccountKey.json` (DO NOT commit it) and install `firebase-admin`.
2. Run the script to set a user's `users/{uid}` document with role admin:

```bash
node scripts/create_admin_doc.js <UID> <email> "Admin Name"
```

This will create or update the `users/{UID}` doc and set role to `admin` using the Admin SDK.
