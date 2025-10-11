"use client";

import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Mail, Phone, MapPin, Send, LoaderIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ContactPage() {
  const nameRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [submitted, setSubmitted] = useState<boolean>(false);

  const [formData, setFormData] = useState<{
    name: string;
    email: string;
    phone: string;
    service?: string;
    message: string;
  }>({
    name: '',
    email: '',
    phone: '',
    message: '',
  });



  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',       // MUST be POST
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }).then(r => r.json());


      if (res.success) {
        setSubmitted(true);
        alert('✅ Your message has been sent successfully!');
        setFormData({
          name: '',
          email: '',
          phone: '',
          message: '',
        });
      } else {
        alert('❌ Something went wrong. Please try again later.');
      }
    } catch (err) {
      console.error(err);
      alert('❌ Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSuccess = () => {
    setSubmitted(false); // hide success div
    setFormData({
      name: '',
      email: '',
      phone: '',
      message: '',
    });
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
        <h1 className="text-4xl pt-12 md:text-5xl font-bold text-white dark:text-white">
          Get in Touch
        </h1>
        <p className="mt-4 text-gray-300 dark:text-gray-300 max-w-2xl mx-auto">
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
                  ref={nameRef}
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
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
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
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
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 
                  bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white 
                  focus:ring-2 focus:ring-blue-500 transition-all"
                />
              </div>

               {/* Submit Button */}
          <Button
            type="submit"
            className="w-full dark:bg-blue-500 dark:text-white dark:border dark:border-blue-900"
          >
            {loading ? 'Submitting' : 'Submit'}
            <LoaderIcon
              className={`ml-2 ${loading ? 'inline-block animate-spin' : 'hidden'}`}
            />
          </Button>
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
