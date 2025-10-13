'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X, Phone, MessageCircle, Moon, Sun } from 'lucide-react';
import { motion } from "framer-motion";

export function Navigation() {
  const [isOpen, setIsOpen] = useState(false);
  const [isTop, setIsTop] = useState(true);

  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle('dark', savedTheme === 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
    localStorage.setItem('theme', newTheme);
  };

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

  const backgroundColor = "transparent";

  return (
    <nav
      className={`fixed top-0 w-full border-b z-50 transition-colors duration-300
        ${isTop
          ? backgroundColor === "transparent"
            ? "text-white md:bg-transparent bg-blue-900 border-transparent"
            : "text-black md:bg-transparent bg-blue-900 border-transparent"
          : "md:bg-white md:text-gray-900 bg-blue-900 text-white border-gray-200"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">CM</span>
            </div>
            <span className='font-bold text-xl'>Car Mantra</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <Link href="/" className="hover:text-blue-600 transition-colors">
              Home
            </Link>
            <div className="relative group">
              <button className="hover:text-blue-600 transition-colors">
                Services
              </button>
              <div className="absolute top-full left-0 mt-2 w-64 bg-white text-gray-900 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="py-2">
                  {services.map((service) => (
                    <Link
                      key={service.href}
                      href={service.href}
                      className="block px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
                    >
                      {service.name}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
            <Link href="/about" className="hover:text-blue-600 transition-colors">
              About
            </Link>
            <Link href="/contact" className="hover:text-blue-600 transition-colors">
              Contact
            </Link>
            <div className="flex items-center space-x-4">
              <a
                href="tel:+1234567890"
                className="flex items-center px-3 py-1 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
              >
                <Phone size={16} />
                <span className="text-sm">+971 50 332 4868</span>
              </a>
              <a
                href="https://wa.me/971503324868"
                target="_blank"
                rel="noopener noreferrer"
                className="flex relative overflow-hidden items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full hover:bg-green-600 transition-colors text-sm"
              >
                <MessageCircle size={16} />
                <span>WhatsApp</span>
                <span className="absolute inset-0 w-full h-full">
                  <span className="absolute z-0 -inset-y-1 -inset-x-1 bg-gradient-to-r from-transparent via-white/80 to-transparent translate-x-[-100%] animate-shine" />
                </span>
              </a>

              {/* Dark/Light Toggle (Desktop) */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="md:hidden py-4 overflow-hidden"
          >
            <div className="flex flex-col space-y-4">
              <Link href="/" onClick={() => setIsOpen(false)} className="hover:text-blue-400 transition-colors">
                Home
              </Link>

              <div className="space-y-2">
                <span className="font-semibold">Services</span>
                <div className="ml-4 space-y-2">
                  {services.map((service) => (
                    <motion.div
                      key={service.href}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                    >
                      <Link
                        href={service.href}
                        onClick={() => setIsOpen(false)}
                        className="block hover:text-blue-400 transition-colors text-sm"
                      >
                        {service.name}
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>

              <Link href="/about" onClick={() => setIsOpen(false)} className="hover:text-blue-400 transition-colors">
                About
              </Link>

              <Link href="/contact" onClick={() => setIsOpen(false)} className="hover:text-blue-400 transition-colors">
                Contact
              </Link>

              <div className="flex items-center space-x-4 pt-4">
                <a href="tel:+1234567890" className="flex items-center space-x-1 text-blue-400">
                  <Phone size={16} />
                  <span className="text-sm">+971 50 332 4868</span>
                </a>
                <a
                  href="https://wa.me/971503324868"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 bg-green-500 text-white px-3 py-1 rounded-full text-sm"
                >
                  <MessageCircle size={16} />
                  <span>WhatsApp</span>
                </a>
                {/* Dark/Light Toggle (Mobile) */}
                <button
                  onClick={toggleTheme}
                  className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </nav>
  );
}
