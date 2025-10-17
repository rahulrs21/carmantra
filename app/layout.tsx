import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Navigation } from '@/components/Navigation';
import { Suspense } from 'react';
import Loading from './loading';
import FluidSmoke from '@/components/FluidSmoke';
import { RouteLoader } from '@/components/RouteLoader';  // ✅ custom wrapper
import Footer from '@/components/Footer';
import Prefooter from '@/components/PreFooter';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Premier Car Services - Professional Auto Care',
  description:
    'Professional car services including PPF, ceramic coating, polishing, tinting, and more. Expert care for your vehicle.',
  icons: {
    icon: '/images/CarMantraLogoIcon.png',       // Default icon
    shortcut: '/images/CarMantraLogoIcon.png',         
    apple: '/images/CarMantraLogoIcon.png',
  },
  keywords: [
    'car services',
    'auto care',
    'PPF',
    'ceramic coating',
    'car polishing',
    'window tinting',
    'vehicle detailing',
    'paint protection film',
    'automotive services',
    'car maintenance',
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body>
        {/* ✅ Top Navigation */}
        <Navigation />

        {/* ✅ Fluid background effect */}
        <FluidSmoke />

        {/* ✅ Wrap children with Suspense + RouteLoader */}
        <Suspense fallback={<Loading />}>
          <RouteLoader>{children}</RouteLoader>
        </Suspense>


        <Prefooter />


        {/* Footer */}
        <Footer />
      </body>
    </html>
  );
}
