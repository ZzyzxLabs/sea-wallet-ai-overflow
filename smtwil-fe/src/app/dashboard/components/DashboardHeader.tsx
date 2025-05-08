'use client';

import { useState, useEffect } from 'react';
import { ConnectButton } from "@mysten/dapp-kit";

export default function DashboardHeader() {
  const [scrolled, setScrolled] = useState(false);
  
  // 檢測滾動效果
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header 
      className={`sticky top-0 z-10 flex items-center justify-between px-6 py-3 transition-all duration-300 ${
        scrolled 
          ? 'bg-gray-500 backdrop-blur-md shadow-md' 
          : 'bg-primary backdrop-blur-sm'
      }`}
      style={{
        borderBottom: scrolled 
          ? '1px solid rgba(200, 230, 255, 0.5)' 
          : '1px solid rgba(200, 230, 255, 0.2)',
      }}
    >
      <div className="flex items-center">
        {/* <div className="relative group">
          <input
            type="text"
            placeholder="搜尋服務..."
            className="border border-blue-100 rounded-full px-4 py-2 pl-10 w-64 bg-blue-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all duration-300"
            style={{
              boxShadow: '0 2px 8px rgba(0, 120, 255, 0.1)'
            }}
          />
          <span className="absolute left-3 top-2.5 text-blue-400 transition-all duration-300 group-hover:text-blue-600">🔍</span>
           */}
          {/* 搜尋框底部的波浪漸層裝飾 */}
          {/* <div className="absolute -bottom-1 left-0 w-full h-1 overflow-hidden rounded-b-full opacity-80">
            <div className="h-full w-full bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 animate-pulse"></div>
          </div>
        </div> */}
      </div>
      
      <div className="flex items-center space-x-4">
        {/* 自定義 ConnectButton 樣式 */}
        <div className="overflow-hidden rounded-full ">
          <ConnectButton />
        </div>
      </div>
    </header>
  );
}