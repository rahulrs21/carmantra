"use client";

import React from "react";
import ReactCompareImage from "react-compare-image";
import { ChevronLeft, ChevronRight } from "lucide-react";

type BeforeAfterProps = {
  beforeImage: string;
  afterImage: string;
};

export default function BeforeAfter({ beforeImage, afterImage }: BeforeAfterProps) {
  return (
    <div className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl">
      {/* Smooth fade overlay on all sides */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/70 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 w-24 h-full bg-gradient-to-r from-black/70 via-transparent to-transparent"></div>
        <div className="absolute top-0 right-0 w-24 h-full bg-gradient-to-l from-black/70 via-transparent to-transparent"></div>
      </div>

      <div className="max-w-[80%] mx-auto rounded-2xl overflow-hidden">
        <ReactCompareImage
          leftImage={beforeImage}
          rightImage={afterImage}
          sliderLineColor="rgba(255,255,255,0.4)"
          handle={
            <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-b from-gray-800 to-gray-900 border border-gray-500/40 shadow-lg hover:scale-110 transition-transform duration-300">
              {/* Glowing pulse ring */}
              <div className="absolute inset-0 rounded-full bg-blue-500/90 blur-md animate-pulse-slow"></div>

              <ChevronLeft className="w-4 h-4 text-white" />
              <ChevronRight className="w-4 h-4 text-white -ml-1" />
            </div>
          }
        />
      </div>


 

    </div>
  );
}
