// 'use client';

// import { useState, useEffect } from 'react';
// import { Button } from '@/components/ui/button';
// import { motion, AnimatePresence } from 'framer-motion';

// interface MultiStepFormProps {
//   selectedService: string;
// }

// export default function MultiStepForm({ selectedService }: MultiStepFormProps) {
//   const [step, setStep] = useState<number>(1);
//   const [formData, setFormData] = useState({
//     name: '',
//     phone: '',
//     service: selectedService || '',
//   });

//   useEffect(() => {
//     if (selectedService) {
//       setFormData((prev) => ({ ...prev, service: selectedService }));
//       setStep(1); // always start at step 1 for input
//     }
//   }, [selectedService]);

//   const handleNext = () => setStep((prev) => prev + 1);
//   const handlePrev = () => setStep((prev) => prev - 1);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (!formData.name || !formData.phone) {
//       alert('Please fill your Name and Phone Number!');
//       return;
//     }
//     alert(
//       `Form Submitted!\nName: ${formData.name}\nPhone: ${formData.phone}\nService: ${formData.service}`
//     );
//     setFormData({ name: '', phone: '', service: '' });
//     setStep(1);
//   };

//   const stepVariants = {
//     initial: { opacity: 0, x: 50 },
//     animate: { opacity: 1, x: 0 },
//     exit: { opacity: 0, x: -50 },
//   };

//   return (
//     <form
//       onSubmit={handleSubmit}
//       className="bg-white text-gray-900 rounded-lg p-6 shadow-lg overflow-hidden relative"
//     >
//       {/* Step Indicator */}
//       <div className="flex justify-between mb-6">
//         {[1, 2, 3].map((s) => (
//           <div
//             key={s}
//             className={`flex-1 h-2 mx-1 rounded-full transition-colors duration-300 ${
//               step >= s ? 'bg-blue-600' : 'bg-gray-300'
//             }`}
//           />
//         ))}
//       </div>

//       <AnimatePresence mode="wait">
//         {/* Step 1: Name */}
//         {step === 1 && (
//           <motion.div
//             key="step1"
//             variants={stepVariants}
//             initial="initial"
//             animate="animate"
//             exit="exit"
//             transition={{ duration: 0.3 }}
//             className="space-y-4"
//           >
//             <label className="block font-semibold">Your Name</label>
//             <input
//               type="text"
//               value={formData.name}
//               onChange={(e) => setFormData({ ...formData, name: e.target.value })}
//               className="w-full p-3 border rounded-lg"
//               placeholder="Enter your name"
//               required
//             />
//             <div className="flex justify-end">
//               <Button type="button" onClick={handleNext}>
//                 Next
//               </Button>
//             </div>
//           </motion.div>
//         )}

//         {/* Step 2: Phone */}
//         {step === 2 && (
//           <motion.div
//             key="step2"
//             variants={stepVariants}
//             initial="initial"
//             animate="animate"
//             exit="exit"
//             transition={{ duration: 0.3 }}
//             className="space-y-4"
//           >
//             <label className="block font-semibold">Phone Number</label>
//             <input
//               type="text"
//               value={formData.phone}
//               onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
//               className="w-full p-3 border rounded-lg"
//               placeholder="Enter your phone number"
//               required
//             />
//             <div className="flex justify-between">
//               <Button type="button" onClick={handlePrev}>
//                 Back
//               </Button>
//               <Button type="button" onClick={handleNext}>
//                 Next
//               </Button>
//             </div>
//           </motion.div>
//         )}

//         {/* Step 3: Service */}
//         {step === 3 && (
//           <motion.div
//             key="step3"
//             variants={stepVariants}
//             initial="initial"
//             animate="animate"
//             exit="exit"
//             transition={{ duration: 0.3 }}
//             className="space-y-4"
//           >
//             <label className="block font-semibold">Selected Service</label>
//             <input
//               type="text"
//               value={formData.service}
//               readOnly
//               className="w-full p-3 border rounded-lg bg-gray-100"
//             />
//             <div className="flex justify-between">
//               <Button type="button" onClick={handlePrev}>
//                 Back
//               </Button>
//               <Button type="submit">Submit</Button>
//             </div>
//           </motion.div>
//         )}
//       </AnimatePresence>
//     </form>
//   );
// }


'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface MultiStepFormProps {
  selectedService: string;
  focusStep?: number;
}

export default function MultiStepForm({ selectedService, focusStep = 1 }: MultiStepFormProps) {
  const [step, setStep] = useState<number>(focusStep);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    service: selectedService || '',
  });

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedService) {
      setFormData((prev) => ({ ...prev, service: selectedService }));
      setStep(1); // always start at Step 1 (Name)
    }
  }, [selectedService]);

  useEffect(() => {
    if (step === 1) nameInputRef.current?.focus();
    if (step === 2) phoneInputRef.current?.focus();
  }, [step]);

  const handleNext = () => setStep((prev) => prev + 1);
  const handlePrev = () => setStep((prev) => prev - 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone) {
      alert('Please fill your Name and Phone Number!');
      return;
    }
    alert(
      `Form Submitted!\nName: ${formData.name}\nPhone: ${formData.phone}\nService: ${formData.service}`
    );
    setFormData({ name: '', phone: '', service: '' });
    setStep(1);
  };

  const stepVariants = {
    initial: { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -50 },
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white text-gray-900 rounded-lg p-6 shadow-lg overflow-hidden relative"
    >
      {/* Step Indicator */}
      <div className="flex justify-between mb-6">
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            className={`flex-1 h-2 mx-1 rounded-full transition-colors duration-300 ${
              step >= s ? 'bg-blue-600' : 'bg-gray-300'
            }`}
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Step 1: Name */}
        {step === 1 && (
          <motion.div
            key="step1"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <label className="block font-semibold">Your Name</label>
            <input
              ref={nameInputRef}
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full p-3 border rounded-lg"
              placeholder="Enter your name"
              required
            />
            <div className="flex justify-end">
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Phone */}
        {step === 2 && (
          <motion.div
            key="step2"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <label className="block font-semibold">Phone Number</label>
            <input
              ref={phoneInputRef}
              type="text"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full p-3 border rounded-lg"
              placeholder="Enter your phone number"
              required
            />
            <div className="flex justify-between">
              <Button type="button" onClick={handlePrev}>
                Back
              </Button>
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 3: Service */}
        {step === 3 && (
          <motion.div
            key="step3"
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={{ duration: 0.3 }}
            className="space-y-4"
          >
            <label className="block font-semibold">Selected Service</label>
            <input
              type="text"
              value={formData.service}
              readOnly
              className="w-full p-3 border rounded-lg bg-gray-100"
            />
            <div className="flex justify-between">
              <Button type="button" onClick={handlePrev}>
                Back
              </Button>
              <Button type="submit">Submit</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
}

