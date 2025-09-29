export default function AboutPage() {
  return (
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
  );
}
