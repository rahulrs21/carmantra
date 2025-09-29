"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import "swiper/css/navigation";
import { AnimatedSection } from "./AnimatedSection";

// Sample images – replace with your real work URLs
const works = [
  "https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/337909/pexels-photo-337909.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/20296997/pexels-photo-20296997.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=1200",
  "https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=1200",
];

export default function OurWorksSlider() {
  return (
    <section className="max-w-7xl mx-auto">
      <AnimatedSection className="text-center mb-16">
        <h2 className="text-4xl font-bold mb-4">Our Works</h2>
        <p className="text-xl max-w-3xl mx-auto">
          Comprehensive automotive care solutions designed to keep your vehicle in pristine condition
        </p>
      </AnimatedSection>

      <div className="relative max-w-6xl mx-auto px-4">
        <Swiper
          modules={[Autoplay, Navigation]}
          slidesPerView={1.2} // Bigger images
          spaceBetween={24}
          autoplay={{ delay: 3000, disableOnInteraction: false }}
          grabCursor
          navigation={{
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
          }}
          breakpoints={{
            640: { slidesPerView: 1.2 }, //2.2
            1024: { slidesPerView: 3.2 }, //3.2
          }}
        >
          {works.map((src, idx) => (
            <SwiperSlide key={idx}>
              <div className="relative w-full aspect-[9/16] overflow-hidden rounded-2xl shadow-xl">
                <img
                  src={src}
                  alt={`Work ${idx + 1}`}
                  className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                />
              </div>
            </SwiperSlide>
          ))}
        </Swiper>

        {/* Custom Navigation Buttons */}
        <button  className="swiper-button-prev absolute left-0 top-1/2 -translate-y-1/2 bg-gray-900/70 text-white p-3 rounded-full hover:bg-gray-900 transition z-10">
          ❮
        </button>
        <button className="swiper-button-next absolute right-0 top-1/2 -translate-y-1/2 bg-gray-900/70 text-white p-3 rounded-full hover:bg-gray-900 transition z-10">
          ❯
        </button>
      </div>
    </section>
  );
}
