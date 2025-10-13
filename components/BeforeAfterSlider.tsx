// "use client";

// import React, { useRef, useState } from "react";
// import ReactCompareImage from "react-compare-image";
// import { ChevronLeft, ChevronRight } from "lucide-react";


// import { ImgComparisonSlider } from "@img-comparison-slider/react";

// type BeforeAfterProps = {
//   beforeImage: string;
//   afterImage: string;
// };

// export default function BeforeAfter({ beforeImage, afterImage }: BeforeAfterProps) {
//   const [isDragging, setIsDragging] = useState(false);
//   const [dragStartX, setDragStartX] = useState(0);
//   const [isHovered, setIsHovered] = useState(false);
//   const containerRef = useRef<HTMLDivElement>(null);

//   const handleTouchStart = (e: React.TouchEvent) => {
//     const target = e.target as HTMLElement;
//     if (target.closest(".drag-handle")) {
//       setIsDragging(true);
//       setDragStartX(e.touches[0].clientX);
//     }
//   };

//   const handleTouchMove = (e: React.TouchEvent) => {
//     if (!isDragging) return;
//     const diffX = Math.abs(e.touches[0].clientX - dragStartX);
//     if (diffX > 10) e.preventDefault();
//   };

//   const handleMouseMove = (e: React.MouseEvent) => {
//     if (!isDragging) return;
//     const diffX = Math.abs(e.clientX - dragStartX);
//     if (diffX > 10) e.preventDefault();
//   };

//   const stopDragging = () => setIsDragging(false);

//   return (
//     <div
//       className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl group"
//       onMouseEnter={() => setIsHovered(true)}
//       onMouseLeave={() => setIsHovered(false)}
//     >
//       {/* Fade gradient overlay for cinematic depth */}
//       <div className="pointer-events-none absolute inset-0 z-10">
//         <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/70 via-transparent to-transparent"></div>
//         <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
//       </div>

//       {/* BEFORE / AFTER Tags on Image */}
//       <div
//         className={`absolute top-5 left-[5%] md:left-[12%] z-20 text-white text-sm md:text-base font-semibold px-4 py-1 rounded-full backdrop-blur-md bg-black/60 transition-opacity duration-500 ${
//           isHovered ? "opacity-100" : "opacity-80"
//         }`}
//       >
//         BEFORE
//       </div>
//       <div
//         className={`absolute top-5 right-[5%] md:right-[12%] z-20 text-white text-sm md:text-base font-semibold px-4 py-1 rounded-full backdrop-blur-md bg-black/60 transition-opacity duration-500 ${
//           isHovered ? "opacity-100" : "opacity-80"
//         }`}
//       >
//         AFTER
//       </div>

//       <div
//         ref={containerRef}
//         className="max-w-full md:max-w-[80%] mx-auto rounded-2xl overflow-hidden select-none"
//         onTouchStart={handleTouchStart}
//         onTouchMove={handleTouchMove}
//         onTouchEnd={stopDragging}
//         onMouseDown={(e) => {
//           if ((e.target as HTMLElement).closest(".drag-handle")) {
//             setIsDragging(true);
//             setDragStartX(e.clientX);
//           }
//         }}
//         onMouseMove={handleMouseMove}
//         onMouseUp={stopDragging}
//         onMouseLeave={stopDragging}
//       >
//         <ReactCompareImage
//           leftImage={beforeImage}
//           rightImage={afterImage}
//           sliderLineColor="rgba(255,255,255,0.4)"
//           handle={
//             <div
//               className="drag-handle relative flex items-center justify-center 
//               w-10 h-10 z-10 md:w-12 md:h-12 
//               rounded-full bg-gradient-to-b from-gray-800 to-gray-900 
//               border border-gray-500/40 shadow-lg 
//               hover:scale-110 transition-transform duration-300 active:scale-95 cursor-grab"
//             >
//               {/* Glowing pulse ring */}
//               <div className="absolute inset-0 rounded-full bg-blue-500/90 blur-md animate-pulse-slow pointer-events-none"></div>

//               <ChevronLeft className="w-3 h-3 md:w-4 md:h-4 text-white" />
//               <ChevronRight className="w-3 h-3 md:w-4 md:h-4 text-white -ml-1" />
//             </div>
//           }
//         />
//       </div> 
//     </div>
//   );
// }


"use client";

import React, { useRef, useState } from "react";
import ReactCompareImage from "react-compare-image";
import { ChevronLeft, ChevronRight } from "lucide-react";


import { ImgComparisonSlider } from "@img-comparison-slider/react";

type BeforeAfterProps = {
  beforeImage: string;
  afterImage: string;
};

export default function BeforeAfter({ beforeImage, afterImage }: BeforeAfterProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest(".drag-handle")) {
      setIsDragging(true);
      setDragStartX(e.touches[0].clientX);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const diffX = Math.abs(e.touches[0].clientX - dragStartX);
    if (diffX > 10) e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const diffX = Math.abs(e.clientX - dragStartX);
    if (diffX > 10) e.preventDefault();
  };

  const stopDragging = () => setIsDragging(false);

  return (
    <div
      className="relative max-w-5xl mx-auto rounded-2xl overflow-hidden shadow-2xl group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Fade gradient overlay for cinematic depth */}
      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-b from-black/70 via-transparent to-transparent"></div>
        <div className="absolute bottom-0 left-0 w-full h-24 bg-gradient-to-t from-black/70 via-transparent to-transparent"></div>
      </div>

      {/* BEFORE / AFTER Tags on Image */}
      <div
        className={`absolute top-5 left-[5%] md:left-[12%] z-20 text-white text-sm md:text-base font-semibold px-4 py-1 rounded-full backdrop-blur-md bg-black/60 transition-opacity duration-500 ${
          isHovered ? "opacity-100" : "opacity-80"
        }`}
      >
        BEFORE
      </div>
      <div
        className={`absolute top-5 right-[5%] md:right-[12%] z-20 text-white text-sm md:text-base font-semibold px-4 py-1 rounded-full backdrop-blur-md bg-black/60 transition-opacity duration-500 ${
          isHovered ? "opacity-100" : "opacity-80"
        }`}
      >
        AFTER
      </div>

      <div
        ref={containerRef}
        className="max-w-full md:max-w-[80%] mx-auto rounded-2xl overflow-hidden select-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={stopDragging}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest(".drag-handle")) {
            setIsDragging(true);
            setDragStartX(e.clientX);
          }
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={stopDragging}
        onMouseLeave={stopDragging}
      >
        
        <ImgComparisonSlider>
          <img slot="first" src={beforeImage} alt="Before" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
          <img slot="second" src={afterImage} alt="After" style={{ objectFit: "cover", width: "100%", height: "100%" }} />
        </ImgComparisonSlider>
      </div> 

    </div>
  );
}








          