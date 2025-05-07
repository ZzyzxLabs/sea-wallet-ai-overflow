'use client';

import { useState, useEffect } from 'react';

export default function DashboardFooter() {
  const [currentTime, setCurrentTime] = useState('');
  
  // 每秒更新時間
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, '0');
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const seconds = now.getSeconds().toString().padStart(2, '0');
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };
    
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);
  
  return (
    <footer className="relative overflow-hidden">
      {/* 波浪動畫背景 */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-cyan-300"></div>
        <div className="absolute inset-0 bg-[url('/oceanew.gif')] bg-repeat-x bg-top animate-wave"></div>
      </div>
      
      {/* 內容 */}
      <div className="relative p-5 backdrop-blur-sm bg-gradient-to-b from-blue-50/80 to-white">
        <div className="flex justify-between flex-wrap">
          <div className="flex space-x-6 mb-2">
            <a href="#" className="text-blue-700 hover:text-blue-500 transition-colors duration-200 text-sm">服務條款</a>
            <a href="#" className="text-blue-700 hover:text-blue-500 transition-colors duration-200 text-sm">隱私政策</a>
            <a href="#" className="text-blue-700 hover:text-blue-500 transition-colors duration-200 text-sm">支援</a>
          </div>
          
          <div className="text-sm text-blue-600/90 bg-blue-50 px-3 py-1 rounded-full shadow-sm">
            {currentTime} UTC+8
          </div>
        </div>
        
        <div className="mt-2 text-gray-500 text-sm flex items-center justify-center">
          <span className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent flex-grow mr-4"></span>
          <div>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 font-medium">© {new Date().getFullYear()} SeaWallet</span> <span>Copyright Reserved</span>
          </div>
          <span className="h-px bg-gradient-to-r from-transparent via-blue-200 to-transparent flex-grow ml-4"></span>
        </div>
      </div>
    </footer>
  );
}