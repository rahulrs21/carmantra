'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ContactForm } from '@/components/ContactForm';
import { Car, Sparkles, CheckCircle, Star, Clock, ArrowRight, Zap, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import ModalForm from '@/components/ModalForm';
import { useServiceData } from '@/lib/hooks/useServiceData';

export default function CarPolishingPage() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const { category, products, loading, error } = useServiceData('car-polishing');

  const closeModal = () => setIsModalOpen(false);

  const process = [
    {
      step: '1',
      title: 'Inspection & Assessment',
      description: 'Detailed paint analysis using specialized lighting'
    },
    {
      step: '2',
      title: 'Washing & Decontamination',
      description: 'Thorough cleaning and clay bar treatment'
    },
    {
      step: '3',
      title: 'Paint Correction',
      description: 'Multi-stage polishing with premium compounds'
    },
    {
      step: '4',
      title: 'Final Polish & Protection',
      description: 'Fine polishing and protective wax application'
    }
  ];

  return (
    <div className="min-h-screen ">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-amber-600 via-orange-600 to-red-600 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.pexels.com/photos/5835359/pexels-photo-5835359.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
            alt="Car Polishing"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Car className="h-16 w-16 text-amber-200" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Professional Car Polishing</h1>
            <p className="text-xl text-amber-100 max-w-3xl mx-auto">
              Expert paint correction and polishing services to restore your vehicle's original luster and remove years of wear and damage.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Polishing Services</h2>
            <p className="text-lg text-gray-600 dark:text-white/80">Professional paint correction solutions for every need</p>
          </AnimatedSection>

          {loading && (
            <div className="flex justify-center items-center py-12">
              <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            </div>
          )}

          {error && (
            <Card className="p-6 mb-8 bg-red-50 border-red-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{error}</p>
              </div>
            </Card>
          )}

          {!loading && products.length === 0 && !error && (
            <Card className="p-6 text-center bg-yellow-50 border-yellow-200">
              <p className="text-yellow-800">No services available at the moment</p>
            </Card>
          )}

          {!loading && products.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {products.map((product, index) => (
                <AnimatedSection key={product.id} delay={index * 100}>
                  <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{product.name}</h3>
                    <p className="text-gray-600 mb-4">{product.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center text-amber-600">
                        <Star className="h-4 w-4 mr-1" />
                        <span className="font-semibold">From AED {product.price?.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">{product.duration}</span>
                      </div>
                    </div>
                    <Button className="w-full bg-amber-600 hover:bg-amber-700"
                      onClick={() => {
                        setSelectedService(`(${product.name}) - Car Polishing`);
                        setIsModalOpen(true);
                      }}>
                      Book Service
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Why Professional Polishing Matters</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Restore Original Shine</h3>
                    <p className="text-gray-600">Remove oxidation, swirl marks, and minor scratches to reveal your paint's true beauty.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Zap className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Increase Resale Value</h3>
                    <p className="text-gray-600">Well-maintained paint significantly improves your vehicle's market value.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Car className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">Long-lasting Results</h3>
                    <p className="text-gray-600">Professional polishing provides durable results that last months longer than DIY methods.</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="/images/carPolishing.jpg"
                  alt="Before and After Polishing"
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                  Before & After Results
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Professional Process</h2>
            <p className="text-lg text-gray-600 dark:text-white/80">Systematic approach for perfect results</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {process.map((step, index) => (
              <AnimatedSection key={step.step} delay={index * 100}>
                <div className="text-center bg-white rounded-lg p-6 shadow-md border border-gray-100">
                  <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    {step.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-600 text-sm">{step.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-amber-600 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold mb-6">Ready to Restore Your Car's Shine?</h2>
              <p className="text-lg text-amber-100 mb-8">
                Don't let scratches and swirl marks diminish your vehicle's beauty. Our expert polishing services will restore that showroom shine and protect your investment.
              </p>
              <div className="flex items-center space-x-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-300 mr-2" />
                  <span>Free Paint Assessment</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-300 mr-2" />
                  <span>Satisfaction Guarantee</span>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <ContactForm service="Car Polishing" />
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