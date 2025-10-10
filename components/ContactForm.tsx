
'use client';

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Check, LoaderIcon, MessageCircle, Send, X } from 'lucide-react'; 
import { motion, AnimatePresence } from 'framer-motion';




interface ContactFormProps {
  service?: string;
  onClose?: () => void; // optional now
}



export function ContactForm({ service }: ContactFormProps) {

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
    service: service || '', // fallback// keeps prop value if exists, undefined otherwise
    message: '',
  });


  // const handleSubmit = async (e: React.FormEvent) => {
  //   e.preventDefault();
  //   setLoading(true);

  //   try {

  //     const res = await sendEmail(formData);

  //     if (res.success) {
  //       setSubmitted(true); // show success message


  //       setFormData({
  //         name: '',
  //         email: '',
  //         phone: '',
  //         service: service || '', // fallback, // keep prop value; undefined if not passed
  //         message: '',
  //       });
  //     } else {
  //       alert('❌ Something went wrong. Please try again later.');
  //     }

  //     await new Promise((resolve) => setTimeout(resolve, 1500)); // simulate delay

  //     setSubmitted(true); // show success message
  //   } catch (error) {
  //     console.error(error);
  //     alert('Something went wrong. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }

  // };

  // Close success message and reset form for new submission

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      }).then(r => r.json());

      if (res.success) {
        setSubmitted(true);
        setFormData({
          name: '',
          email: '',
          phone: '',
          service: service || '',
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
      service: service, // keep prop value; undefined if not passed
      message: '',
    });
  };

  const handleWhatsApp = () => {
    const message = `Hello, I'm interested in ${service || 'your services'}. My name is ${formData.name}. ${formData.message}`;
    const whatsappUrl = `https://wa.me/1234567890?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h3>


      {/* <form onSubmit={handleSubmit} className="space-y-4">
         
        <div>
          <Label htmlFor="name" className="text-gray-800">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="John Doe"
            required
          />
        </div>

         
        <div>
          <Label htmlFor="email" className="text-gray-800">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="john@company.com"
            required
          />
        </div>
 
        <div>
          <Label htmlFor="phone" className="text-gray-800">Phone</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="+1 234 567 890"
            required
          />
        </div>
 
        {!service && (
          <div>
            <Label htmlFor="service" className="text-gray-800">Service Interested In</Label>
            <select
              className="mt-2 w-full p-2 border text-gray-800 border-gray-200 rounded-md"
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              value={formData.service}
              required
            >
              <option value="" disabled>Select a service</option>
              <option value="Car PPF and Wrapping">Car PPF and Wrapping</option>
              <option value="Residential Window Tinting">Residential Window Tinting</option>
              <option value="Commercial Window Tinting">Commercial Window Tinting</option>
              <option value="Paint Protection Film">Paint Protection Film</option>
              <option value="Automotive Window Tinting">Automotive Window Tinting</option>
            </select>
          </div>
        )}
 
        <div className=''>
          <Label htmlFor="message" className="text-gray-800">Message</Label>
          <Textarea
            id="message"
            value={formData.message}
            className='text-black dark:bg-black dark:text-white'
            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
            rows={4}
          />
        </div>
 
        <div className="flex space-x-4">
          <Button type="submit" className="flex-1">
            <Send size={16} className="mr-2" />
            Submit Quote
          </Button>
          <Button
            type="button"
            onClick={handleWhatsApp}
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            <MessageCircle size={16} className="mr-2" />
            WhatsApp
          </Button>
        </div>
      </form> */}

      {!submitted ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name */}
          <div>
            <label className="block font-semibold mb-1 dark:text-black text-black ">Name *</label>
            <input
              type="text"
              ref={nameRef}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border rounded-lg dark:text-black text-black"
              placeholder="Enter your name"
              autoComplete="name"   // ✅ enables browser autofill
              required
            />
          </div>

          {/* Phone */}
          <div>
            <label className="block font-semibold mb-1 dark:text-black text-black">Phone *</label>
            <input
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-3 border rounded-lg dark:text-black text-black"
              placeholder="Enter your phone number"
              autoComplete="tel"   // ✅ enables browser autofill
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block font-semibold mb-1 dark:text-black text-black">Email *</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full p-3 border rounded-lg dark:text-black text-black"
              placeholder="Enter your email"
              autoComplete="email"   // ✅ enables browser autofill
              required
            />
          </div>

          {/* Service */}
          <div>
            <label className="block font-semibold mb-1 dark:text-black text-black">
              Selected Service *
            </label>

            {service ? (
              // Read-only input if service prop is provided
              <input
                type="text"
                value={formData.service}
                readOnly
                className="w-full p-3 border rounded-lg bg-gray-100 dark:text-black text-black"
                autoComplete="off" // turn off autofill since it's read-only
                required
              />
            ) : (
              // Select dropdown if no service prop
              <select
                className="mt-2 w-full p-3 border text-gray-800 border-gray-200 rounded-lg"
                onChange={(e) =>
                  setFormData({ ...formData, service: e.target.value })
                }
                value={formData.service || ''}
                required
              >
                <option value="" disabled>
                  Select a service
                </option>
                <option value="Car PPF and Wrapping">Car PPF and Wrapping</option>
                <option value="Residential Window Tinting">
                  Residential Window Tinting
                </option>
                <option value="Commercial Window Tinting">
                  Commercial Window Tinting
                </option>
                <option value="Paint Protection Film">Paint Protection Film</option>
                <option value="Automotive Window Tinting">
                  Automotive Window Tinting
                </option>
              </select>
            )}
          </div>









          {/* Message */}
          <div>
            <label className="block font-semibold mb-1 dark:text-black text-black">Message (Optional)</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="w-full p-3 border rounded-lg dark:text-black text-gray-800"
              placeholder="Your message..."
              autoComplete="on"   // ✅ allows general suggestions
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
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0 }}
          className="flex flex-col items-center relative justify-center py-10"
        >
          <Check className="h-16 w-16 text-green-500 mb-4 animate-bounce p-3 bg-green-300 rounded-full" />
          <button
            className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
            onClick={handleCloseSuccess} // ← close button resets form
          >
            <X size={24} />
          </button>
          <h3 className="text-xl font-bold text-gray-900">Form Submitted!</h3>
          <p className="text-gray-700 mt-2 text-center">
            Thank you! We will contact you shortly.
          </p>
          <p className="text-md text-center text-black">
            Thank you for choosing <strong>Car Mantra</strong>!
          </p>

          <button className="mt-6 px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition">
            WhatsApp us:{' '}
            <a
              className="text-green-600 font-bold"
              href="https://wa.me/+971503324868"
              target="_blank"
              rel="noopener noreferrer"
            >
              +971 50 332 4868
            </a>
          </button>
        </motion.div>
      )}




    </div>
  );
}
