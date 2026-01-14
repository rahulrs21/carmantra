'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ContactForm } from '@/components/ContactForm';
import { Palette, Sun, Shield, Eye, CheckCircle, Star, Clock, ArrowRight, Thermometer, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import ModalForm from '@/components/ModalForm';
import { useServiceData } from '@/lib/hooks/useServiceData';

export default function CarTintingPage() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');
  const { category, products, loading, error } = useServiceData('car-tinting');

  const closeModal = () => setIsModalOpen(false);

  const benefits = [
    { icon: Sun, title: 'UV Protection', description: 'Blocks up to 99% of harmful UV rays' },
    { icon: Thermometer, title: 'Heat Reduction', description: 'Reduces interior temperature by up to 60°F' },
    { icon: Eye, title: 'Glare Reduction', description: 'Reduces eye strain and improves visibility' },
    { icon: Shield, title: 'Privacy & Security', description: 'Enhanced privacy and security for you and your belongings' }
  ];

  return (
    <div className="min-h-screen pt-0">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-800 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
            alt="Car Window Tinting"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Palette className="h-16 w-16 text-purple-300" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Professional Car Window Tinting</h1>
            <p className="text-xl text-purple-100 max-w-3xl mx-auto">
              Premium window tinting services for enhanced comfort, privacy, and style. Choose from our range of high-quality films with lifetime warranties.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Why Choose Window Tinting?</h2>
            <p className="text-lg text-gray-600 dark:text-white/80">Experience the comfort and protection of professional window tinting</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <AnimatedSection key={benefit.title} delay={index * 100}>
                <div className="text-center bg-white rounded-lg p-6 shadow-lg border border-gray-100">
                  <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <benefit.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                  <p className="text-gray-600 text-sm">{benefit.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Tint Options Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Tint</h2>
            <p className="text-lg text-gray-600">Professional-grade window films for every need and budget</p>
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
                  <div className="bg-white rounded-lg shadow-lg p-6 border-2 hover:shadow-xl transition-shadow duration-300 border-gray-200">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{product.name}</h3>
                    <p className="text-gray-600 mb-4">{product.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-2xl font-bold text-purple-600">From AED {product.price?.toLocaleString()}</span>
                      <div className="flex items-center text-gray-500 text-sm">
                        <Clock className="h-4 w-4 mr-1" />
                        {product.duration}
                      </div>
                    </div>
                    <Button className="w-full bg-purple-600 hover:bg-purple-700" onClick={() => {
                      setSelectedService(`(${product.name}) - Car Tinting`);
                      setIsModalOpen(true);
                    }}>
                      Select This Option
                      <ArrowRight size={16} className="ml-2" />
                    </Button>
                  </div>
                </AnimatedSection>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Installation Process */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Professional Installation Process</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white/90 mb-2">Window Preparation</h3>
                    <p className="text-gray-600 dark:text-white/80">Thorough cleaning and preparation of all window surfaces.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white/90 mb-2">Precise Cutting</h3>
                    <p className="text-gray-600 dark:text-white/80">Computer-cut templates ensure perfect fit for your vehicle.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white/90 mb-2">Expert Installation</h3>
                    <p className="text-gray-600 dark:text-white/80">Bubble-free application by certified professionals.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white/90 mb-2">Quality Inspection</h3>
                    <p className="text-gray-600 dark:text-white/80">Final inspection and customer walkthrough.</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Allow 3-5 days for complete curing. Avoid rolling down windows during this period.
                </p>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="/images/carTint.jpg"
                  alt="Window Tinting Installation"
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-lg">
                  <div className="text-xs font-semibold text-gray-900">Professional Installation</div>
                  <div className="text-xs text-gray-600">Lifetime Warranty</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Legal Information */}
      <section className="py-12 bg-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection>
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Legal Tint Levels by State</h3>
              <p className="text-sm text-gray-600 mb-4">
                We ensure all installations comply with local and state regulations. Here are some common legal limits:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <h4 className="font-semibold text-gray-900">Front Side Windows</h4>
                  <p className="text-gray-600">Usually 70% VLT minimum</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Rear Side Windows</h4>
                  <p className="text-gray-600">Varies by state (20-70% VLT)</p>
                </div>
                <div>
                  <h4 className="font-semibold text-gray-900">Rear Window</h4>
                  <p className="text-gray-600">Varies by state (5-70% VLT)</p>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-purple-900 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold mb-6">Transform Your Drive Today</h2>
              <p className="text-lg text-purple-100 mb-8">
                Experience the comfort, style, and protection of professional window tinting. Beat the heat, reduce glare, and enhance your privacy with our premium tint solutions.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-300 mr-2" />
                  <span>Lifetime Warranty</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-300 mr-2" />
                  <span>Professional Installation</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-300 mr-2" />
                  <span>Legal Compliance</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-300 mr-2" />
                  <span>Same Day Service</span>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <ContactForm service="Car Tinting" />
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