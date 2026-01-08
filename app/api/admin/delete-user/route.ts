import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
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
