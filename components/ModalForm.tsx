'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, Check, LoaderIcon } from 'lucide-react';
import { set } from 'date-fns';
import Invoice from './Invoice';
import { db } from "@/lib/firebase";
import { collection, addDoc } from "firebase/firestore";
import { safeConsoleLog, safeConsoleError } from '@/lib/safeConsole';

interface ModalFormProps {
  selectedService: string;
  onClose: () => void;
}

export default function ModalForm({ selectedService, onClose }: ModalFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    service: selectedService,
    mode: '',
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

    setLoading(true);

    if (!formData.name || !formData.phone || !formData.service || !formData.mode) {
      alert("Please fill all required fields!");
      return;
    }

    if (!validatePhone(formData.phone)) {
      alert("Please enter a valid phone number!");
      return;
    }

    try {
      const response = await fetch("https://script.google.com/macros/s/AKfycbylKfJQ4kVmg0_t0rRiZO10ff6H2lO1H7euC2ULTvEFppF1QC55J0toQZcI2H3VID7R/exec", {
        method: "POST",
        body: new URLSearchParams(formData),
      });


      // SAVE TO FIREBASE
      try {
        await addDoc(collection(db, "crm-leads"), {
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          service: formData.service,
          mode: formData.mode,
          message: formData.message,
          createdAt: new Date(),
        });

        safeConsoleLog("🔥 Lead saved to Firebase!");
      } catch (error) {
        try { safeConsoleError("❌ Firebase Error:", error); } catch(e) { /* swallow */ }
      }



      const result = await response.json();
      setLoading(false);
      safeConsoleLog(result);

      if (result.status === "success") {
        setSubmitted(true);
        setFormData(prev => ({ ...prev, invoiceNumber: result.invoiceNumber })); // add invoice number
      } else {
        alert("Failed to submit. Please try again.");
      }
    } catch (error) {
      try { console.error("Error submitting form:", error); } catch(e) { /* swallow */ }
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
          className="bg-white rounded-lg w-full max-w-md p-4 md:p-6 relative shadow-xl overflow-hidden max-h-[90vh] overflow-y-auto"
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
              <h2 className="text-xl md:text-2xl font-bold mb-3 md:mb-4 dark:text-black">Request a Quote</h2>
              <form onSubmit={handleSubmit} className="space-y-2.5 md:space-y-4">
                <div>
                  <label className="block font-semibold mb-0.5 md:mb-1 text-sm md:text-base dark:text-black">Name *</label>
                  <input
                    type="text"
                    ref={nameRef}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 md:p-3 border rounded-lg text-sm dark:text-black"
                    placeholder="Enter your name"
                    autoComplete="name"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-0.5 md:mb-1 text-sm md:text-base dark:text-black">Phone *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full p-2 md:p-3 border rounded-lg text-sm dark:text-black"
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-0.5 md:mb-1 text-sm md:text-base dark:text-black">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full p-2 md:p-3 border rounded-lg text-sm dark:text-black"
                    placeholder="Enter your email"
                    autoComplete="email"
                    required
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-0.5 md:mb-1 text-sm md:text-base dark:text-black">Selected Service *</label>
                  <input
                    type="text"
                    value={formData.service}
                    readOnly
                    className="w-full p-2 md:p-3 border rounded-lg bg-gray-100 text-sm dark:text-black"
                    autoComplete="off"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-0.5 md:mb-1 text-sm md:text-base dark:text-black">Select Mode *</label>
                  <select
                    value={formData.mode}
                    onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                    className="w-full p-2 md:p-3 border rounded-lg text-sm dark:text-black"
                    required
                  >
                    <option value="">Choose a service mode...</option>
                    <option value="drive-to-garage">Drive to Garage (Free)</option>
                    <option value="pick-up-service">Pick-up Service (+AED 150.00)</option>
                    <option value="home-service">Home Service (+AED 100.00)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-0.5 md:mb-1 text-sm md:text-base dark:text-black">Message (Optional)</label>
                  <textarea
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full p-2 md:p-3 border rounded-lg text-sm dark:text-black"
                    placeholder="Your message..."
                    autoComplete="on"
                  />
                </div>
                <Button type="submit" className="w-full text-sm md:text-base dark:bg-blue-500 dark:text-white dark:border dark:border-blue-900">
                  {loading ? `Submitting` : 'Submit'}
                  <LoaderIcon className={`ml-2 ${loading ? 'inline-block animate-spin' : 'hidden'}`} />
                </Button>
              </form>
            </>
          ) : (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0 }}
              className="flex flex-col items-center relative justify-center py-10"
            >

              <Check className="h-16 w-16 text-green-500 mb-4 animate-bounce p-3   bg-green-300  rounded-full" />
              <button
                className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
                onClick={onClose}
              >
                <X size={24} />
              </button>
              <h3 className="text-xl font-bold text-gray-900">Form Submitted!</h3>
              <p className="text-gray-700 mt-2 text-center">
                Thank you! We will contact you shortly.
              </p>

              <p className='text-md text-center text-black'>Thank you for choosing <strong>Car Mantra</strong>!</p>
              {/* <Invoice
                data={formData} 
                onClose={() => {
                  setSubmitted(false);
                  setFormData({ name: "", phone: "", service: "", message: "" });
                  onClose();
                }}
              /> */}

              <button className="mt-6 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition">
                WhatsApp us: <a className="text-green-600 font-bold" href="https://wa.me/971562523632?text=Hi%2C%20I%27m%20interested%20in%20Car%20Service!%20Can%20I%20get%20more%20Info%3F(Ref%3AGoogleAd)"
                  target="_blank" rel="noopener noreferrer">+971 56 252 3632</a>
              </button>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
