'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { FileCheck, Clock, Shield, ArrowRight, CheckCircle } from 'lucide-react';
import ModalForm from '@/components/ModalForm';
import { ContactForm } from '@/components/ContactForm';

export default function CarPassingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  const benefits = [
    'Fast and hassle-free car passing process',
    'Expert team to handle all RTA inspection requirements',
    'Complete pre-check to ensure guaranteed passing',
    'Pickup & drop-off service available',
    'Transparent pricing and full documentation support',
  ];

  const services = [
    {
      title: 'Standard Car Passing',
      description: 'Includes basic inspection and documentation check.',
      price: 'From AED 250',
      warranty: 'Same Day Completion',
      duration: '2-3 hours',
    },
    {
      title: 'Comprehensive Passing',
      description: 'Includes full pre-passing inspection and guaranteed approval.',
      price: 'From AED 400',
      warranty: 'Guaranteed Approval',
      duration: '3-4 hours',
    },
    {
      title: 'Pickup & Passing Service',
      description: 'We collect your car, complete inspection & deliver it back.',
      price: 'From AED 500',
      warranty: 'Doorstep Service',
      duration: 'Same Day',
    },
  ];

  const openModal = (service: string) => {
    setSelectedService(service + ' - Car Passing');
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-br from-slate-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/carppf.jpeg"
            alt="Car Passing Services"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <AnimatedSection>
            <div className="flex items-center justify-center mb-6">
              <FileCheck className="h-16 w-16 text-blue-300" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Car Passing Services</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Quick, reliable, and professional car passing and inspection assistance across the UAE.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main */}
      <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
                Hassle-Free Car Passing Service
              </h2>
              <p className="text-lg text-gray-700 dark:text-white/90 mb-6">
                Let our experts handle your car passing process efficiently. We ensure your car meets all RTA standards with guaranteed approval.
              </p>
              <div className="space-y-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-blue-500" />
                    <span className="text-gray-700 dark:text-white/90">{b}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="/images/carPassing.jpg"
                  alt="Car Passing Inspection"
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
              </div>
            </AnimatedSection>
          </div>

          {/* Services */}
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              Car Passing Packages
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((s, i) => (
                <AnimatedSection key={s.title} delay={i * 100}>
                  <div className="bg-white rounded-lg shadow-lg p-6 border border-blue-100 hover:shadow-xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{s.title}</h3>
                    <p className="text-gray-600 mb-4">{s.description}</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-blue-600">{s.price}</span>
                        <div className="flex items-center text-gray-500 text-sm">
                          <Clock className="h-4 w-4 mr-1" />
                          {s.duration}
                        </div>
                      </div>
                      <div className="flex items-center text-blue-600 text-sm">
                        <Shield className="h-4 w-4 mr-1" />
                        {s.warranty}
                      </div>
                    </div>
                    <Button className="w-full bg-blue-700 hover:bg-blue-800" onClick={() => openModal(s.title)}>
                      Book Car Passing
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
      <section className="py-20 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <AnimatedSection>
            <h2 className="text-3xl font-bold mb-6">Your Car, Ready to Pass</h2>
            <p className="text-lg text-blue-100 mb-8">
              Skip the stress of RTA queues and let us handle your car passing process with full confidence and efficiency.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <ContactForm service="Car Passing" />
          </AnimatedSection>
        </div>
      </section>

      {isModalOpen && <ModalForm selectedService={selectedService} onClose={closeModal} />}
    </div>
  );
}
