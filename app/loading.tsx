"use client"
// app/components/Loading.tsx
import Lottie from "lottie-react";
import carAnimation from "./carr.json";


export default function Loading() {
    return (
        <div className="fixed z-100 inset-0 flex items-center justify-center bg-black/50 z-50">
            {/* <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin"></div> */}

            <Lottie
                animationData={carAnimation}
                loop={true}
                autoplay={true}
                style={{ height: 300, width: 300 }}
            />
            
        </div>
    );
}
