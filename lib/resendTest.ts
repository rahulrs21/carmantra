"use server";

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendEmail = async (data: { name: string; email: string; phone: string }) => {
  await resend.emails.send({
    from: "Rahul DXB <onboarding@resend.dev>",
    to: "rahulrs2448@gmail.com",
    subject: "New Form Submission",
    html: `
      <h2>New Contact Form Submission</h2>
      <p><strong>Name:</strong> ${data.name}</p>
      <p><strong>Email:</strong> ${data.email}</p>
      <p><strong>Phone:</strong> ${data.phone}</p>
    `,
  });
};
