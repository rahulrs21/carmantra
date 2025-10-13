'use client';

import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ContactForm } from '@/components/ContactForm';
import { Droplets, Sparkles, CheckCircle, Star, Clock, ArrowRight, Zap, Car } from 'lucide-react';
import { useState } from 'react';
import ModalForm from '@/components/ModalForm';

export default function CarWashPage() {

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState('');

  const openModal = (service: string) => {
    setSelectedService(service + " - Car Wash");
    setIsModalOpen(true);
  };

  const closeModal = () => setIsModalOpen(false);

  const packages = [
    {
      title: 'Express Wash',
      description: 'Quick and efficient exterior wash',
      features: ['Exterior wash', 'Wheel cleaning', 'Basic dry'],
      price: 'AED 15',
      duration: '15 min',
      popular: false
    },
    {
      title: 'Full Service Wash',
      description: 'Complete interior and exterior cleaning',
      features: ['Exterior wash & wax', 'Interior vacuum', 'Window cleaning', 'Tire shine'],
      price: 'AED 35',
      duration: '45 min',
      popular: true
    },
    {
      title: 'Premium Detail',
      description: 'Comprehensive detailing service',
      features: ['Full service wash', 'Interior detailing', 'Paint protection', 'Ceramic coating application'],
      price: 'AED 85',
      duration: '2 hours',
      popular: false
    },
    {
      title: 'Ultimate Detail',
      description: 'Complete transformation package',
      features: ['Everything in Premium', 'Engine bay cleaning', 'Headlight restoration', 'Leather conditioning'],
      price: 'AED 150',
      duration: '4 hours',
      popular: false
    }
  ];

  const services = [
    {
      icon: Droplets,
      title: 'Hand Wash',
      description: 'Gentle hand washing with premium soap and microfiber cloths'
    },
    {
      icon: Sparkles,
      title: 'Interior Detailing',
      description: 'Deep cleaning of seats, carpets, dashboard, and all interior surfaces'
    },
    {
      icon: Zap,
      title: 'Paint Protection',
      description: 'Wax and sealant application for long-lasting paint protection'
    },
    {
      icon: Car,
      title: 'Engine Cleaning',
      description: 'Safe engine bay cleaning and detailing for optimal appearance'
    }
  ];

  return (
    <div className="min-h-screen pt-0">
      {/* Hero Section */}
      <section className="relative py-20 bg-gradient-to-br from-blue-600 via-cyan-600 to-teal-600 text-white">
        <div className="absolute inset-0 opacity-20">
          <Image
            src="https://images.pexels.com/photos/5835411/pexels-photo-5835411.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
            alt="Car Washing Service"
            fill
            className="object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center">
            <div className="flex items-center justify-center mb-6">
              <Droplets className="h-16 w-16 text-cyan-300" />
            </div>
            <h1 className="text-5xl font-bold mb-6">Premium Car Wash & Detailing</h1>
            <p className="text-xl text-cyan-100 max-w-3xl mx-auto">
              From quick express washes to complete detailing services, we keep your vehicle looking its absolute best inside and out.
            </p>
          </AnimatedSection>
        </div>
      </section>

      {/* Services Overview */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">Our Car Care Services</h2>
            <p className="text-lg text-gray-600 dark:text-white/80">Professional cleaning solutions for every vehicle</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {services.map((service, index) => (
              <AnimatedSection key={service.title} delay={index * 100}>
                <div className="text-center bg-white rounded-lg p-6 shadow-lg border border-gray-100">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <service.icon className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                  <p className="text-gray-600 text-sm">{service.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Packages Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Wash Packages</h2>
            <p className="text-lg text-gray-600">Choose the perfect package for your needs and budget</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {packages.map((pkg, index) => (
              <AnimatedSection key={pkg.title} delay={index * 100}>
                <div className={`bg-white rounded-lg shadow-lg p-6 border-2 hover:shadow-xl transition-shadow duration-300 ${pkg.popular ? 'border-blue-500 scale-105' : 'border-gray-200'}`}>
                  {pkg.popular && (
                    <div className="bg-blue-500 text-white text-xs font-bold uppercase px-3 py-1 rounded-full mb-4 inline-block">
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{pkg.title}</h3>
                  <p className="text-gray-600 mb-4">{pkg.description}</p>
                  <ul className="space-y-2 dark:text-gray-800 mb-6">
                    {pkg.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-3xl font-bold text-blue-600">{pkg.price}</span>
                    <div className="flex items-center text-gray-500 text-sm">
                      <Clock className="h-4 w-4 mr-1" />
                      {pkg.duration}
                    </div>
                  </div>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700"
                    onClick={() => openModal(pkg.title)}
                  >
                    Choose Package
                    <ArrowRight size={16} className="ml-2" />
                  </Button>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Process Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">Our Detailed Process</h2>
              <div className="space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 dark:text-white">Pre-Wash Inspection</h3>
                    <p className="text-gray-600 dark:text-white/80">Vehicle assessment and custom service recommendation.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 dark:text-white">Exterior Cleaning</h3>
                    <p className="text-gray-600 dark:text-white/80">Hand wash with premium soaps and microfiber cloths.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 dark:text-white">Interior Detailing</h3>
                    <p className="text-gray-600 dark:text-white/80">Vacuum, wipe down, and detailed cleaning of all surfaces.</p>
                  </div>
                </div>
                <div className="flex items-start space-x-4">
                  <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold">
                    4
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2 dark:text-white">Final Protection</h3>
                    <p className="text-gray-600 dark:text-white/80">Wax application and tire shine for lasting results.</p>
                  </div>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <div className="relative">
                <Image
                  src="/images/carWash.jpg"
                  alt="Car Wash Process"
                  width={800}
                  height={600}
                  className="rounded-lg shadow-lg"
                />
                <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm px-4 py-2 rounded-lg">
                  <div className="text-sm font-semibold text-gray-900">Professional Equipment</div>
                  <div className="text-xs text-gray-600">Eco-friendly products</div>
                </div>
              </div>
            </AnimatedSection>
          </div>
        </div>
      </section>

      {/* Membership Section */}
      <section className="py-20 bg-gradient-to-r from-blue-900 to-cyan-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Monthly Membership Plans</h2>
            <p className="text-lg text-blue-100">Save money with our convenient membership options</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                name: 'Basic Membership',
                price: '$29/month',
                features: ['Unlimited express washes', 'Free vacuum', '10% off detailing'],
                savings: 'Save $50/month'
              },
              {
                name: 'Premium Membership',
                price: '$49/month',
                features: ['Unlimited full service', 'Monthly wax', '15% off all services'],
                savings: 'Save $80/month'
              },
              {
                name: 'Ultimate Membership',
                price: '$79/month',
                features: ['All services included', 'Monthly detailing', 'Priority booking'],
                savings: 'Save $120/month'
              }
            ].map((plan, index) => (
              <AnimatedSection key={plan.name} delay={index * 100}>
                <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
                  <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                  <div className="text-3xl font-bold text-cyan-300 mb-4">{plan.price}</div>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, i) => (
                      <li key={i} className="flex items-center text-sm">
                        <CheckCircle className="h-4 w-4 text-green-300 mr-2 flex-shrink-0" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  <div className="text-green-300 text-sm font-semibold mb-4">{plan.savings}</div>
                  <Button className="w-full bg-white text-blue-900 hover:bg-blue-50">
                    Join Now
                  </Button>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Keep Your Car Looking Great</h2>
              <p className="text-lg text-gray-700 mb-8">
                Regular washing and detailing not only keeps your car looking amazing but also protects your investment and maintains its value. Book your service today!
              </p>
              <div className="grid grid-cols-2 dark:text-gray-800 gap-4 text-sm">
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>Eco-friendly products</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>Satisfaction guarantee</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>Professional staff</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span>Quick turnaround</span>
                </div>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <ContactForm service="Car Wash" />
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