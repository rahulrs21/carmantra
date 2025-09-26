'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, Phone, MessageCircle } from 'lucide-react';

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);

  const [isTop, setIsTop] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      setIsTop(window.scrollY === 0);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const services = [
    { name: 'PPF & Wrapping', href: '/services/ppf-wrapping' },
    { name: 'Ceramic Coating', href: '/services/ceramic-coating' },
    { name: 'Car Polishing', href: '/services/car-polishing' },
    { name: 'Car Tinting', href: '/services/car-tinting' },
    { name: 'Car Wash', href: '/services/car-wash' },
    { name: 'Instant Help', href: '/services/instant-help' },
    { name: 'Pre-Purchase Inspection', href: '/services/pre-purchase-inspection' },
    { name: 'Car Passing', href: '/services/car-passing' },
    { name: 'Car Insurance', href: '/services/car-insurance' },
  ];

  return (
    <nav 
      className={`fixed top-0 w-full border-b z-50 transition-colors duration-300 ${
        isTop
          ? "bg-transparent text-white border-transparent"
          : "bg-blue-950 backdrop-blur-sm border-gray-200"
      }`} >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CM</span>
            </div>
            <span className='font-bold text-xl text-white'>Car Mantra</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="text-gray-100 hover:text-blue-600 transition-colors">
              Home
            </Link>
            <div className="relative group">
              <button className="text-gray-100 hover:text-blue-600 transition-colors">
                Services
              </button>
              <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2">
                  {services.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      className="block px-4 py-2 text-sm text-gray-100 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link href="/about" className="text-gray-100 hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link href="/contact" className="text-gray-100 hover:text-blue-600 transition-colors">
              Contact
            </Link>
            <div className="flex items-center space-x-4">
              <a
                href="tel:+1234567890"
                className="flex items-center px-3 py-1 rounded-full bg-white space-x-1 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Phone size={16} />
                <span className="text-sm">(123) 456-7890</span>
              </a>
              <a
                href="https://wa.me/1234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-colors text-sm"
              >
                <MessageCircle size={16} />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isOpen && (
          <div className="md:hidden py-4 ">
            <div className="flex flex-col space-y-4">
              <Link href="/" className="text-gray-100 hover:text-blue-600 transition-colors">
                Home
              </Link>
              <div className="space-y-2">
                <span className="font-semibold text-gray-900">Services</span>
                <div className="ml-4 space-y-2">
                  {services.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      className="block text-gray-600 hover:text-blue-600 transition-colors text-sm"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
              <Link href="/about" className="text-gray-100 hover:text-blue-600 transition-colors">
                About
              </Link>
              <Link href="/contact" className="text-gray-100 hover:text-blue-600 transition-colors">
                Contact
              </Link>
              <div className="flex items-center space-x-4 pt-4">
                <a
                  href="tel:+1234567890"
                  className="flex items-center space-x-1 text-blue-600"
                >
                  <Phone size={16} />
                  <span className="text-sm">(123) 456-7890</span>
                </a>
                <a
                  href="https://wa.me/1234567890"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full text-sm"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}