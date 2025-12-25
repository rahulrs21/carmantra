import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Firebase environment variables (FIREBASE_PRIVATE_KEY, FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL)');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey.replace(/\\n/g, '\n'),
    } as admin.ServiceAccount),
  });
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { success: false, message: 'Email is required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get Firebase Admin Auth
    const auth = admin.auth();

    // Generate password reset link with custom action URL
    const appUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL || 'http://localhost:3000').replace(/\/$/, '');
    let resetLink;
    try {
      resetLink = await auth.generatePasswordResetLink(email, {
        url: `${appUrl}/auth/reset-password`,
      });
    } catch (err: any) {
      console.error('Firebase generate reset link error:', err);
      
      // Check if user exists
      if (err?.code === 'auth/user-not-found') {
        return NextResponse.json(
          { success: false, message: 'No account found with this email address' },
          { status: 404 }
        );
      }
      
      throw err;
    }

    // Create a nicely formatted email body
    const emailBody = `
Hello,

We received a request to reset your password for your Car Mantra admin account. 

Click the link below to reset your password:
${resetLink}

This link will expire in 24 hours.

If you didn't request a password reset, please ignore this email.

Best regards,
Car Mantra Team
    `.trim();

    // Send email with reset link
    const emailResp = await fetch(`${appUrl}/api/send-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: email,
        email: email,
        phone: '',
        service: 'Password Reset',
        message: emailBody,
      }),
    });

    const emailJson = await emailResp.json();

    if (emailJson?.success) {
      return NextResponse.json({ 
        success: true, 
        message: 'Password reset email sent successfully' 
      });
    } else {
      console.error('Email send failed:', emailJson);
      return NextResponse.json(
        { success: false, message: 'Failed to send email. Please try again later.' },
        { status: 500 }
      );
    }
  } catch (err: any) {
    console.error('Reset password error:', err);
    return NextResponse.json(
      { 
        success: false, 
        message: err?.message || 'Failed to process password reset. Please try again later.' 
      },
      { status: 500 }
    );
  }
}
