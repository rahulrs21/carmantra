// import React from 'react'

// function InstantHelp() {
//   return (
//     <div className='min-h-screen pt-0'>InstantHelp</div>
//   )
// }

// export default InstantHelp



'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { HelpCircle, Clock, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import ModalForm from '@/components/ModalForm';
import { ContactForm } from '@/components/ContactForm';

export default function InstantHelpPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  const benefits = [
    'Quick response for all automotive services',
    '24/7 availability for urgent needs',
    'Expert technicians ready to assist instantly',
    'Reliable and transparent pricing',
    'Support for all car makes and models',
  ];

  const services = [
    {
      title: 'Emergency Car Support',
      description: 'On-the-spot help for flat tires, battery jump, or breakdowns.',
      price: 'From AED 150',
      warranty: 'Instant Assistance',
      duration: 'Within 1 hour',
    },
    {
      title: 'Quick Maintenance Check',
      description: 'Fast service inspection for vehicles needing urgent care.',
      price: 'From AED 200',
      warranty: 'Same-day Service',
      duration: '1-2 hours',
    },
    {
      title: 'Roadside Assistance',
      description: '24/7 roadside help anywhere across the UAE.',
      price: 'From AED 250',
      warranty: 'Certified Technicians',
      duration: 'Instant dispatch',
    },
    {
      title: 'On-Demand Mechanic',
      description: 'Professional mechanic at your location for emergency help.',
      price: 'From AED 300',
      warranty: 'Trusted Service',
      duration: '1 hour arrival time',
    },
  ];

  const openModal = (service: string) => {
    setSelectedService(`(${service}) - Instant Help`);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/carppf.jpeg"
            alt="Instant Help Services"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            <div className="flex items-center justify-center mb-6">
              <HelpCircle className="h-16 w-16 text-blue-300" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Instant Help Services</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Fast, reliable, and professional automotive assistance available anytime — anywhere in the UAE.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Always There When You Need Us
              </h2>
              <p className="text-lg text-gray-700 dark:text-white/90 mb-6">
                Our Instant Help service ensures that you’re never stranded. Whether it’s a breakdown, battery issue, or
                urgent maintenance, our experts are just a call away.
              </p>
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-white/90">{benefit}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="/images/carInstantHelp.jpg"
                  alt="Instant Car Assistance"
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
              </div>
            </AnimatedSection>
          </div>

          {/* Services Grid */}
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">
              Our Instant Help Services
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <AnimatedSection key={service.title} delay={index * 100}>
                  <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-blue-600">{service.price}</span>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Clock className="h-4 w-4 mr-1" />
                          {service.duration}
                        </div>
                      </div>
                      <div className="flex items-center text-green-600 text-sm">
                        <Shield className="h-4 w-4 mr-1" />
                        {service.warranty}
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => openModal(service.title)}>
                      Get Instant Help
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <AnimatedSection>
            <h2 className="text-3xl font-bold mb-6">Need Help Right Now?</h2>
            <p className="text-lg text-blue-100 mb-8">
              Our team is on standby to assist you — anytime, anywhere. Get back on the road safely with our trusted Instant Help service.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <ContactForm service="Instant Help" />
          </AnimatedSection>
        </div>
      </section>

      {/* Modal */}
      {isModalOpen && <ModalForm selectedService={selectedService} onClose={closeModal} />}
    </div>
  );
}
