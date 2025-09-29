'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { MessageCircle, Send } from 'lucide-react';

interface ContactFormProps {
  service?: string;
}

export function ContactForm({ service }: ContactFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    service: service || '',
    message: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle form submission here'
    alert(
      `Form Submitted!\nName: ${formData.name}\n  Email:${formData.email}\n  Phone: ${formData.phone}\nService: ${formData.service} \nMessage: ${formData.message} `
    );
  };

  const handleWhatsApp = () => {
    const message = `Hello, I'm interested in ${service || 'your services'}. My name is ${formData.name}. ${formData.message}`;
    const whatsappUrl = `https://wa.me/1234567890?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <h3 className="text-2xl font-bold text-gray-900 mb-6">Contact Us</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="name" className='text-gray-800'>Name</Label>
          <Input
            id="name"
            className='text-gray-800 bg-white'
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder='John Doe'
            required
          />
        </div>
        <div>
          <Label htmlFor="email" className='text-gray-800'>Email</Label>
          <Input
            id="email"
            className='text-gray-800 bg-white'
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder='john@company.com'
            required
          />
        </div>
        <div>
          <Label htmlFor="phone" className='text-gray-800'>Phone</Label>
          <Input
            id="phone"
            type="tel"
            className='text-gray-800 bg-white'
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder='+1 234 567 890'
            required
          />
        </div>
        {!service && (
          <div>
            <Label htmlFor="service" className='text-gray-800'>Service Interested In</Label>
            {/* <Input
              id="service"
              className='text-gray-800'
              value={formData.service}
              onChange={(e) => setFormData({ ...formData, service: e.target.value })}
              placeholder='e.g., Web Development'
              required
            /> */}

            <select name="" id="" placeholder='select' className='mt-2 w-full p-2 border text-gray-800 border-gray-200 rounded-md' onChange={(e) => setFormData({ ...formData, service: e.target.value })} value={formData.service} required>
              <option value="" className='text-gray-800' disabled>Select a service</option>
              <option value={'car ppf and wrapping'} className='text-gray-800'>Car PPF and Wrapping</option>
              <option value={'residential window tinting'} className='text-gray-800'>Residential Window Tinting</option>
              <option value={'commercial window tinting'} className='text-gray-800'>Commercial Window Tinting</option>
              <option value={'paint protection film'} className='text-gray-800'>Paint Protection Film</option>
              <option value={'automotive window tinting'} className='text-gray-800'>Automotive Window Tinting</option>
              
            </select>
          </div>
        )}
        <div>
          <Label htmlFor="message" className='text-gray-800'>Message</Label>
          <Textarea
            id="message"
            className='text-gray-800 bg-white'
            value={formData.message}
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
      </form>
    </div>
  );
}