"use client";

import { sendEmail } from "@/lib/resendTest";

function FormDataEmail() {
  async function send(formData: FormData) {
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const phone = formData.get("phone") as string;

    // Call server action
    await sendEmail({ name, email, phone });
  }

  return (
    <div>
      <form action={send} className="flex flex-col gap-4 p-4 w-80 bg-gray-100 rounded-xl">
        <input
          type="text"
          name="name"
          placeholder="Your Name"
          className="p-2 border rounded"
          required
        />
        <input
          type="email"
          name="email"
          placeholder="Your Email"
          className="p-2 border rounded"
          required
        />
        <input
          type="tel"
          name="phone"
          placeholder="Your Phone Number"
          className="p-2 border rounded"
          required
        />

        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
        >
          Send Email
        </button>
      </form>
    </div>
  );
}

export default FormDataEmail;
