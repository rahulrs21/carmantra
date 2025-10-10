"use client";

import Link from "next/link";
import { Phone, MessageCircle } from "lucide-react";

export default function Prefooter() {
  const services = [
    { name: "PPF & Wrapping", href: "/services/ppf-wrapping" },
    { name: "Ceramic Coating", href: "/services/ceramic-coating" },
    { name: "Car Polishing", href: "/services/car-polishing" },
    { name: "Car Tinting", href: "/services/car-tinting" },
    { name: "Car Wash", href: "/services/car-wash" },
  ];

  return (
    <div className="bg-blue-950 text-white py-12">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between gap-8">
        {/* Logo */}
        <div className="flex items-start space-x-3">

          <div className="flex flex-col gap-4 mr-8">

            <div className="flex items-center space-x-2">
              <Link href="/" className="flex items-center space-x-2">

                <div className="w-10 h-10 bg-gradient-to-r from-blue-600 to-blue-800 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">CM</span>
                </div>
                <span className="font-bold text-xl">Car Mantra</span>
              </Link>
            </div>

            <p className="max-w-xs text-sm text-gray-300">
              Premier Car Services - Expert care for your vehicle with PPF, ceramic coating, polishing, tinting, and more.
            </p>
          </div>
        </div>

        {/* Useful Links */}
        <div className="flex flex-col md:flex-row  md:gap-24">
          <div>
            <h3 className="font-semibold mb-4 underline">Services</h3>
            <ul className="space-y-1">
              {services.map((service) => (
                <li key={service.href}>
                  <Link
                    href={service.href}
                    className="hover:text-blue-400 transition-colors"
                  >
                    {service.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4 underline">Company</h3>
            <ul className="space-y-1">
              <li>
                <Link href="/about" className="hover:text-blue-400 transition-colors">
                  About
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-blue-400 transition-colors">
                  Contact
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Contact / Social */}
        <div className="flex flex-col gap-2">
          <h3 className="font-semibold mb-4 underline">Contact</h3>
          <a
            href="tel:+1234567890"
            className="flex items-center space-x-2 hover:text-blue-400 transition-colors"
          >
            <Phone size={16} />
            <span>(123) 456-7890</span>
          </a>
          <a
            href="https://wa.me/1234567890"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 hover:text-green-400 transition-colors"
          >
            <MessageCircle size={16} />
            <span>WhatsApp</span>
          </a>
        </div>
      </div>
    </div>
  );
}
