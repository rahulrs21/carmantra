'use client';

import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { AnimatedSection } from '@/components/AnimatedSection';
import { ContactForm } from '@/components/ContactForm';
import {
  Shield,
  Sparkles,
  Car,
  Palette,
  Droplets,
  Wrench,
  SearchCheck,
  FileCheck,
  CarIcon,
  Star,
  CheckCircle,
  ArrowRight,
  ArrowRightCircle,
  MessageCircle
} from 'lucide-react';
import { useEffect, useState } from 'react';
import TrustIndicator from '@/components/TrustIndicator';
import OurWorksSlider from '@/components/OurWorksSlider';
import WelcomeBack from '@/components/WelcomeBack';

export default function Home() {
  const services = [
    {
      title: 'PPF & Wrapping',
      description: 'Premium paint protection film and vinyl wrapping for ultimate vehicle protection and style.',
      icon: Shield,
      href: '/services/ppf-wrapping',
      image: 'https://images.pexels.com/photos/3784424/pexels-photo-3784424.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
    {
      title: 'Ceramic Coating',
      description: 'Advanced ceramic coating technology for long-lasting protection and brilliant shine.',
      icon: Sparkles,
      href: '/services/ceramic-coating',
      image: 'https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
    {
      title: 'Car Polishing',
      description: 'Professional polishing services to restore your vehicle\'s original luster.',
      icon: Car,
      href: '/services/car-polishing',
      image: 'https://images.pexels.com/photos/5835359/pexels-photo-5835359.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
    {
      title: 'Car Tinting',
      description: 'High-quality window tinting for privacy, UV protection, and enhanced aesthetics.',
      icon: Palette,
      href: '/services/car-tinting',
      image: 'https://images.pexels.com/photos/1592384/pexels-photo-1592384.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
    {
      title: 'Car Wash',
      description: 'Comprehensive car washing services from basic wash to premium detailing.',
      icon: Droplets,
      href: '/services/car-wash',
      image: 'https://images.pexels.com/photos/5835411/pexels-photo-5835411.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
    {
      title: 'Instant Help',
      description: '24/7 roadside assistance and emergency car services when you need them most.',
      icon: Wrench,
      href: '/services/instant-help',
      image: 'https://images.pexels.com/photos/4488662/pexels-photo-4488662.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
    {
      title: 'Pre-Purchase Inspection',
      description: 'Thorough vehicle inspection before purchase to ensure you make the right decision.',
      icon: SearchCheck,
      href: '/services/pre-purchase-inspection',
      image: 'https://images.pexels.com/photos/5835411/pexels-photo-5835411.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
    {
      title: 'Car Passing',
      description: 'Help with vehicle registration, inspection, and passing requirements.',
      icon: FileCheck,
      href: '/services/car-passing',
      image: 'https://images.pexels.com/photos/3760767/pexels-photo-3760767.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
    {
      title: 'Car Insurance',
      description: 'Comprehensive car insurance solutions tailored to your needs and budget.',
      icon: CarIcon,
      href: '/services/car-insurance',
      image: 'https://images.pexels.com/photos/5384445/pexels-photo-5384445.jpeg?auto=compress&cs=tinysrgb&w=500&h=300&fit=crop'
    },
  ];


  const randomVideoUrl: string[] = [
    'https://www.pexels.com/download/video/4822920/', // Car driving on road
    'https://www.pexels.com/download/video/6873503/', // Car close-up
    'https://www.pexels.com/download/video/6872078/', // Car interio
  ]

  const videos = [
    "https://www.pexels.com/download/video/6873503/",
    "https://www.pexels.com/download/video/4822920/",
  ];

  const [videoSrc, setVideoSrc] = useState(videos[0]); // default, safe for SSR

  useEffect(() => {
    const random = videos[Math.floor(Math.random() * videos.length)];
    setVideoSrc(random);
  }, []);


  console.log('AAA', [Math.floor(Math.random() * 10)])


  const handleWhatsAppClick = () => {
    // Replace with your actual WhatsApp number
    const phoneNumber = "1234567890";
    const message = "Hi! I'm interested in your car services. Can you help me?";
    const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank");
  };



  const testimonials = [
    {
      name: 'John Smith',
      rating: 5,
      comment: 'Exceptional service! My car looks brand new after their ceramic coating treatment.',
      service: 'Ceramic Coating'
    },
    {
      name: 'Sarah Johnson',
      rating: 5,
      comment: 'Professional PPF installation. The team was knowledgeable and delivered perfect results.',
      service: 'PPF & Wrapping'
    },
    {
      name: 'Mike Davis',
      rating: 5,
      comment: 'Quick and reliable instant help service. They saved me from a roadside emergency.',
      service: 'Instant Help'
    },
  ];

  return (
    <div className="min-h-screen">



      {/* Welcome Back Message! */}
      <div className='relative z-500'>
        <WelcomeBack />
      </div>







      {/* Hero Section */}
      <section className="relative pt-3 md:pt-0 min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900  to-black overflow-hidden">
        {/* <div className="absolute inset-0 bg-black/20"></div> */}

        {/* <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30"
          style={{ 
            backgroundImage: 'url(https://images.pexels.com/photos/3786157/pexels-photo-3786157.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop)'
          }}
        ></div> */}

        {/* Video background */}
        <video
          className="absolute top-0 left-0 w-full h-full object-cover -z-1 opacity-30"
          autoPlay
          loop
          muted
          playsInline
        >
          {/* Direct video URL from Pexels */}

          {/* // src='https://www.pexels.com/download/video/6873503/' */}
          <source
            // src={randomVideoUrl[Math.floor(Math.random() * randomVideoUrl.length)]}
            src={videoSrc}
            type="video/mp4"
          />
          Your browser does not support the video tag.
        </video>

        <AnimatedSection className="relative z-10 text-center text-white max-w-5xl mx-auto px-4">
          <h1 className="text-5xl mt-14 md:mt-0 md:text-7xl font-bold mb-5 md:mb-10 bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent">
            Premier Car Services
          </h1>
          <p className="text-lg md:text-2xl mb-6 md:mb-10  text-blue-100">
            Professional automotive care with cutting-edge technology and unmatched expertise
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50 text-lg px-8 py-3"
              onClick={() => {
                const section = document.getElementById("service_main");
                if (section) section.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore Services
              <ArrowRight size={20} className="ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="relative border-white bg-blue-900 text-white hover:bg-white hover:text-blue-900 text-lg px-8 py-3"
              onClick={() => {
                const section = document.getElementById("contact_form");
                if (section) section.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <ArrowRightCircle size={20} className="mr-2" />
              <p className='relative z-99'>Get Quote</p>


              {/* ✨ Rays effect */}
              <span className="absolute inset-0 w-full h-full overflow-hidden">
                <span className="absolute z-0 -inset-y-1 -inset-x-1 bg-gradient-to-r from-transparent via-white/40 to-transparent 
      translate-x-[-100%] animate-shine" />
              </span>



            </Button>
          </div>

          <div className="mt-12">
            <TrustIndicator />
          </div>
        </AnimatedSection>

        {/* Floating particles animation */}

      </section>

      {/* Services Section */}
      <section id="service_main" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Premium Services</h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto">
              Comprehensive automotive care solutions designed to keep your vehicle in pristine condition
            </p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <AnimatedSection key={service.href} delay={index * 100}>
                <Link href={service.href} className="group">
                  <div className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                    <div className="relative h-48 overflow-hidden">
                      <Image
                        src={service.image}
                        alt={service.title}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                      <div className="absolute bottom-4 left-4">
                        <service.icon className="h-8 w-8 text-white" />
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                        {service.title}
                      </h3>
                      <p className="text-gray-600 mb-4">{service.description}</p>
                      <div className="flex items-center text-blue-600 font-semibold group-hover:text-blue-800">
                        Learn More
                        <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </Link>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">Why Choose Premier Car Services?</h2>
            <p className="text-xl text-gray-600">Experience the difference of professional automotive care</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                title: 'Expert Technicians',
                description: 'Certified professionals with years of experience',
                icon: CheckCircle
              },
              {
                title: 'Premium Materials',
                description: 'Only the highest quality products and materials',
                icon: Star
              },
              {
                title: 'Satisfaction Guarantee',
                description: '100% satisfaction guarantee on all services',
                icon: Shield
              },
              {
                title: 'Quick Turnaround',
                description: 'Efficient service without compromising quality',
                icon: CheckCircle
              }
            ].map((feature, index) => (
              <AnimatedSection key={feature.title} delay={index * 100}>
                <div className="text-center">
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <feature.icon className="h-8 w-8 text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600">{feature.description}</p>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 mb-4">What Our Customers Say</h2>
            <p className="text-xl text-gray-600">Trusted by thousands of satisfied customers</p>
          </AnimatedSection>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <AnimatedSection key={testimonial.name} delay={index * 100}>
                <div className="bg-white rounded-lg shadow-lg p-6">
                  <div className="flex items-center mb-4">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-gray-700 mb-4 italic">"{testimonial.comment}"</p>
                  <div>
                    <p className="font-semibold text-gray-900">{testimonial.name}</p>
                    <p className="text-sm text-gray-600">{testimonial.service}</p>
                  </div>
                </div>
              </AnimatedSection>
            ))}
          </div>
        </div>
      </section>

      <section className='py-20 bg-white'>
        <OurWorksSlider />
      </section>


      {/* CTA Section */}
      <section id="contact_form" className="py-20 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-4xl font-bold mb-6">Ready to Transform Your Vehicle?</h2>
              <p className="text-xl text-blue-100 mb-8">
                Get a personalized quote for your vehicle today. Our experts are ready to help you choose the perfect service package.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-white text-blue-900 hover:bg-blue-50">
                  Call Now: (123) 456-7890
                </Button>
                <Button size="lg" variant="outline" className="border-white text-gray-800 hover:bg-white hover:text-blue-900">
                  Schedule Online
                </Button>
              </div>
            </AnimatedSection>

            <AnimatedSection delay={200}>
              <ContactForm />
            </AnimatedSection>
          </div>
        </div>
      </section>


      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={handleWhatsAppClick}
          className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 shadow-2xl hover:scale-110 transition-all duration-300 animate-pulse"
          size="icon"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>



    </div>
  );
}