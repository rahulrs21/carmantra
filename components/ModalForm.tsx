'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Check } from 'lucide-react';
import { set } from 'date-fns';

interface ModalFormProps {
  selectedService: string;
  onClose: () => void;
}

export default function ModalForm({ selectedService, onClose }: ModalFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: selectedService,
    message: '',
  });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const validatePhone = (phone: string) => {
    const regex = /^\+?[0-9\s-]{7,15}$/;
    return regex.test(phone);
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();


    if (!formData.name || !formData.phone || !formData.service) {
      alert("Please fill all required fields!");
      return;
    }

    if (!validatePhone(formData.phone)) {
      alert("Please enter a valid phone number!");
      return;
    }
    try {
      setLoading(true);
      const response = await fetch(
        "https://script.google.com/macros/s/AKfycbzWI83WWovIhSx07VUqA_x1K0RpfU9bfGjE44iYZtgRfhLoWrWO8fW8RuoAEMcfaer2/exec", // <-- Replace with your deployed Web App URL
        {
          method: "POST",
          body: new URLSearchParams(formData), // Sends form data as POST
        }
      );

      const result = await response.json();
      setLoading(false);
      console.log(result);

      if (result.status === "success") {
        setSubmitted(true);
        setTimeout(() => {
          setSubmitted(false);
          setFormData({ name: '', phone: '', service: '', message: '' });
          onClose();
        }, 2000);
      } else {
        alert("Failed to submit. Please try again.");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      alert("An error occurred. Please try again.");
    }
  };


  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black/50 flex items-center p-3 md:p-0 justify-center z-50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          className="bg-white rounded-lg w-full max-w-md p-6 relative shadow-xl overflow-hidden"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.8, opacity: 0 }}
        >
          {!submitted ? (
            <>
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={onClose}
              >
                <X size={24} />
              </button>
              <h2 className="text-2xl font-bold mb-4 dark:text-black">Request a Quote</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block font-semibold  mb-1 dark:text-black">Name *</label>
                  <input
                    type="text"
                    ref={nameRef}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-3 border rounded-lg dark:text-black"
                    placeholder="Enter your name"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 dark:text-black">Phone *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-3 border rounded-lg dark:text-black"
                    placeholder="Enter your phone number"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 dark:text-black">Selected Service *</label>
                  <input
                    type="text"
                    value={formData.service}
                    readOnly
                    className="w-full p-3 border rounded-lg bg-gray-100 dark:text-black"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 dark:text-black">Message (Optional)</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full p-3 border rounded-lg dark:text-black"
                    placeholder="Your message..."
                  />
                </div>
                <Button type="submit" className="w-full dark:bg-blue-500 dark:text-white dark:border dark:border-blue-900">
                  {loading ? 'Submitting...' : 'Submit'}
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center justify-center py-10"
            >
              <Check className="h-16 w-16 text-green-500 mb-4 animate-bounce" />
              <h3 className="text-xl font-bold text-gray-900">Form Submitted!</h3>
              <p className="text-gray-700 mt-2 text-center">
                Thank you! We will contact you shortly.
              </p>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
