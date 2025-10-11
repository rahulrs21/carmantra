"use client";

import { useEffect, useState } from "react";

export default function WelcomeBack() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem("visitedBefore");

    if (visited) {
      setShow(true); // Returning visitor
      setTimeout(() => setShow(false), 3000); // Auto-hide after 3 seconds
    } else {
      localStorage.setItem("visitedBefore", "true"); // First visit
    }
  }, [5000]);

  if (!show) return null;

  return (
    <div className="fixed z-50 bottom-6 mx-2 rounded-2xl bg-black text-white shadow-lg p-4 animate-bounce">

      <div className="flex items-start">

        <span role="img" aria-label="wave">👋</span>
        <div className="flex-1">
          <p className="font-semibold">Welcome back!</p>
          <p className="text-sm">We’re happy to see you again.</p>
        </div>
        <button
          onClick={() => setShow(false)}
          className="ml-2 text-white/70 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
