// app/dashboard/components/DashboardSidebar.tsx
'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

// 定義側邊欄項目
const sidebarItems = [
  { 
    icon: '/icons/dashboard.svg', 
    label: '儀表板首頁', 
    href: '/dashboard' 
  },
  { 
    icon: '/iconSidebar/smartWill.svg', 
    label: 'SmartWill', 
    href: '/dashboard/analytics' 
  },
  { 
    icon: '/icons/market.svg', 
    label: 'NFT 市場', 
    href: '/dashboard/market' 
  },
  { 
    icon: '/icons/collections.svg', 
    label: '我的收藏', 
    href: '/dashboard/collections' 
  },
  { 
    icon: '/icons/settings.svg', 
    label: '設定', 
    href: '/dashboard/settings' 
  },
];

// 亂碼生成函數
const generateScrambledText = (text: string): string => {
  const chars = '!@#$%^&*()_+{}:"<>?|[];,./';
  return Array.from({ length: text.length })
    .map(() => chars[Math.floor(Math.random() * chars.length)])
    .join('');
};

export default function DashboardSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [textState, setTextState] = useState<'hidden' | 'scrambled' | 'visible'>('hidden');
  const [scrambledLabels, setScrambledLabels] = useState<string[]>([]);
  const pathname = usePathname();

  // 處理側邊欄展開/收縮
  useEffect(() => {
    if (expanded) {
      // 先顯示亂碼
      setTextState('scrambled');
      const initialScrambled = sidebarItems.map(item => generateScrambledText(item.label));
      setScrambledLabels(initialScrambled);
      
      // 設置延遲顯示真實文字
      const timer = setTimeout(() => {
        setTextState('visible');
      }, 300);
      
      return () => clearTimeout(timer);
    } else {
      setTextState('hidden');
    }
  }, [expanded]);

  // 生成亂碼動畫效果
  useEffect(() => {
    if (textState === 'scrambled') {
      const interval = setInterval(() => {
        const newScrambled = sidebarItems.map(item => generateScrambledText(item.label));
        setScrambledLabels(newScrambled);
      }, 50);
      
      return () => clearInterval(interval);
    }
  }, [textState]);

  // 確定要顯示的文本
  const getDisplayText = (index: number, originalText: string) => {
    if (textState === 'hidden') return '';
    if (textState === 'scrambled') return scrambledLabels[index] || generateScrambledText(originalText);
    return originalText;
  };

  return (
    <div 
      className={`bg-gray-900 text-white transition-all duration-300 flex flex-col ${expanded ? 'w-64' : 'w-16'}`}
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
    >
      {/* Logo 區域 - 不使用亂碼效果 */}
      <div className="p-4 flex items-center justify-center h-16">
        <div className="w-8 h-8 relative">
          <Image
            src="/RMBGlogo.png"
            alt="SeaWallet Logo"
            fill
            className="object-contain"
          />
        </div>
        <div className="ml-2 font-bold whitespace-nowrap overflow-hidden" 
             style={{ opacity: expanded ? 1 : 0, transition: 'opacity 0.3s' }}>
          {expanded && 'SeaWallet'}
        </div>
      </div>

      {/* 導航項目 - 使用亂碼效果 */}
      <nav className="flex-1">
        <ul>
          {sidebarItems.map((item, index) => (
            <li key={item.href}>
              <Link 
                href={item.href}
                className={`flex items-center p-4 hover:bg-gray-800 ${
                  pathname === item.href ? 'bg-blue-600' : ''
                }`}
              >
                <div className="w-6 h-6 relative">
                  <Image
                    src={item.icon}
                    alt={`${item.label} 圖標`}
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="ml-4 whitespace-nowrap overflow-hidden"
                     style={{ opacity: expanded ? 1 : 0, transition: 'opacity 0.3s' }}>
                  {expanded && getDisplayText(index, item.label)}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* 底部項目 - 使用亂碼效果 */}
      <div className="p-4 border-t border-gray-800">
        <Link 
          href="/dashboard/help"
          className="flex items-center hover:text-blue-400"
        >
          <div className="w-6 h-6 relative">
            <Image
              src="/icons/help.svg"
              alt="幫助圖標"
              fill
              className="object-contain"
            />
          </div>
          <div className="ml-4 whitespace-nowrap overflow-hidden"
               style={{ opacity: expanded ? 1 : 0, transition: 'opacity 0.3s' }}>
            {expanded && (textState === 'visible' ? '幫助' : generateScrambledText('幫助'))}
          </div>
        </Link>
      </div>
    </div>
  );
}