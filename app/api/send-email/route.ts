import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const data = await req.json();
        const { name, email, phone, service, message } = data;

        await resend.emails.send({
            from: 'Car Mantra <onboarding@resend.dev>',
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
            </div>`,

        });

        return NextResponse.json({ success: true });
    } catch (err: any) {
        try { console.error(err); } catch(e) { /* swallow */ }
        return NextResponse.json({ success: false, error: err.message || 'Unknown error' });
    }
}
