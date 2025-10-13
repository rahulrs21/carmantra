"use client";

import React, { useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";

export default function SchedulePage(): JSX.Element {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [confirmed, setConfirmed] = useState(false);


  

  const handleSubmit = (): void => {



    if (!selectedDate) {
      alert("Please select a date and time first.");
      return;
    }


    const now = new Date();

    // Check if selected date & time is in the future
    if (selectedDate.getTime() <= now.getTime()) {
      alert("Please select a future date and time.");
      return;
    }


    if(selectedDate.getDay() === 0){
      alert("Please select a weekday (Monday to Friday).");
      return;
    }


    setConfirmed(true);
  };

  // Disable past times for today
  const filterTime = (time: Date): boolean => {
    const now = new Date();
    const hours = time.getHours();
    const day = time.getDay() 


    // Restrict hours between 9 AM and 9 PM
    if (hours < 9 || hours > 21) return false;

    // Disable weekends SUNDAY 
    if (day === 0 ) return false;

    // If selected date is today
    if (
      selectedDate &&
      selectedDate.getFullYear() === now.getFullYear() &&
      selectedDate.getMonth() === now.getMonth() &&
      selectedDate.getDate() === now.getDate()
    ) {
      return time.getTime() > now.getTime(); // Only future times
    }

    return true; // All times enabled for other days
  };

  return (


    <div>
      <section className="relative pt-40 min-h-screen bg-gray-800 dark:bg-gray-900 py-16 px-6 md:px-12 lg:px-24 transition-colors duration-300">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 items-center">

          {/* Left Side - Image */}
          <div className="relative">
            <img
              src="https://images.pexels.com/photos/120049/pexels-photo-120049.jpeg"
              alt="About Us"
              className="rounded-2xl shadow-xl w-full object-cover"
            />
          </div>

          {/* Right Side - Text */}
          <div>
            <h1 className="text-4xl md:text-5xl font-bold  text-gray-100 dark:text-white mb-6">
              About Us
            </h1>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              We are a team of passionate professionals dedicated to delivering
              outstanding services with <span className="font-semibold text-blue-700 dark:text-blue-400">quality</span>,
              <span className="font-semibold text-blue-700 dark:text-blue-400"> innovation</span>,
              and <span className="font-semibold text-blue-700 dark:text-blue-400">customer satisfaction</span>
              at the core of everything we do.
            </p>
            <p className="text-lg text-gray-200 leading-relaxed mb-6">
              Our mission is to provide tailored solutions for businesses of all
              sizes, ensuring measurable impact and long-term success. With years
              of expertise, we strive to be your trusted growth partner.
            </p>
            <a
              href="/#service_main"
              className="inline-block bg-blue-700 dark:bg-blue-600 text-white px-6 py-3 rounded-lg shadow hover:bg-blue-800 dark:hover:bg-blue-500 transition"
            >
              Explore Services
            </a>
          </div>
        </div>

        {/* Mission & Vision Section */}
        <div className="max-w-7xl mx-auto mt-20 grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-4">Our Mission</h2>
            <p className="text-gray-800 dark:text-white leading-relaxed">
              To deliver impactful, innovative, and sustainable solutions that empower
              businesses to achieve their goals and exceed expectations.
              Lorem ipsum dolor, sit amet consectetur adipisicing elit. Ducimus ullam voluptas eveniet dicta necessitatibus asperiores ipsam corrupti, sapiente facilis obcaecati.
            </p>
          </div>

          <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-md">
            <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-4">Our Vision</h2>
            <p className="text-gray-800 dark:text-white leading-relaxed">
              To be recognized as a trusted global partner, known for transforming
              businesses through creativity, technology, and unmatched expertise.
              Lorem ipsum dolor sit amet consectetur adipisicing elit. Quas vero veritatis ad eligendi quisquam consequuntur quo ullam sit mollitia qui!
            </p>
          </div>
        </div>
      </section>



      {/* Date time Picker */}

      {/* <div className="flex items-center justify-center py-12 bg-gray-50 px-4">
        <div className="bg-white shadow-xl rounded-2xl p-8 w-full max-w-md">
          <h1 className="text-2xl font-semibold text-gray-800 mb-6 text-center">
            Book Your Appointment
          </h1>

          <label className="block text-gray-700 font-medium mb-2">
            Pick a Date & Time
          </label>

          <div className="relative mb-6 w-full">
            <div className="absolute z-10 left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <Calendar className="h-5 w-5" />
            </div>

            <DatePicker
              selected={selectedDate}
              onChange={(date: Date | null) => {
                setSelectedDate(date);
                setConfirmed(false);
              }}
              showTimeSelect
              timeIntervals={30} // 30-min slots
              minDate={new Date()} // disable past dates
              filterTime={filterTime} // disable past times
              dateFormat="EEEE, MMMM d, yyyy • h:mm aa"
              placeholderText="Select date and time"
              className="w-full border border-gray-300 rounded-xl py-3 pl-10 pr-4 text-gray-700
                        focus:ring-4 focus:ring-blue-100 focus:border-blue-500 outline-none
                        shadow-sm hover:shadow-md transition-all duration-200 bg-white placeholder-gray-400 text-base"
              popperClassName="shadow-lg border border-gray-200 rounded-xl overflow-hidden"
              renderCustomHeader={({
                date,
                decreaseMonth,
                increaseMonth,
                prevMonthButtonDisabled,
                nextMonthButtonDisabled,
              }) => (
                <div className="flex items-center justify-between px-4 py-2 bg-blue-50 rounded-t-xl">
                  <button
                    onClick={decreaseMonth}
                    disabled={prevMonthButtonDisabled}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <span className="font-medium text-gray-800">
                    {date.toLocaleString("default", { month: "long", year: "numeric" })}
                  </span>
                  <button
                    onClick={increaseMonth}
                    disabled={nextMonthButtonDisabled}
                    className="text-gray-600 hover:text-blue-600 transition-colors"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              )}
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 rounded-lg shadow-md transition-all"
          >
            Confirm Date & Time
          </button>

          {confirmed && selectedDate && (
            <div className="mt-6 bg-green-50 border border-green-200 text-green-800 rounded-lg p-4 text-center shadow-sm animate-fadeIn">
              <p className="font-medium">Your date and time is confirmed:</p>
              <p className="text-lg font-semibold mt-1">
                {selectedDate.toLocaleString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>

        <style jsx global>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: translateY(8px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          .animate-fadeIn {
            animation: fadeIn 0.4s ease-in-out;
          }

          .react-datepicker-wrapper,
          .react-datepicker__input-container {
            width: 100%;
            display: block;
          }

          .react-datepicker__day--selected,
          .react-datepicker__day--keyboard-selected {
            background-color: #3b82f6 !important;
            color: white !important;
            border-radius: 0.5rem;
          }

          .react-datepicker__day:hover {
            background-color: #bfdbfe !important;
            border-radius: 0.5rem;
          }

          .react-datepicker {
            border: none;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
            border-radius: 0.75rem;
          }

          .react-datepicker__header {
            background-color: #f0f9ff;
            border-bottom: none;
            border-top-left-radius: 0.75rem;
            border-top-right-radius: 0.75rem;
          }
        `}</style>
      </div> */}
    </div>
  );
}










