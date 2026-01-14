'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ShieldCheck, Clock, FileText, ArrowRight, CheckCircle } from 'lucide-react';
import ModalForm from '@/components/ModalForm';
import { ContactForm } from '@/components/ContactForm';

export default function CarInsurancePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  const benefits = [
    'Instant car insurance quotes with top UAE providers',
    'Comprehensive and third-party coverage available',
    'Fast policy issuance within minutes',
    'Easy renewal and claim assistance',
    '24/7 customer support and guidance',
  ];

  const services = [
    {
      title: 'Comprehensive Insurance',
      description: 'Full coverage for your car, including damage, theft, and third-party liability.',
      price: 'From AED 800',
      warranty: 'Premium Coverage',
      duration: '1 Year Policy',
    },
    {
      title: 'Third-Party Insurance',
      description: 'Covers liability for damage or injury caused to others in an accident.',
      price: 'From AED 450',
      warranty: 'Legal Liability Coverage',
      duration: '1 Year Policy',
    },
    {
      title: 'Premium Plus Plan',
      description: 'Includes agency repair, roadside assistance, and extended protection.',
      price: 'From AED 1,200',
      warranty: 'Full Premium Benefits',
      duration: '1 Year Policy',
    },
  ];

  const openModal = (service: string) => {
    setSelectedService(`(${service}) - Car Insurance`);
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative py-20 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="/images/carppf.jpeg"
            alt="Car Insurance"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 text-center">
          <AnimatedSection>
            <div className="flex items-center justify-center mb-6">
              <ShieldCheck className="h-16 w-16 text-yellow-400" />
            </div>
            <h1 className="text-5xl font-bold mb-6 text-yellow-300">Car Insurance</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Protect your vehicle and drive with peace of mind — get your car insured instantly with trusted providers in the UAE.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main */}
      <section className="py-20 bg-gradient-to-b from-white to-blue-50 dark:from-gray-900 dark:to-blue-950">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-blue-900 dark:text-yellow-300 mb-6">
                Reliable Car Insurance Coverage
              </h2>
              <p className="text-lg text-gray-700 dark:text-white/90 mb-6">
                Get complete protection for your car with our wide range of insurance plans. Whether you need comprehensive coverage or basic third-party insurance, we’ve got you covered.
              </p>
              <div className="space-y-3">
                {benefits.map((b, i) => (
                  <div key={i} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-yellow-400" />
                    <span className="text-gray-700 dark:text-white/90">{b}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="/images/carInsurance.jpg"
                  alt="Car Insurance UAE"
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-blue-900/30 to-transparent rounded-lg"></div>
              </div>
            </AnimatedSection>
          </div>

          {/* Services */}
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-center mb-12 text-blue-900 dark:text-yellow-300">
              Car Insurance Packages
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((s, i) => (
                <AnimatedSection key={s.title} delay={i * 100}>
                  <div className="bg-white dark:bg-blue-950 rounded-lg shadow-lg p-6 border border-yellow-300/40 hover:shadow-xl transition-all duration-300">
                    <h3 className="text-xl font-bold text-blue-900 dark:text-yellow-300 mb-3">{s.title}</h3>
                    <p className="text-gray-600 dark:text-gray-300 mb-4">{s.description}</p>
                    <div className="space-y-2 mb-6">
                      <div className="flex justify-between items-center">
                        <span className="text-2xl font-bold text-yellow-500">{s.price}</span>
                        <div className="flex items-center text-gray-500 dark:text-gray-400 text-sm">
                          <Clock className="h-4 w-4 mr-1" />
                          {s.duration}
                        </div>
                      </div>
                      <div className="flex items-center text-yellow-400 text-sm">
                        <FileText className="h-4 w-4 mr-1" />
                        {s.warranty}
                      </div>
                    </div>
                    <Button className="w-full bg-yellow-500 hover:bg-yellow-600 text-blue-900 font-semibold" onClick={() => openModal(s.title)}>
                      Get Insurance Quote
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
      <section className="py-20 bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 text-white">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <AnimatedSection>
            <h2 className="text-3xl font-bold mb-6 text-yellow-300">Drive Confidently with Trusted Coverage</h2>
            <p className="text-lg text-blue-100 mb-8">
              Get the best car insurance deals, transparent pricing, and expert support — all in one place. Drive worry-free with complete protection.
            </p>
          </AnimatedSection>
          <AnimatedSection delay={200}>
            <ContactForm service="Car Insurance" />
          </AnimatedSection>
        </div>
      </section>

      {isModalOpen && <ModalForm selectedService={selectedService} onClose={closeModal} />}
    </div>
  );
}
