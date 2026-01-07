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

    // Delete user from Firebase Authentication
    await admin.auth().deleteUser(uid);

    console.log(`✅ User deleted from Firebase Auth: ${email} (UID: ${uid})`);

    return NextResponse.json(
      { success: true, message: `User ${email} deleted from Firebase Auth` },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('Error deleting user from Firebase Auth:', error);

    // If user doesn't exist in Auth, that's okay
    if (error.code === 'auth/user-not-found') {
      return NextResponse.json(
        { success: true, message: 'User not found in Firebase Auth (already deleted)' },
        { status: 200 }
      );
    }

    return NextResponse.json(
      { error: error.message, code: error.code },
      { status: 500 }
    );
  }
}
