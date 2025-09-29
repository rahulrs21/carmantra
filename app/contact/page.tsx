"use client";

import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import { Mail, Phone, MapPin, Send } from "lucide-react";

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const GOOGLE_SCRIPT_URL =
    "https://script.google.com/macros/s/AKfycbxxxx/exec"; // replace with your Web App URL

  // Load saved data from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem("contactForm");
    if (savedData) {
      setFormData(JSON.parse(savedData));
    }
  }, []);

  // Handle input change
  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const updatedData = { ...formData, [e.target.name]: e.target.value };
    setFormData(updatedData);

    // Save to localStorage
    localStorage.setItem("contactForm", JSON.stringify(updatedData));
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: "POST",
        mode: "no-cors", // important for Google Apps Script
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      console.log("Submitted:", formData);
      setSubmitted(true);

      // Clear message only (keep name/email/phone)
      setFormData({ ...formData, message: "" });
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <div className="min-h-screen  bg-gray-800  dark:bg-gray-900 py-16 px-6 md:px-12 lg:px-24">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: -40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl pt-12 md:text-5xl font-bold text-gray-900 dark:text-white">
          Get in Touch
        </h1>
        <p className="mt-4 text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
          Fill out the form and we’ll get back to you soon.
        </p>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
        {/* Form */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-lg"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Send Us a Message
          </h2>

          {!submitted ? (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white 
                  focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white 
                  focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white 
                  focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-2">
                  Message
                </label>
                <textarea
                  name="message"
                  rows={4}
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white 
                  focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 
                text-white py-3 px-6 rounded-lg shadow-lg transition-all"
              >
                <Send size={18} /> Send Message
              </button>
            </form>
          ) : (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
              className="text-center py-12"
            >
              <h3 className="text-2xl font-bold text-green-600">
                ✅ Thank you! Your message has been sent.
              </h3>
            </motion.div>
          )}
        </motion.div>

        {/* Info */}
        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex flex-col justify-center bg-gray-100 dark:bg-gray-800 p-8 rounded-2xl shadow-lg"
        >
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6">
            Contact Information
          </h2>
          
          <div className="space-y-5 text-gray-700 dark:text-gray-300">
            <p className="flex items-center gap-3">
              <Mail className="text-blue-600" /> contact@rahuldxb.com
            </p>
            <p className="flex items-center gap-3">
              <Phone className="text-blue-600" /> +971 55 123 4567
            </p>
            <p className="flex items-center gap-3">
              <MapPin className="text-blue-600" /> Dubai, UAE
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
