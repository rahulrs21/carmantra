"use client";

import { Star } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";

export default function GoogleReviewBadge() {
    return (
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="relative z-50 flex justify-center mt-6 animate-fade-in-up"
        >
            <Link
                href="https://g.page/r/CQjSKNsh2jUlEAI/review" // 🔗 replace with your Google Reviews link
                target="_blank"
                rel="noopener noreferrer"
                className="relative flex items-center bg-white/80 hover:bg-white shadow-xl rounded-full px-4 py-2 border border-gray-200 hover:scale-105 hover:shadow-2xl transition-transform duration-300"
            >

                <Image
                    src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/c1/Google_%22G%22_logo.svg/1200px-Google_%22G%22_logo.svg.png" // 🟢 Add a small Google logo (20x20)
                    alt="Google"
                    width={40}
                    height={40}
                />



                <div className="flex flex-col items-start ml-2">

                    {/* Star icons */}
                    <div className="flex items-center justify-end">
                        
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className="w-4 h-4 text-yellow-400 fill-yellow-400 "
                            />
                        ))}

                        {/* Pulse effect */}
                        <motion.div
                            animate={{ scale: [1, 1.15, 1] }}
                            transition={{
                                duration: 1.8,
                                repeat: Infinity,
                                ease: "easeInOut",
                            }}
                            className="ml-2 w-2.5 h-2.5 bg-green-500 rounded-full"
                        />
                    </div>

                    {/* Text */}
                    <div className="text-sm font-semibold text-gray-800">
                        5-Star Google Reviews
                    </div>






                </div>


                {/* ✨ Rays effect */}
                <span className="absolute rounded-full inset-0 w-full h-full overflow-hidden">
                    <span className="absolute z-0 -inset-y-1 -inset-x-1 bg-gradient-to-r from-transparent via-white/40 to-transparent 
      translate-x-[-100%] animate-shine" />
                </span>





            </Link>
        </motion.div>
    );
}
