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
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Navigation, Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";

import { useMediaQuery } from "react-responsive";
import BeforeAfterSlider from '@/components/BeforeAfterSlider';



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


  const isMobile = useMediaQuery({ maxWidth: 768 });

  const features = [
    {
      title: "Expert Technicians",
      description: "Certified professionals with years of experience",
      icon: CheckCircle,
    },
    {
      title: "Premium Materials",
      description: "Only the highest quality products and materials",
      icon: Star,
    },
    {
      title: "Satisfaction Guarantee",
      description: "100% satisfaction guarantee on all services",
      icon: Shield,
    },
    {
      title: "Quick Turnaround",
      description: "Efficient service without compromising quality",
      icon: CheckCircle,
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
            <Button size="lg" className="bg-white dark:bg-white dark:text-black  text-blue-900 hover:bg-blue-50 text-lg px-8 py-3"
              onClick={() => {
                const section = document.getElementById("service_main");
                if (section) section.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore Services
              <ArrowRight size={20} className="ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="relative border-white bg-blue-900 text-white hover:bg-white   hover:text-blue-900 text-lg px-8 py-3"
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

          <div className="mt-12 text-white">
            <TrustIndicator />
          </div>
        </AnimatedSection>

        {/* Floating particles animation */}

      </section>


      {/* Before After Section */}
      <section className="relative py-14 bg-gradient-to-b from-gray-900 via-black to-gray-950 text-white overflow-hidden">
        {/* Subtle glow overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.05),_transparent_70%)] pointer-events-none"></div>

        <div className="relative max-w-full pb-3 mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <AnimatedSection>
            {/* Accent line */}
            <div className="flex justify-center mb-6">
              <span className="h-1 w-20 bg-blue-500 rounded-full"></span>
            </div>

            {/* Elegant heading */}
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-white to-blue-400">
              See the Premier Difference
            </h2>

            {/* Refined description */}
            <p className="text-base md:text-lg text-gray-300 max-w-2xl mx-auto leading-relaxed mb-12">
              Experience the transformation — witness how our professional care restores brilliance, precision,
              and a mirror-perfect finish to every surface we touch.
            </p>

            {/* Before/After Slider */}
            <div className="mt-10">
              <BeforeAfterSlider
                beforeImage="https://images.pexels.com/photos/3784424/pexels-photo-3784424.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
                afterImage="https://wrapsters.ae/wp-content/uploads/2025/01/Paint-Protention-Film-PPF-1.jpg?auto=compress&cs=tinysrgb&w=1920&h=1080&fit=crop"
              />
            </div>
          </AnimatedSection>
        </div>



         


      </section>



      {/* Premium Services Section */}
      <section
        id="service_main"
        className="relative py-14 bg-gradient-to-b from-gray-950 via-black to-gray-900 text-white overflow-hidden"
      >
        {/* Subtle glowing background accent */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_70%)] pointer-events-none"></div>

        <div className="relative max-w-full  mx-auto px-4 sm:px-6 lg:px-8 mb-10">
          {/* Header */}
          <AnimatedSection className="max-w-7xl mx-auto text-center mb-4">
            <div className="flex justify-center mb-8">
              <span className="h-1 w-24 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></span>
            </div>

            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-white to-blue-400">
              Our Premium Services
            </h2>

            <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Drive with confidence — explore our advanced automotive care and detailing services designed
              to enhance, protect, and transform your vehicle inside and out.
            </p>
          </AnimatedSection>

          {/* Swiper Slider for All Devices */}
          <div className="overflow-visible px-2 md:px-10 rounded-2xl py-10"> {/* 👈 Added extra breathing room */}
            <Swiper
              modules={[Navigation, Pagination]}
              spaceBetween={40}
              slidesPerView={1}
              breakpoints={{
                640: { slidesPerView: 1.5 },
                1024: { slidesPerView: 2.5 },
                1440: { slidesPerView: 4 },
              }}
              navigation={{
                nextEl: ".swiper-button-next1",
                prevEl: ".swiper-button-prev1",
              }}
              pagination={{ clickable: true, dynamicBullets: true }}
              className="pb-20 relative z-10"

            >
              {services.map((service, index) => (
                <SwiperSlide key={service.href}>
                  <AnimatedSection delay={index * 100}>
                    <Link href={service.href} className="group block">
                      <div className="relative bg-gray-900/70 backdrop-blur-xl rounded-2xl overflow-auto shadow-[0_0_25px_rgba(0,0,0,0.5)] hover:shadow-[0_0_35px_rgba(59,130,246,0.4)] transition-all duration-500 transform hover:-translate-y-2">
                        {/* Image Section */}
                        <div className="relative h-60 overflow-hidden">
                          <Image
                            src={service.image}
                            alt={service.title}
                            fill
                            className="object-cover group-hover:scale-110 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                          <div className="absolute bottom-4 left-4 flex items-center gap-2">
                            <service.icon className="h-8 w-8 text-blue-400 drop-shadow-lg" />
                            <span className="text-white font-semibold text-lg">{service.title}</span>
                          </div>
                        </div>

                        {/* Content */}
                        <div className="p-8">
                          <p className="text-gray-300 mb-5 text-sm md:text-base leading-relaxed group-hover:text-gray-200 transition-colors">
                            {service.description}
                          </p>
                          <div className="flex items-center text-blue-400 font-semibold group-hover:text-cyan-400 transition-all">
                            Learn More
                            <ArrowRight
                              size={18}
                              className="ml-2 group-hover:translate-x-1 transition-transform"
                            />
                          </div>
                        </div>
                      </div>
                    </Link>
                  </AnimatedSection>
                </SwiperSlide>
              ))}

            </Swiper>
            {/* Modern Navigation Buttons */}
            <div className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 flex gap-4 z-10 ">
              <div className="swiper-button-prev1 w-12 h-12 flex justify-center items-center bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full shadow-lg hover:scale-110 transition">
                ❮
              </div>
              <div className="swiper-button-next1 w-12 h-12 flex justify-center items-center bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full shadow-lg hover:scale-110 transition">
                ❯
              </div>
            </div>
          </div>

        </div>


      </section>



      {/* Auto-Playing Image Showcase Section */}
      <section
        id="showcase"
        className="relative py-28 bg-gradient-to-b from-black via-gray-950 to-black text-white overflow-hidden"
      >
        {/* Glow Overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(59,130,246,0.1),_transparent_70%)] pointer-events-none"></div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Heading */}
          <AnimatedSection className="mb-16">
            <div className="flex justify-center mb-8">
              <span className="h-1 w-24 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></span>
            </div>

            <h2 className="text-4xl md:text-6xl font-extrabold tracking-tight mb-4 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-white to-cyan-400">
              Experience the Art of Perfection
            </h2>
            <p className="text-base md:text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              A visual journey through our finest detailing, ceramic coating, and PPF transformations.
            </p>
          </AnimatedSection>

          {/* Swiper Image Slider */}
          <Swiper
            modules={[Autoplay, Pagination]}
            spaceBetween={30}
            slidesPerView={1.2}
            breakpoints={{
              640: { slidesPerView: 1.5 },
              1024: { slidesPerView: 2.5 },
              1440: { slidesPerView: 3 },
            }}
            autoplay={{
              delay: 1000,
              disableOnInteraction: false,
            }}
            loop={true}
            speed={1500}
            pagination={{ clickable: true, dynamicBullets: true }}
            className="pb-16"
          >
            {[
              {
                src: "https://images.pexels.com/photos/4489724/pexels-photo-4489724.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080",
                alt: "Ceramic Coating Process",
              },
              {
                src: "https://images.pexels.com/photos/97075/pexels-photo-97075.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080",
                alt: "Car Detailing Shine",
              },
              {
                src: "https://images.pexels.com/photos/4489719/pexels-photo-4489719.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080",
                alt: "PPF Installation",
              },
              {
                src: "https://images.pexels.com/photos/193021/pexels-photo-193021.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080",
                alt: "Luxury Sports Car Detail",
              },
              {
                src: "https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080",
                alt: "Car Wash Detailing",
              },
              {
                src: "https://images.pexels.com/photos/6878150/pexels-photo-6878150.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1080",
                alt: "Gloss Finish After PPF",
              },
            ].map((item, index) => (
              <SwiperSlide key={index}>
                <div className="relative rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.6)] hover:shadow-[0_0_40px_rgba(59,130,246,0.4)] transition-all duration-700 transform hover:-translate-y-2">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    width={1920}
                    height={1080}
                    className="object-cover w-full h-[400px] md:h-[500px] lg:h-[550px] transition-transform duration-700 hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-left">
                    <h3 className="text-lg md:text-2xl font-semibold text-white drop-shadow-lg">
                      {item.alt}
                    </h3>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>





      {/* Why Choose Us Section */}
      <section className="py-20 bg-white dark:bg-gray-800">

        {/* Subtle glowing background accent */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(59,130,246,0.08),_transparent_70%)] pointer-events-none"></div>

        
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
          <div className="flex justify-center mb-8">
              <span className="h-1 w-24 bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full"></span>
            </div>
            <h2 className="text-2xl md:text-4xl font-bold text-black dark:text-white mb-4">
              Why Choose Premier Car Services?
            </h2>
            <p className="text-lg md:text-xl text-gray-900 dark:text-white">
              Experience the difference of professional automotive care
            </p>
          </AnimatedSection>



          <div className="relative">

            {/* Mobile → Carousel | Desktop → Grid */}
            {isMobile ? (

              <div className="relative">
                <Swiper
                  spaceBetween={16}
                  loop={true} // ✅ makes it infinite

                  modules={[Autoplay, Navigation]}
                  slidesPerView={1}
                  navigation={{
                    nextEl: ".swiper-button-next3",
                    prevEl: ".swiper-button-prev3",
                  }}
                  pagination={{ clickable: true }}
                  grabCursor


                >
                  {features.map((feature, index) => (
                    <SwiperSlide key={feature.title}>
                      <AnimatedSection delay={index * 100}>
                        <div className="text-center border border-gray-200 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col items-center">
                          <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                            <feature.icon className="h-8 w-8 text-blue-400" />
                          </div>
                          <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                            {feature.title}
                          </h3>
                          <p className="text-gray-900 dark:text-white">
                            {feature.description}
                          </p>
                        </div>
                      </AnimatedSection>
                    </SwiperSlide>
                  ))}
                </Swiper>

                {/* Custom Navigation Buttons */}
                <button className="swiper-button-prev3 swiper-but-prev absolute left-0 top-1/3 w-12  bg-blue-900/70 text-white p-3 rounded-lg hover:bg-gray-900 transition z-10">
                  ❮
                </button>
                <button className="swiper-button-next3 swiper-but-next absolute right-0 top-1/3  w-12 bg-blue-900/70 text-white p-3 rounded-lg hover:bg-gray-900 transition z-10">
                  ❯
                </button>

              </div>


            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                {features.map((feature, index) => (
                  <AnimatedSection key={feature.title} delay={index * 100}>
                    <div className="text-center border border-gray-200 dark:border-gray-700 p-6 rounded-lg hover:shadow-lg transition-shadow h-full flex flex-col items-center">
                      <div className="w-16 h-16 bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                        <feature.icon className="h-8 w-8 text-blue-400" />
                      </div>
                      <h3 className="text-xl font-bold text-black dark:text-white mb-2">
                        {feature.title}
                      </h3>
                      <p className="text-gray-900 dark:text-white">
                        {feature.description}
                      </p>
                    </div>
                  </AnimatedSection>
                ))}
              </div>
            )}

          </div>

        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-gray-100 text-black  dark:bg-gray-900">

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <AnimatedSection className="text-center mb-16">
            <h2 className="text-2xl md:text-4xl font-bold dark:text-white mb-4">What Our Customers Say</h2>
            <p className="text-lg md:text-xl text-gray-900 dark:text-white">Trusted by thousands of satisfied customers</p>
          </AnimatedSection>

         



          {/* Mobile view - Slider */}
          <div className="  px-4 relative">
            <Swiper
              spaceBetween={16}
              loop={true} // ✅ makes it infinite

              modules={[Autoplay, Navigation]}
              slidesPerView={1.1}
              navigation={{
                nextEl: ".swiper-button-next",
                prevEl: ".swiper-button-prev",
              }}
              pagination={{ clickable: true }}
              grabCursor
              breakpoints={{
                640: { slidesPerView: 1.1 }, //2.2
                1024: { slidesPerView: 3.2 }, //3.2
              }}

            >
              {testimonials.map((testimonial, index) => (
                <SwiperSlide key={testimonial.name}>
                  <AnimatedSection delay={index * 100}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                      <div className="flex items-center mb-4">
                        {[...Array(testimonial.rating)].map((_, i) => (
                          <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                        ))}
                      </div>
                      <p className="text-gray-900 dark:text-white mb-4 italic">
                        "{testimonial.comment}"
                      </p>
                      <div>
                        <p className="font-semibold dark:text-white">{testimonial.name}</p>
                        <p className="text-sm text-gray-900 dark:text-white">
                          {testimonial.service}
                        </p>
                      </div>
                    </div>
                  </AnimatedSection>
                </SwiperSlide>
              ))}
            </Swiper>

            {/* Custom Navigation Buttons */}
            <button className="swiper-button-prev  left-0 top-1/2   bg-gray-900/70 text-white p-3 rounded-full hover:bg-gray-900 transition z-10">
              ❮
            </button>
            <button className="swiper-button-next   right-0 top-1/2   bg-gray-900/70 text-white p-3 rounded-full hover:bg-gray-900 transition z-10">
              ❯
            </button>
          </div>
        </div> 

      </section>


      {/* <section className='py-20 bg-white text-black dark:text-white dark:bg-gray-800'>
        <OurWorksSlider />
      </section> */}


      {/* CTA Section */}
      <section id="contact_form" className="py-20 bg-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <AnimatedSection>
              <h2 className="text-2xl md:text-4xl font-bold mb-6">Ready to Transform Your Vehicle?</h2>
              <p className="text-lg md:text-xl text-blue-100 mb-8">
                Get a personalized quote for your vehicle today. Our experts are ready to help you choose the perfect service package.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button size="lg" className="bg-white dark:bg-gray-800 dark:text-white text-gray-900 hover:bg-blue-50">
                  Call Now: (123) 456-7890
                </Button>
                <Button size="lg" variant="outline" className="border-white text-gray-900 dark:text-white hover:bg-white dark:bg-gray-800 hover:text-blue-900">
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
          className="w-14 h-14 rounded-full dark:bg-blue-900 bg-green-500 hover:bg-green-600 shadow-2xl hover:scale-110 transition-all duration-300 animate-pulse-slow"
          size="icon"
        >
          <MessageCircle className="w-6 h-6 text-white" />
        </Button>
      </div>



    </div>
  );
}