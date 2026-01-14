'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { SearchCheck, Clock, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import ModalForm from '@/components/ModalForm';
import { ContactForm } from '@/components/ContactForm';

export default function PrePurchaseInspectionPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  const benefits = [
    'Comprehensive mechanical & electrical inspection',
    'Accident & chassis check for hidden damage',
    'Full computer diagnostics with detailed report',
    'Professional test drive evaluation',
    'Verified inspection by expert technicians',
  ];

  const services = [
    {
      title: 'Standard Inspection',
      description: 'Covers all essential mechanical and electrical checks.',
      price: 'From AED 250',
      warranty: 'Certified Report',
      duration: '1-2 hours',
    },
    {
      title: 'Comprehensive Inspection',
      description: 'Includes full diagnostics, paint, chassis, and road test.',
      price: 'From AED 400',
      warranty: 'Detailed Report',
      duration: '2-3 hours',
    },
    {
      title: 'Premium Inspection',
      description: 'Full vehicle evaluation including hidden damage detection.',
      price: 'From AED 600',
      warranty: 'Expert Verified',
      duration: '3-4 hours',
    },
  ];

  const openModal = (service: string) => {
    setSelectedService(`(${service}) - Pre-Purchase Inspection`);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-emerald-900 to-teal-700 text-white">
        <div className="absolute inset-0 opacity-25">
          <Image
            src="/images/carppf.jpeg"
            alt="Pre Purchase Inspection"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <AnimatedSection>
            <div className="flex items-center justify-center mb-6">
              <SearchCheck className="h-16 w-16 text-teal-300" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Pre Purchase Inspection</h1>
            <p className="text-xl text-teal-100 max-w-3xl mx-auto">
              Get peace of mind before buying your next car — full inspection, professional reports, and expert evaluation.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Section */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Drive Smart — Inspect Before You Buy
              </h2>
              <p className="text-lg text-gray-700 dark:text-white/90 mb-6">
                Our Pre Purchase Inspection service ensures that your next car is in excellent condition with full transparency before you make the deal.
              </p>
              <div className="space-y-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-emerald-500" />
                    <span className="text-gray-700 dark:text-white/90">{b}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="/images/carInspection.jpg"
                  alt="Car Inspection"
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
              </div>
            </AnimatedSection>
          </div>

          {/* Service Cards */}
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              Inspection Packages
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((s, i) => (
                <AnimatedSection key={s.title} delay={i * 100}>
                  <div className="bg-white rounded-lg shadow-lg p-6 border border-teal-100 hover:shadow-xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                    <p className="text-gray-600 mb-4">{s.description}</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-emerald-600">{s.price}</span>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Clock className="h-4 w-4 mr-1" />
                          {s.duration}
                        </div>
                      </div>
                      <div className="flex items-center text-teal-600 text-sm">
                        <Shield className="h-4 w-4 mr-1" />
                        {s.warranty}
                      </div>
                    </div>
                    <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => openModal(s.title)}>
                      Book Inspection
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-emerald-900 text-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <AnimatedSection>
            <h2 className="text-3xl font-bold mb-6">Inspect Before You Invest</h2>
            <p className="text-lg text-teal-100 mb-8">
              A professional inspection today can save you thousands tomorrow. Book your Pre Purchase Inspection and buy with confidence.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <ContactForm service="Pre Purchase Inspection" />
          </AnimatedSection>
        </div>
      </section>

      {isModalOpen && <ModalForm selectedService={selectedService} onClose={closeModal} />}
    </div>
  );
}
