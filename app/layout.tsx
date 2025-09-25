
import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { SmokeyCursor } from '@/components/SmokeyCursor';
import { Navigation } from '@/components/Navigation';
import { Suspense } from 'react';
import Loading from './loading'; 
import { ExcelForm } from '@/components/ExcelForm'; 
import FluidSim from '@/components/FluidSim';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Premier Car Services - Professional Auto Care',
  description: 'Professional car services including PPF, ceramic coating, polishing, tinting, and more. Expert care for your vehicle.',
};


export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">



      <body  >
 

        {/* <SmokeyCursor />  */}

        <FluidSim />



        <Navigation />

        {/* <ExcelForm />  */}


        <Suspense fallback={<Loading />}>
          {children} 
        </Suspense>


 



      </body>
    </html>
  );
}