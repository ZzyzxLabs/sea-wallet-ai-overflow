'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

// 定義側邊欄項目
const sidebarItems = [
  { 
    icon: '/icons/dashboard.svg', 
    label: 'Wallet Overview', 
    href: '/dashboard' 
  },
  { 
    icon: '/iconSidebar/smartWill.svg', 
    label: 'SmartWill', 
    href: '/dashboard/SmartWill' 
  },
  { 
    icon: '/icons/market.svg', 
    label: 'Subscriptions', 
    href: '/dashboard/Subscriptions' 
  },
  { 
    icon: '/icons/Defi.svg', 
    label: 'Defi', 
    href: '/dashboard/Defi' 
  },
  { 
    icon: '/icons/settings.svg', 
    label: 'Settings', 
    href: '/dashboard/settings' 
  },
];

// 水波紋動畫效果文字
const generateWaveText = (text: string, progress: number): string => {
  // 將字符轉換為有波浪效果的動畫
  const waveChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const result = Array.from(text).map((char, i) => {
    // 根據進度和字符位置計算是否顯示原字符或動畫字符
    const threshold = progress - (i * 0.1);
    if (threshold < 0) return waveChars[Math.floor(Math.random() * waveChars.length)];
    if (threshold > 1) return char;
    return Math.random() > threshold ? waveChars[Math.floor(Math.random() * waveChars.length)] : char;
  }).join('');
  
  return result;
};

export default function DashboardSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [textProgress, setTextProgress] = useState(0);
  const [animatedLabels, setAnimatedLabels] = useState<string[]>([]);
  const pathname = usePathname();

  // 處理側邊欄展開/收縮
  useEffect(() => {
    if (expanded) {
      // 重置進度
      setTextProgress(0);
      
      // 啟動動畫
      const animation = setInterval(() => {
        setTextProgress(prev => {
          const newProgress = prev + 0.05;
          if (newProgress >= 1.5) {
            clearInterval(animation);
            return 1.5;
          }
          return newProgress;
        });
      }, 16);
      
      return () => clearInterval(animation);
    } else {
      setTextProgress(0);
    }
  }, [expanded]);

  // 生成動畫效果
  useEffect(() => {
    if (expanded && textProgress < 1.5) {
      setAnimatedLabels(sidebarItems.map(item => generateWaveText(item.label, textProgress)));
    }
  }, [expanded, textProgress]);

  // 獲取要顯示的文本
  const getDisplayText = (index: number, originalText: string) => {
    if (!expanded) return '';
    if (textProgress >= 1.5) return originalText;
    return animatedLabels[index] || generateWaveText(originalText, textProgress);
  };

  return (
    <div 
      className={`fixed left-0 top-0 h-full z-20 transition-all duration-300 ${expanded ? 'w-64' : 'w-16'}`}
      style={{
        background: 'linear-gradient(135deg, #0f2027 0%, #203a43 50%, #2c5364 100%)',
        boxShadow: expanded ? '0 0 20px rgba(0, 150, 255, 0.3)' : 'none'
      }}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo 區域 - 海洋主題 */}
      <div className="p-4 flex items-center justify-center h-16 border-b border-opacity-20 border-blue-200">
        <div className="w-8 h-8 relative">
          <Image
            src="/RMBGlogo.png"
            alt="SeaWallet Logo"
            fill
            className="object-contain"
            style={{ filter: 'drop-shadow(0 0 2px rgba(0, 150, 255, 0.8))' }}
          />
        </div>
        <div className="ml-2 font-bold whitespace-nowrap overflow-hidden text-transparent bg-clip-text" 
             style={{ 
               opacity: expanded ? 1 : 0, 
               transition: 'opacity 0.3s',
               backgroundImage: 'linear-gradient(45deg, #00d2ff, #3a7bd5)',
             }}>
          {expanded && 'SeaWallet'}
        </div>
      </div>

      {/* 導航項目 - 水波紋動畫效果 */}
      <nav className="flex-1 mt-4 overflow-y-auto scrollbar-hidden" style={{ maxHeight: 'calc(100vh - 150px)' }}>
        <ul>
          {sidebarItems.map((item, index) => {
            const isActive = pathname === item.href;
            return (
              <li key={item.href} className="mb-2 px-2">
                <Link 
                  href={item.href}
                  className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
                    isActive 
                      ? 'bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-lg' 
                      : 'text-blue-100 hover:bg-blue-800/30'
                  }`}
                  style={{
                    boxShadow: isActive ? '0 4px 10px rgba(0, 150, 255, 0.3)' : 'none'
                  }}
                >
                  <div className="w-6 h-6 relative">
                    <Image
                      src={item.icon}
                      alt={`${item.label} 圖標`}
                      fill
                      className="object-contain"
                      style={{ 
                        filter: isActive 
                          ? 'brightness(1.2) drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))' 
                          : 'brightness(1)'
                      }}
                    />
                  </div>
                  <div className="ml-4 whitespace-nowrap overflow-hidden text-sm font-medium"
                       style={{ 
                         opacity: expanded ? 1 : 0, 
                         transition: 'opacity 0.3s',
                       }}>
                    {expanded && getDisplayText(index, item.label)}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* 底部項目 */}
      <div className="p-4 border-t border-opacity-20 border-blue-200 absolute bottom-0 left-0 right-0">
        <Link 
          href="/dashboard/help"
          className="flex items-center text-blue-100 hover:text-cyan-300 transition-colors duration-200"
        >
          <div className="w-6 h-6 relative">
            <Image
              src="/icons/help.svg"
              alt="幫助圖標"
              fill
              className="object-contain"
            />
          </div>
          <div className="ml-4 whitespace-nowrap overflow-hidden text-sm"
               style={{ opacity: expanded ? 1 : 0, transition: 'opacity 0.3s' }}>
            {expanded && (textProgress >= 1.5 ? '幫助' : generateWaveText('幫助', textProgress))}
          </div>
        </Link>
      </div>
      
      {/* 展開按鈕標記 */}
      {expanded && (
        <div 
          className="absolute right-2 top-1/2 transform -translate-y-1/2 w-6 h-12 flex items-center justify-center opacity-30 hover:opacity-100 transition-opacity duration-200 cursor-pointer"
          onClick={() => setExpanded(false)}
        >
          <div className="w-2 h-2 border-l-2 border-b-2 border-blue-300 transform -rotate-45"></div>
        </div>
      )}
    </div>
  );
}
