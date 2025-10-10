"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface FormDataProps {
  name: string;
  email: string;
  phone: string;
  service?: string; // now optional
  message: string;
}

export async function sendEmail(
    data: FormDataProps
): Promise<{ success: boolean; error?: string }> {
    try {
        await resend.emails.send({
            from: "Car Mantra <onboarding@resend.dev>", // use verified domain later
            to: "rahulrs2448@gmail.com",
            subject: `New Quote Request: ${data.service}`,
            html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; border: 1px solid #eaeaea; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.08);">
                <div style="background: linear-gradient(90deg, #1e3a8a, #2563eb); color: white; padding: 20px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">New Contact Form Submission</h1>
                </div>
                <div style="padding: 20px; background-color: #f9fafb;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                    <td style="padding: 8px; font-weight: bold; color: #374151; width: 120px;">Name:</td>
                    <td style="padding: 8px; color: #111827;">${data.name}</td>
                    </tr>
                    <tr style="background-color: #f3f4f6;">
                    <td style="padding: 8px; font-weight: bold; color: #374151;">Email:</td>
                    <td style="padding: 8px; color: #111827;">${data.email}</td>
                    </tr>
                    <tr>
                    <td style="padding: 8px; font-weight: bold; color: #374151;">Phone:</td>
                    <td style="padding: 8px; color: #111827;">${data.phone}</td>
                    </tr>
                    <tr style="background-color: #f3f4f6;">
                    <td style="padding: 8px; font-weight: bold; color: #374151;">Service:</td>
                    <td style="padding: 8px; color: #111827;">${data.service}</td>
                    </tr>
                    <tr>
                    <td style="padding: 8px; font-weight: bold; color: #374151; vertical-align: top;">Message:</td>
                    <td style="padding: 8px; color: #111827;">${data.message || "No additional message provided."}</td>
                    </tr>
                </table>
                </div>
                <div style="background-color: #f3f4f6; text-align: center; padding: 15px; font-size: 12px; color: #6b7280;">
                © ${new Date().getFullYear()} Faza Home. All rights reserved.
                </div>
            </div>`,
        });

        return { success: true };
    } catch (err: any) {
        console.error("Resend error:", err);
        return { success: false, error: err?.message || "Unknown error" };
    }
}
