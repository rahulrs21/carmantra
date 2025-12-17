"use client" 
import { useEffect } from "react";
import Lottie from "lottie-react";
import carAnimation from "./carr.json";


export default function Loading() {
    useEffect(() => {
        // Disable scrolling when component mounts
        document.body.style.overflow = 'hidden';
        
        // Re-enable scrolling when component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    return (
        <div className="relative min-h-screen">

            <div className="fixed z-100 inset-0 flex items-center justify-center bg-white ">
                <Lottie
                    animationData={carAnimation}
                    loop={true}
                    autoplay={true}
                    rendererSettings={{
                        preserveAspectRatio: 'xMidYMid slice',
                        progressiveLoad: true
                    }}
                    style={{ height: 200, width: 200 }}
                />
                
            </div>
        </div>
    );
}
