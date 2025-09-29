"use client" 
import Lottie from "lottie-react";
import carAnimation from "./carr.json";


export default function Loading() {
    return (
        <div className="relative min-h-screen">

            <div className="fixed z-100 inset-0 flex items-center justify-center bg-white ">
                 

                <Lottie
                    animationData={carAnimation}
                    loop={true}
                    autoplay={true}
                    style={{ height: 300, width: 300 }}
                />
                
            </div>
        </div>
    );
}
