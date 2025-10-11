
'use client';

import Image from 'next/image';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { Shield, Star, CheckCircle, Clock, Palette, ArrowRight } from 'lucide-react';
import ModalForm from '@/components/ModalForm';
import { ContactForm } from '@/components/ContactForm';

export default function PPFWrappingPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  const benefits = [
    'Protects against stone chips and scratches',
    'Self-healing technology repairs minor scratches',
    'UV protection prevents paint fading',
    'Maintains vehicle resale value',
    'Easy to clean and maintain',
    'Removable without paint damage'
  ];

  const services = [
    {
      title: 'Elite Wrap – Matte',
      description: 'Complete paint protection film coverage for maximum protection',
      price: 'From AED 7,000',
      warranty: '10 Years Warranty',
      duration: '2-3 days'
    },
    {
      title: 'Elite Wrap – Glossy',
      description: 'Strategic protection for high-impact areas',
      price: 'From AED 6,000',
      warranty: '10 Years Warranty',
      duration: '2-3 days'
    },
    {
      title: 'Basic Wrap – Matte',
      description: 'Transform your vehicle\'s appearance with premium vinyl',
      price: 'From AED 4,000',
      warranty: '5 Years Warranty',
      duration: '2-3 days'
    },
    {
      title: 'Basic Wrap – Glossy',
      description: 'Professional branding and advertising solutions',
      price: 'From AED 3,000',
      warranty: '5 Years Warranty',
      duration: '2-3 days'
    },
    {
      title: 'Standard Color PPF – Matte',
      description: 'Transform your vehicle\'s appearance with premium vinyl',
      price: 'From AED 7,000',
      warranty: '5 Years Warranty',
      duration: '2-3 days'
    },
    {
      title: 'Standard Color PPF – Glossy',
      description: 'Professional branding and advertising solutions',
      price: 'From AED 6,000',
      warranty: '5 Years Warranty',
      duration: '2-3 days'
    }
  ];

  const openModal = (service: string) => {
    setSelectedService(service + " - PPF & Wrapping");
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-900 to-blue-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.pexels.com/photos/3784424/pexels-photo-3784424.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
            alt="PPF Installation"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Shield className="h-16 w-16 text-blue-300" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Paint Protection Film & Wrapping</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Advanced paint protection film and vinyl wrapping services to preserve your vehicle's finish and enhance its appearance with cutting-edge technology.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Ultimate Paint Protection</h2>
              <p className="text-lg text-gray-700 dark:text-white/90 mb-6">
                Our premium paint protection film (PPF) creates an invisible barrier that shields your vehicle's paint from road debris, stone chips, and environmental contaminants while maintaining the original appearance.
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
                  // src="https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                  src="https://wrapsters.ae/wp-content/uploads/2025/01/Paint-Protention-Film-PPF-1.jpg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
                  alt="PPF Application Process"
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
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">Our PPF & Wrapping Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <AnimatedSection key={service.title} delay={index * 100}>
                  <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                    <p className="text-gray-600  mb-4">{service.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center text-blue-600">
                        <Star className="h-4 w-4 mr-1" />
                        <span className="font-semibold">{service.price}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Shield className="h-4 w-4  mr-2" />
                        <span className="text-sm" >{service.warranty}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">{service.duration}</span>
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => openModal(service.title)}>
                      Get Quote
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
      {/* <section className="py-20 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center text-center">
            <h2 className="text-3xl font-bold mb-6">Protect Your Investment Today</h2>
            <p className="text-lg text-blue-100 mb-8">
              Don't wait until damage occurs. Protect your vehicle's paint with our premium PPF solutions and maintain its pristine condition for years to come.
            </p>
          </div>
        </div>
      </section> */}


      {/* CTA Section */}
      <section className="py-20 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold mb-6">Protect Your Investment Today</h2>
              <p className="text-lg text-blue-100 mb-8">
                Don't wait until damage occurs. Protect your vehicle's paint with our premium PPF solutions and maintain its pristine condition for years to come.
              </p>
              <div className="flex items-center space-x-4">
                <Palette className="h-8 w-8 text-blue-300" />
                <span className="text-lg">Custom colors and finishes available</span>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <ContactForm service="PPF & Wrapping" />
            </AnimatedSection>
          </div>
        </div>
      </section>


      {/* Modal Form */}
      {isModalOpen && (
        <ModalForm
          selectedService={selectedService}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
