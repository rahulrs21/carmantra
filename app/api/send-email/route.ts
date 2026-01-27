import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { render } from '@react-email/render';
import BookingConfirmationEmail from '@/components/emails/BookingConfirmationEmail';
import QuotationEmail from '@/components/emails/QuotationEmail';
import InvoiceEmail from '@/components/emails/InvoiceEmail';
import InviteEmail from '@/components/emails/InviteEmail';

const resend = new Resend(process.env.RESEND_API_KEY || '');

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const { emailType, name, email, phone, service, message } = data;

        // Debug logging
        console.log('📧 Email API Called:', {
            emailType,
            email,
            name,
            timestamp: new Date().toISOString(),
        });

        // Support optional attachment (base64 encoded) in the request body
        const attachment = data?.attachment;

        let emailPayload: any = {
            // from: 'Car Mantra <onboarding@resend.dev>',
            from: 'Car Mantra <info@rahuldxb.com>',

        };

        // Validate email
        if (!email) {
            console.error('❌ Email error: No email address provided');
            return NextResponse.json({ success: false, error: 'Email address is required' });
        }

        // Route to different email templates based on emailType
        if (emailType === 'booking-confirmation') {
            // Booking Confirmation Email Template using react-email
            const { jobCardNo, scheduledDate, vehicleDetails, companyName, contactName, companyEmail, companyPhone } = data;
            const customerName = companyName || name || contactName;

            console.log('✅ Sending booking confirmation to:', email);

            try {
                const html = await render(
                    BookingConfirmationEmail({
                        customerName,
                        jobCardNo,
                        service: service || 'Vehicle Service',
                        scheduledDate,
                        vehicleBrand: vehicleDetails?.vehicleBrand || 'N/A',
                        vehicleModel: vehicleDetails?.modelName || 'N/A',
                        vehiclePlate: vehicleDetails?.numberPlate || 'N/A',
                        phone: phone || 'N/A',
                        companyName,
                        companyEmail,
                        companyPhone,
                    })
                );

                emailPayload = {
                    ...emailPayload,
                    to: email,
                    subject: `Service Booking Confirmed - Job Card #${jobCardNo}`,
                    html,
                };
            } catch (templateErr: any) {
                console.error('❌ Booking email template error:', templateErr);
                return NextResponse.json({ success: false, error: 'Failed to render email template' });
            }
        } else if (emailType === 'quotation-created') {
            // Quotation Email Template using react-email
            const { 
              jobCardNo, 
              quotationNumber, 
              total, 
              validityDays, 
              companyName, 
              contactName,
              serviceTitle,
              vehicles,
              companyAddress,
              companyCity,
              companyEmail,
              companyPhone
            } = data;
            const customerName = companyName || name || contactName;

            console.log('✅ Sending quotation email to:', email);

            try {
                const html = await render(
                    QuotationEmail({
                        customerName,
                        jobCardNo,
                        quotationNumber,
                        total,
                        validityDays: validityDays || 30,
                        companyName,
                        contactName,
                        serviceTitle,
                        vehicles,
                        companyAddress,
                        companyCity,
                        companyEmail,
                        companyPhone,
                    })
                );

                emailPayload = {
                    ...emailPayload,
                    to: email,
                    subject: `Quotation Ready for Review - Quotation #${quotationNumber}`,
                    html,
                };
            } catch (templateErr: any) {
                console.error('❌ Quotation email template error:', templateErr);
                return NextResponse.json({ success: false, error: 'Failed to render email template' });
            }
        } else if (emailType === 'job-completion') {
            // Job Completion (Invoice) Email Template using react-email
            const { jobCardNo, invoiceNumber, total, paymentStatus, companyName, contactName, companyEmail, companyPhone } = data;
            const customerName = companyName || name || contactName;

            console.log('✅ Sending job completion email to:', email);

            try {
                const html = await render(
                    InvoiceEmail({
                        customerName,
                        jobCardNo,
                        invoiceNumber: invoiceNumber || 'N/A',
                        total: total || 0,
                        paymentStatus: paymentStatus || 'unpaid',
                        companyName,
                        contactName,
                        companyEmail,
                        companyPhone,
                    })
                );

                emailPayload = {
                    ...emailPayload,
                    to: email,
                    subject: `Your Service is Complete - Job Card #${jobCardNo}`,
                    html,
                };
            } catch (templateErr: any) {
                console.error('❌ Job completion email template error:', templateErr);
                return NextResponse.json({ success: false, error: 'Failed to render email template' });
            }
        } else if (emailType === 'user-invite') {
            // User Invite Email
            const { displayName, inviteLink, inviteExpiresIn = 7, senderName = 'Car Mantra Admin' } = data;

            if (!displayName || !inviteLink) {
                console.error('❌ Invite email error: Missing required fields (displayName, inviteLink)');
                return NextResponse.json({ 
                    success: false, 
                    error: 'Missing required fields for invite email' 
                });
            }

            console.log('✅ Sending invite email to:', email);

            try {
                const html = await render(
                    InviteEmail({
                        displayName,
                        email,
                        inviteLink,
                        inviteExpiresIn,
                        senderName,
                    })
                );

                emailPayload = {
                    ...emailPayload,
                    to: email,
                    subject: 'You\'re Invited to Join Car Mantra CRM!',
                    html,
                };
            } catch (templateErr: any) {
                console.error('❌ Invite email template error:', templateErr);
                return NextResponse.json({ success: false, error: 'Failed to render invite email template' });
            }
        } else {
            // Default Contact Form Email Template
            console.log('✅ Sending contact form email to verified address');
            
            emailPayload = {
                ...emailPayload, 
                to: email,
                subject: `New Quote Request: ${service} - From: ${email}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                    <div style="background: linear-gradient(90deg, #1e3a8a, #2563eb); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 22px;">New Contact Form Submission</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f9fafb;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; font-weight: bold; color: #374151; width: 120px;">Customer Name:</td>
                                <td style="padding: 8px; color: #111827;">${name}</td>
                            </tr>
                            <tr style="background-color: #f3f4f6;">
                                <td style="padding: 8px; font-weight: bold; color: #374151;">Customer Email:</td>
                                <td style="padding: 8px; color: #111827;">${email}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold; color: #374151;">Phone:</td>
                                <td style="padding: 8px; color: #111827;">${phone}</td>
                            </tr>
                            <tr style="background-color: #f3f4f6;">
                                <td style="padding: 8px; font-weight: bold; color: #374151;">Service:</td>
                                <td style="padding: 8px; color: #111827;">${service}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px; font-weight: bold; color: #374151; vertical-align: top;">Message:</td>
                                <td style="padding: 8px; color: #111827;">${message || "No additional message provided."}</td>
                            </tr>
                        </table>
                    </div>
                    <div style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 12px; color: #6b7280;">
                        © ${new Date().getFullYear()} Car Mantra. All rights reserved.
                    </div>
                </div>`
            };
        }

        // Handle attachments if provided
        if (attachment && attachment.name && attachment.data) {
            console.log('📎 Attaching file:', attachment.name);
            emailPayload.attachments = [{ 
                filename: attachment.name, 
                content: attachment.data
            }];
        }

        console.log('📤 Sending email via Resend API...');
        console.log('📧 Email payload:', {
            to: emailPayload.to,
            subject: emailPayload.subject,
            from: emailPayload.from,
            hasAttachment: !!emailPayload.attachments,
            attachmentCount: emailPayload.attachments?.length || 0,
        });

        const response = await resend.emails.send(emailPayload);
        
        // Check if response has an error
        if ('error' in response && response.error) {
            console.error('❌ Resend API Error:', response.error);
            return NextResponse.json({ 
                success: false, 
                error: 'Failed to send email',
                details: response.error,
            }, { status: 500 });
        }

        const emailId = 'id' in response ? response.id : (response as any).data?.id;
        
        console.log('✅ Email sent successfully:', {
            email: emailPayload.to,
            emailType: emailType || 'default',
            resendId: emailId,
            timestamp: new Date().toISOString(),
        });

        return NextResponse.json({ 
            success: true,
            message: 'Email sent successfully',
            id: emailId,
            email: emailPayload.to,
        });
    } catch (err: any) {
        console.error('❌ Email API Error:', {
            message: err.message,
            error: err.toString(),
            stack: err.stack,
            timestamp: new Date().toISOString(),
        });

        // Log detailed error info
        if (err.response) {
            console.error('❌ Resend API Response Error:', err.response);
        }

        return NextResponse.json({ 
            success: false, 
            error: err.message || 'Failed to send email',
            details: process.env.NODE_ENV === 'development' ? err.toString() : undefined,
        }, { status: 500 });
    }
}
