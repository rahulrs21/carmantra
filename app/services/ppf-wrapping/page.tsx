'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ContactForm } from '@/components/ContactForm';
import { Shield, Star, CheckCircle, Clock, Palette, ArrowRight } from 'lucide-react';

export default function PPFWrappingPage() {
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
      title: 'Full Vehicle PPF',
      description: 'Complete paint protection film coverage for maximum protection',
      price: 'From $2,500',
      duration: '2-3 days'
    },
    {
      title: 'Partial PPF Coverage',
      description: 'Strategic protection for high-impact areas',
      price: 'From $800',
      duration: '1 day'
    },
    {
      title: 'Color Change Wrap',
      description: 'Transform your vehicle\'s appearance with premium vinyl',
      price: 'From $3,200',
      duration: '3-4 days'
    },
    {
      title: 'Commercial Vehicle Wrapping',
      description: 'Professional branding and advertising solutions',
      price: 'From $1,500',
      duration: '2-3 days'
    }
  ];

  return (
    <div className="min-h-screen pt-16">
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
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Ultimate Paint Protection</h2>
              <p className="text-lg text-gray-700 mb-6">
                Our premium paint protection film (PPF) creates an invisible barrier that shields your vehicle's paint from road debris, stone chips, and environmental contaminants while maintaining the original appearance.
              </p>
              <div className="space-y-3">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                    <span className="text-gray-700">{benefit}</span>
                  </div>
                ))}
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=800&h=600&fit=crop"
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
            <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">Our PPF & Wrapping Services</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {services.map((service, index) => (
                <AnimatedSection key={service.title} delay={index * 100}>
                  <div className="bg-white rounded-lg shadow-lg p-6 border border-gray-200 hover:shadow-xl transition-shadow duration-300">
                    <h3 className="text-xl font-bold text-gray-900 mb-3">{service.title}</h3>
                    <p className="text-gray-600 mb-4">{service.description}</p>
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center text-blue-600">
                        <Star className="h-4 w-4 mr-1" />
                        <span className="font-semibold">{service.price}</span>
                      </div>
                      <div className="flex items-center text-gray-500">
                        <Clock className="h-4 w-4 mr-1" />
                        <span className="text-sm">{service.duration}</span>
                      </div>
                    </div>
                    <Button className="w-full">
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

      {/* Process Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Professional Process</h2>
            <p className="text-lg text-gray-600">Meticulous attention to detail in every step</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {[
              {
                step: '1',
                title: 'Consultation & Assessment',
                description: 'Detailed vehicle inspection and service recommendation'
              },
              {
                step: '2',
                title: 'Surface Preparation',
                description: 'Thorough cleaning and paint correction if needed'
              },
              {
                step: '3',
                title: 'Precision Installation',
                description: 'Expert application using specialized tools and techniques'
              },
              {
                step: '4',
                title: 'Quality Inspection',
                description: 'Final quality check and customer walkthrough'
              }
            ].map((process, index) => (
              <AnimatedSection key={process.step} delay={index * 100}>
                <div className="text-center">
                  <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
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
    </div>
  );
}