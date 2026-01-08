import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    const serviceAccount = {
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      private_key_id: '',
      private_key: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      client_id: '',
      auth_uri: 'https://accounts.google.com/o/oauth2/auth',
      token_uri: 'https://oauth2.googleapis.com/token',
      auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
      client_x509_cert_url: '',
    };

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount as any),
      databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}.firebaseio.com`,
    });
    console.log('✓ Firebase Admin initialized successfully');
  } catch (error: any) {
    console.error('Firebase Admin init error:', error.message);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { uid, email } = await req.json();

    if (!uid) {
      return NextResponse.json(
        { error: 'User UID is required' },
        { status: 400 }
      );
    }

    let deletionSuccess = false;

    // Delete user from Firebase Authentication
    try {
      await admin.auth().deleteUser(uid);
      console.log(`✅ User deleted from Firebase Auth: ${email} (UID: ${uid})`);
      deletionSuccess = true;
    } catch (authError: any) {
      // If user doesn't exist in Auth, that's okay - they might have been deleted already
      if (authError.code === 'auth/user-not-found') {
        console.log(`ℹ️ User not found in Firebase Auth (already deleted): ${email} (UID: ${uid})`);
        deletionSuccess = true;
      } else {
        console.error('Error deleting from Firebase Auth:', authError);
        throw authError;
      }
    }

    // Verify deletion by trying to get the user
    try {
      await admin.auth().getUser(uid);
      console.warn(`⚠️ User still exists in Firebase Auth after deletion attempt: ${uid}`);
    } catch (verifyError: any) {
      if (verifyError.code === 'auth/user-not-found') {
        console.log(`✅ Verified: User successfully deleted from Firebase Auth: ${uid}`);
      }
    }

    return NextResponse.json(
      { success: true, message: `User ${email} deleted from Firebase Auth`, deleted: deletionSuccess },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting user from Firebase Auth:', error);

    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 }
    );
  }
}
