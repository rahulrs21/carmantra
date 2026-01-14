'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ContactForm } from '@/components/ContactForm';
import { Sparkles, Droplets, Sun, Shield, CheckCircle, Star, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import ModalForm from '@/components/ModalForm';
import { useState } from 'react';
import { useServiceData } from '@/lib/hooks/useServiceData';

export default function CeramicCoatingPage() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const { category, products, loading, error } = useServiceData('ceramic-coating');

  const closeModal = () => setIsModalOpen(false);

  const benefits = [
    'Ultra-hydrophobic surface repels water and dirt',
    'UV protection prevents paint oxidation',
    'Enhanced gloss and depth of paint',
    'Easier maintenance and cleaning',
    'Chemical resistance to environmental contaminants',
    'Long-lasting protection (2-5 years)'
  ];

  return (
    <div className="min-h-screen pt-0">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-900 to-purple-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
            alt="Ceramic Coating Application"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Sparkles className="h-16 w-16 text-blue-300" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Ceramic Coating & Protection</h1>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto">
              Revolutionary ceramic coating technology that provides superior protection and an incredible shine that lasts for years.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Advanced Ceramic Protection</h2>
              <p className="text-lg text-gray-700 dark:text-white/80 mb-6">
                Our ceramic coating creates a permanent bond with your vehicle's paint, forming a protective layer that's harder than steel and provides unmatched durability and shine.
              </p>
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Droplets className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">Hydrophobic</h3>
                  <p className="text-sm text-gray-600">Water beads and rolls off</p>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <Sun className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                  <h3 className="font-semibold text-gray-900">UV Protection</h3>
                  <p className="text-sm text-gray-600">Prevents paint fading</p>
                </div>
              </div>
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700 dark:text-white/80">{benefit}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="/images/CarCeramicCoat.jpg"
                  alt="Ceramic Coating Process"
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-lg"></div>
              </div>
            </AnimatedSection>
          </div>

          {/* Packages Section */}
          <AnimatedSection>
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white text-center mb-12">Ceramic Coating Packages</h2>
            
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {products.map((product, index) => (
                  <AnimatedSection key={product.id} delay={index * 100}>
                    <div className="bg-white rounded-lg shadow-lg p-6 border-2 hover:shadow-xl transition-shadow duration-300 border-gray-200">
                      <h3 className="text-xl font-bold text-gray-900 mb-3">{product.name}</h3>
                      <p className="text-gray-600  mb-4">{product.description}</p>
                      <div className="space-y-2 mb-6">
                        <div className="flex justify-between items-center">
                          <span className="text-2xl font-bold text-blue-600">From AED {product.price?.toLocaleString()}</span>
                          <div className="flex items-center text-gray-500  text-sm">
                            <Clock className="h-4 w-4 mr-1" />
                            {product.duration}
                          </div>
                        </div>
                        <div className="flex items-center text-green-600 text-sm">
                          <Shield className="h-4 w-4 mr-1" />
                          {product.warranty}
                        </div>
                      </div>
                      <Button className="w-full" onClick={() => {
                        setSelectedService(`(${product.name}) - Ceramic Coating`);
                        setIsModalOpen(true);
                      }}>
                        Get Quote
                        <ArrowRight size={16} className="ml-2" />
                      </Button>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            )}
          </AnimatedSection>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Ceramic Coating Process</h2>
            <p className="text-lg text-gray-600">Precision application for maximum protection</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Paint Inspection',
                description: 'Thorough assessment of paint condition and defects'
              },
              {
                step: '2',
                title: 'Paint Correction',
                description: 'Remove swirl marks, scratches, and imperfections'
              },
              {
                step: '3',
                title: 'Surface Preparation',
                description: 'Deep cleaning and decontamination process'
              },
              {
                step: '4',
                title: 'Ceramic Application',
                description: 'Professional coating application and curing'
              }
            ].map((process, index) => (
              <AnimatedSection key={process.step} delay={index * 100}>
                <div className="text-center bg-white rounded-lg p-6 shadow-md">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                    {process.step}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{process.title}</h3>
                  <p className="text-gray-600 text-sm">{process.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-purple-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold mb-6">Experience the Ceramic Coating Difference</h2>
              <p className="text-lg text-blue-100 mb-8">
                Transform your vehicle with our premium ceramic coating. Enjoy years of protection, easier maintenance, and an incredible shine that will make your car look showroom new.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <Star className="h-4 w-4 text-yellow-400 mr-2" />
                  <span>9H Hardness Rating</span>
                </div>
                <div className="flex items-center">
                  <Sparkles className="h-4 w-4 text-blue-300 mr-2" />
                  <span>Mirror-like Finish</span>
                </div>
                <div className="flex items-center">
                  <Shield className="h-4 w-4 text-green-400 mr-2" />
                  <span>Up to 5 Year Warranty</span>
                </div>
                <div className="flex items-center">
                  <Droplets className="h-4 w-4 text-blue-300 mr-2" />
                  <span>Self-Cleaning Effect</span>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <ContactForm service="Ceramic Coating" />
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