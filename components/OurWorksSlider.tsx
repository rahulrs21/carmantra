"use client";

import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/autoplay";
import { AnimatedSection } from "./AnimatedSection";

// Sample images – replace with your real work URLs
const works = [
    "https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/337909/pexels-photo-337909.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/20296997/pexels-photo-20296997.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/164634/pexels-photo-164634.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/337909/pexels-photo-337909.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/1545743/pexels-photo-1545743.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/20296997/pexels-photo-20296997.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=600",
    "https://images.pexels.com/photos/112460/pexels-photo-112460.jpeg?auto=compress&cs=tinysrgb&w=600",
];

export default function OurWorksSlider() {
    return (
        <section className="max-w-7xl mx-auto ">

            <AnimatedSection className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">Our Works</h2>
                <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                    Comprehensive automotive care solutions designed to keep your vehicle in pristine condition
                </p>
            </AnimatedSection>

            <div className="max-w-6xl mx-auto px-4">
                <Swiper
                    modules={[Autoplay]}
                    slidesPerView={2.2}           // shows ~2 full + partial next
                    spaceBetween={16}
                    autoplay={{ delay: 2500, disableOnInteraction: false }}
                    grabCursor
                    breakpoints={{
                        640: { slidesPerView: 3.2 },
                        1024: { slidesPerView: 4.2 },
                    }}
                >
                    {works.map((src, idx) => (
                        <SwiperSlide key={idx}>
                            <div className="relative w-full aspect-[3/4] overflow-hidden rounded-2xl shadow-lg">
                                <img
                                    src={src}
                                    alt={`Work ${idx + 1}`}
                                    className="w-full h-full object-cover transition-transform duration-500 hover:scale-110"
                                />
                            </div>
                        </SwiperSlide>
                    ))}
                </Swiper>
            </div>
        </section>
    );
}
