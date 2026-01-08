import { NextRequest, NextResponse } from 'next/server';
import * as admin from 'firebase-admin';
import { Resend } from 'resend';

// Initialize Firebase Admin if not already initialized
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

const db = admin.firestore();
const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { leadId, email, name } = body;

    console.log('Received request with:', { leadId, email, name });

    if (!leadId || !email || !name) {
      console.error('Missing fields:', { leadId: !!leadId, email: !!email, name: !!name });
      return NextResponse.json(
        { success: false, error: 'Missing required fields: leadId, email, name' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error('Invalid email format:', email);
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Create booking form document with unique token
    const token = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log('Created token:', token);
    
    try {
      await db.collection('bookingForms').doc(token).set({
        leadId,
        email,
        name,
        createdAt: new Date(),
        submitted: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      });
      console.log('✓ Saved booking form to database');
    } catch (firestoreErr: any) {
      console.error('Firestore error:', firestoreErr.message);
      return NextResponse.json(
        { success: false, error: `Database error: ${firestoreErr.message}` },
        { status: 500 }
      );
    }

    // Send email with form link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const formLink = `${appUrl}/customer/book-service/${token}`;

    console.log('Form link:', formLink);

    if (!appUrl) {
      console.error('Missing NEXT_PUBLIC_APP_URL environment variable');
      return NextResponse.json(
        { success: false, error: 'Configuration error: APP_URL not set' },
        { status: 500 }
      );
    }

    if (!process.env.RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY environment variable');
      return NextResponse.json(
        { success: false, error: 'Configuration error: Email service not configured' },
        { status: 500 }
      );
    }

    try {
      const result = await resend.emails.send({
        from: 'CarMantra <noreply@rahuldxb.com>',
        to: email,
        subject: '📋 Complete Your Service Booking - CarMantra',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #f97316 0%, #3b82f6 100%); padding: 20px; color: white; border-radius: 8px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px;">CarMantra</h1>
              <p style="margin: 5px 0 0 0; font-size: 14px;">Service Booking Form</p>
            </div>

            <div style="padding: 30px; background-color: #f9fafb;">
              <p style="font-size: 16px; color: #333;">Hi ${name},</p>
              <p style="color: #666; line-height: 1.6;">
                Thank you for your interest in our services! Please fill out the form below to complete your booking request. 
                We'll review your details and contact you shortly to confirm your appointment.
              </p>

              <div style="margin: 30px 0; text-align: center;">
                <a href="${formLink}" style="display: inline-block; background-color: #f97316; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px; border: none; cursor: pointer;">
                  📋 Open Booking Form
                </a>
              </div>

              <p style="color: #666; font-size: 14px; border-top: 1px solid #e5e7eb; padding-top: 20px;">
                <strong>Or copy this link:</strong><br/>
                <code style="background-color: #f3f4f6; padding: 8px; display: inline-block; border-radius: 4px; word-break: break-all; font-size: 12px;">
                  ${formLink}
                </code>
              </p>

              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-top: 20px; border-radius: 4px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  ⏱️ <strong>This form link expires in 24 hours.</strong> Please complete it as soon as possible.
                </p>
              </div>

              <p style="color: #666; font-size: 14px; margin-top: 20px;">
                If you didn't request this form or have any questions, please contact us at support@carmantra.com
              </p>
            </div>

            <div style="background-color: #f3f4f6; padding: 20px; text-align: center; font-size: 12px; color: #666;">
              <p style="margin: 0;">CarMantra - Professional Car Care Services</p>
              <p style="margin: 5px 0 0 0;">© 2024 CarMantra. All rights reserved.</p>
            </div>
          </div>
        `,
      });

      console.log('✓ Resend response:', JSON.stringify(result, null, 2));

      // Check for API errors first
      if (result.error) {
        console.error('❌ Resend API error:', result.error);
        const errorMessage = typeof result.error === 'object' && 'message' in result.error 
          ? (result.error as any).message 
          : String(result.error);
        return NextResponse.json(
          { success: false, error: `Email service error: ${errorMessage}` },
          { status: 500 }
        );
      }

      // Check for successful response
      if (!result.data?.id) {
        console.error('❌ No email ID in Resend response:', result);
        return NextResponse.json(
          { success: false, error: 'Email sending failed - no confirmation ID returned' },
          { status: 500 }
        );
      }

      console.log('✓ Email sent successfully:', result.data.id);
      return NextResponse.json({
        success: true,
        message: 'Form link sent successfully',
        id: result.data.id,
        token,
      });
    } catch (emailErr: any) {
      console.error('❌ Resend exception:', emailErr);
      return NextResponse.json(
        { success: false, error: `Email service error: ${emailErr.message || 'Unknown error'}` },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Form link error:', error.message, error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
