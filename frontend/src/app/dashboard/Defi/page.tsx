"use client";

import { motion } from "framer-motion";
import Image from "next/image";

export default function ToBeContinued() {
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-cyan-50 p-4'>
      <div className='bg-white p-8 rounded-lg shadow-lg w-full max-w-3xl text-center'>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5 }}
          className='mb-8'
        >
          <div className='w-32 h-32 mx-auto relative mb-6'>
            <Image
              src='/RMBGlogo.png'
              alt='SeaWallet Logo'
              fill
              className='object-contain'
            />
          </div>
          <h1 className='text-4xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-cyan-500 text-transparent bg-clip-text'>
            Coming Soon
          </h1>
          <p className='text-gray-600 text-lg mb-6'>
            We&apos;re working on something amazing!
          </p>
          <div className='w-24 h-1 bg-gradient-to-r from-blue-500 to-cyan-400 mx-auto rounded-full mb-8' />
        </motion.div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className='space-y-6'
        >
          <div className='p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg border border-blue-100'>
            <h2 className='text-2xl font-semibold text-blue-800 mb-3'>
              Feature in Development
            </h2>
            <p className='text-gray-600'>
              Our team is working hard to bring you new features and
              improvements. Stay tuned for updates!
            </p>
          </div>

          <div className='flex justify-center space-x-4'>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300'
              onClick={() => window.history.back()}
            >
              Go Back
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className='px-6 py-3 bg-gradient-to-r from-blue-400 to-cyan-400 text-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300'
              onClick={() => (window.location.href = "/dashboard")}
            >
              Return to Dashboard
            </motion.button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
