"use client";

import Link from "next/link";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black text-white py-6 ">
      <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
        <p className="text-sm">&copy; {currentYear} Premier Car Services. All rights reserved.</p>
        <p className="text-sm mt-2 md:mt-0">
          Made with ❤️ by{" "}
          <Link
            href="https://rahuldxb.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-500 underline"
          >
            Rahul
          </Link>
        </p>
      </div>
    </footer>
  );
}
