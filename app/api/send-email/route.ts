import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

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
            from: 'Car Mantra <onboarding@resend.dev>',
        };

        // Validate email
        if (!email) {
            console.error('❌ Email error: No email address provided');
            return NextResponse.json({ success: false, error: 'Email address is required' });
        }

        // Route to different email templates based on emailType
        if (emailType === 'booking-confirmation') {
            // Booking Confirmation Email Template
            const { jobCardNo, scheduledDate, vehicleDetails, companyName, contactName } = data;
            const customerName = companyName || name || contactName;
            const scheduledDateFormatted = new Date(scheduledDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });

            const vehicleInfo = vehicleDetails 
                ? `${vehicleDetails.vehicleBrand} ${vehicleDetails.modelName} (${vehicleDetails.numberPlate})`
                : 'Vehicle details to be confirmed';

            console.log('✅ Sending booking confirmation to:', email);

            emailPayload = {
                ...emailPayload,
                to: email,
                subject: `Service Booking Confirmed - Job Card #${jobCardNo}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                    <div style="background: linear-gradient(90deg, #ea580c, #f97316); color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">Service Booking Confirmed! 🎉</h1>
                        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Your service booking has been successfully scheduled</p>
                    </div>
                    <div style="padding: 30px; background-color: #f9fafb;">
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 14px;">Dear ${customerName},</p>
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 14px;">Thank you for booking our services! Your booking has been confirmed. Here are your booking details:</p>
                        
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151; width: 150px;">Job Card No:</td>
                                    <td style="padding: 10px 0; color: #111827; font-family: monospace; font-weight: bold; color: #ea580c;">${jobCardNo}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Service:</td>
                                    <td style="padding: 10px 0; color: #111827;">${service}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Scheduled Date:</td>
                                    <td style="padding: 10px 0; color: #111827;">${scheduledDateFormatted}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Vehicle:</td>
                                    <td style="padding: 10px 0; color: #111827;">${vehicleInfo}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Contact:</td>
                                    <td style="padding: 10px 0; color: #111827;">${phone}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 0; color: #92400e; font-size: 13px;"><strong>⏰ Important:</strong> Please arrive 10 minutes before your scheduled time. Bring your vehicle documents and registration papers.</p>
                        </div>

                        <p style="margin: 20px 0 10px 0; color: #111827; font-size: 14px;">If you need to reschedule or cancel, please contact us as soon as possible:</p>
                        <p style="margin: 0; color: #111827; font-size: 14px;">
                            📞 <strong>Phone:</strong> +971 (0) 4 XXX XXXX<br/>
                            📧 <strong>Email:</strong> support@carmantra.ae
                        </p>

                        <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px;">Best regards,<br/>Car Mantra Team</p>
                    </div>
                    <div style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 12px; color: #6b7280;">
                        © ${new Date().getFullYear()} Car Mantra. All rights reserved.
                    </div>
                </div>`
            };
        } else if (emailType === 'quotation-created') {
            // Quotation Created Email Template
            const { jobCardNo, quotationNumber, total, validityDays, companyName, contactName } = data;
            const customerName = companyName || name || contactName;

            console.log('✅ Sending quotation email to:', email);

            emailPayload = {
                ...emailPayload,
                to: email,
                subject: `Quotation Ready for Review - Job Card #${jobCardNo}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                    <div style="background: linear-gradient(90deg, #3b82f6, #2563eb); color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">Quotation Ready! 📋</h1>
                        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Your service quotation has been prepared and is ready for your review</p>
                    </div>
                    <div style="padding: 30px; background-color: #f9fafb;">
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 14px;">Dear ${customerName},</p>
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 14px;">Your quotation has been prepared based on the service requirements. Please review the details below:</p>
                        
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151; width: 150px;">Job Card No:</td>
                                    <td style="padding: 10px 0; color: #111827; font-family: monospace; font-weight: bold; color: #3b82f6;">${jobCardNo}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Quotation No:</td>
                                    <td style="padding: 10px 0; color: #111827;">${quotationNumber}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Total Amount:</td>
                                    <td style="padding: 10px 0; color: #111827; font-size: 16px; font-weight: bold; color: #3b82f6;">AED ${parseFloat(total).toFixed(2)}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Validity:</td>
                                    <td style="padding: 10px 0; color: #111827;">${validityDays || 'As discussed'}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="background: #dbeafe; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 0; color: #1e40af; font-size: 13px;"><strong>📎 Quotation Attached:</strong> Please find the detailed quotation attached to this email. Review all items, rates, and terms carefully.</p>
                        </div>

                        <p style="margin: 20px 0 10px 0; color: #111827; font-size: 14px;"><strong>Next Steps:</strong></p>
                        <ul style="margin: 0; padding-left: 20px; color: #111827; font-size: 14px;">
                            <li style="margin: 5px 0;">Review the quotation carefully</li>
                            <li style="margin: 5px 0;">Contact us to confirm or discuss any modifications</li>
                            <li style="margin: 5px 0;">Once approved, we will proceed with the service</li>
                        </ul>

                        <p style="margin: 20px 0 10px 0; color: #111827; font-size: 14px;">Questions about this quotation? Contact us:</p>
                        <p style="margin: 0; color: #111827; font-size: 14px;">
                            📞 <strong>Phone:</strong> +971 (0) 4 XXX XXXX<br/>
                            📧 <strong>Email:</strong> support@carmantra.ae
                        </p>

                        <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px;">Best regards,<br/>Car Mantra Team</p>
                    </div>
                    <div style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 12px; color: #6b7280;">
                        © ${new Date().getFullYear()} Car Mantra. All rights reserved.
                    </div>
                </div>`
            };
        } else if (emailType === 'job-completion') {
            // Job Completion Email Template
            const { jobCardNo, companyName, contactName } = data;
            const customerName = companyName || name || contactName;

            console.log('✅ Sending job completion email to:', email);

            emailPayload = {
                ...emailPayload,
                to: email,
                subject: `Your Service is Complete - Job Card #${jobCardNo}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                    <div style="background: linear-gradient(90deg, #10b981, #059669); color: white; padding: 30px; text-align: center;">
                        <h1 style="margin: 0; font-size: 28px;">Service Complete! ✓</h1>
                        <p style="margin: 10px 0 0 0; font-size: 14px; opacity: 0.9;">Your vehicle service is finished and ready for pickup</p>
                    </div>
                    <div style="padding: 30px; background-color: #f9fafb;">
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 14px;">Dear ${customerName},</p>
                        <p style="margin: 0 0 20px 0; color: #111827; font-size: 14px;">Excellent news! Your service has been completed successfully. Your vehicle is ready for pickup.</p>
                        
                        <div style="background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
                            <table style="width: 100%; border-collapse: collapse;">
                                <tr>
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151; width: 150px;">Job Card No:</td>
                                    <td style="padding: 10px 0; color: #111827; font-family: monospace; font-weight: bold; color: #10b981;">${jobCardNo}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Service Type:</td>
                                    <td style="padding: 10px 0; color: #111827;">${service || 'Service'}</td>
                                </tr>
                                <tr style="border-top: 1px solid #e5e7eb;">
                                    <td style="padding: 10px 0; font-weight: bold; color: #374151;">Completion Date:</td>
                                    <td style="padding: 10px 0; color: #111827;">${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</td>
                                </tr>
                            </table>
                        </div>

                        <div style="background: #dcfce7; border-left: 4px solid #10b981; padding: 15px; border-radius: 4px; margin: 20px 0;">
                            <p style="margin: 0; color: #166534; font-size: 13px;"><strong>✓ Invoice Attached:</strong> Your final invoice is attached to this email. Please review all charges and payment details.</p>
                        </div>

                        <p style="margin: 20px 0 10px 0; color: #111827; font-size: 14px;"><strong>Pickup Details:</strong></p>
                        <ul style="margin: 0; padding-left: 20px; color: #111827; font-size: 14px;">
                            <li style="margin: 5px 0;">Visit our facility during business hours to collect your vehicle</li>
                            <li style="margin: 5px 0;">Bring your Job Card number (${jobCardNo}) for quick reference</li>
                            <li style="margin: 5px 0;">Please inspect your vehicle and let us know if you're satisfied</li>
                            <li style="margin: 5px 0;">Complete the payment if not already done</li>
                        </ul>

                        <p style="margin: 20px 0 10px 0; color: #111827; font-size: 14px;"><strong>Quality Guarantee:</strong></p>
                        <p style="margin: 0 0 10px 0; color: #111827; font-size: 14px;">We provide a 100% satisfaction guarantee on all our services. If you have any concerns, please contact us immediately.</p>

                        <p style="margin: 20px 0 10px 0; color: #111827; font-size: 14px;">For pickup details or any questions, please contact us:</p>
                        <p style="margin: 0; color: #111827; font-size: 14px;">
                            📞 <strong>Phone:</strong> +971 (0) 4 XXX XXXX<br/>
                            📧 <strong>Email:</strong> support@carmantra.ae
                        </p>

                        <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 13px;">Thank you for choosing Car Mantra!<br/>Car Mantra Team</p>
                    </div>
                    <div style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 12px; color: #6b7280;">
                        © ${new Date().getFullYear()} Car Mantra. All rights reserved.
                    </div>
                </div>`
            };
        } else {
            // Default Contact Form Email Template (Keep existing one)
            console.log('✅ Sending contact form email to admin');
            
            emailPayload = {
                ...emailPayload,
                to: 'rahulrs2448@gmail.com',
                subject: `New Quote Request: ${service}`,
                html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                    <div style="background: linear-gradient(90deg, #1e3a8a, #2563eb); color: white; padding: 20px; text-align: center;">
                        <h1 style="margin: 0; font-size: 22px;">New Contact Form Submission</h1>
                    </div>
                    <div style="padding: 20px; background-color: #f9fafb;">
                        <table style="width: 100%; border-collapse: collapse;">
                            <tr>
                                <td style="padding: 8px; font-weight: bold; color: #374151; width: 120px;">Name:</td>
                                <td style="padding: 8px; color: #111827;">${name}</td>
                            </tr>
                            <tr style="background-color: #f3f4f6;">
                                <td style="padding: 8px; font-weight: bold; color: #374151;">Email:</td>
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
                name: attachment.name, 
                data: attachment.data, 
                type: attachment.type || 'application/octet-stream' 
            }];
        }

        console.log('📤 Sending email via Resend API...');
        const response = await resend.emails.send(emailPayload);
        
        console.log('✅ Email sent successfully:', {
            email: emailPayload.to,
            emailType: emailType || 'default'
        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error('❌ Email API Error:', {
            message: err.message,
            error: err,
            timestamp: new Date().toISOString(),
        });
        return NextResponse.json({ success: false, error: err.message || 'Unknown error' });
    }
}
