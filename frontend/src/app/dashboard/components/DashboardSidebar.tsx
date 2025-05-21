'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';

// 擴展側邊欄項目，為 Subscriptions 添加子選單
const sidebarItems = [
  { 
    icon: '/iconSidebar/RMBGwalletOverview.png', 
    label: 'Wallet Overview', 
    href: '/dashboard' 
  },
  { 
    icon: '/iconSidebar/RMBGSmartWillwhite.png', 
    label: 'Smart Will', 
    href: '/dashboard/SmartWill' ,
    submenu: [
      { label: 'Will & Digital Assets', href: '/dashboard/SmartWill' },
      { label: 'Legacy Inheritance', href: '/dashboard/SmartWill/heir' },
      { label: 'Legacy', href: '/dashboard/more/legacy' },
    ]
  },
  { 
    icon: '/iconSidebar/RMBGsubscription.png', 
    label: 'Subscriptions', 
    href: '/dashboard/Subscriptions',
    submenu: [
      { label: 'My Subscriptions', href: '/dashboard/Subscriptions/subscription' },
      { label: 'Create Service & Management', href: '/dashboard/Subscriptions/subscriber' },
    ]
  },
  { 
    icon: '/iconSidebar/RMBGdefi.png', 
    label: 'Defi', 
    href: '/dashboard/Defi' 
  },
  { 
    icon: '/iconSidebar/RMBGsetting.png', 
    label: 'Settings', 
    href: '/dashboard/settings' 
  },
  // {
  //   icon: '/iconSidebar/RMBGhelp.png',
  //   label: 'More',
  //   href: '/dashboard/more',
  //   // submenu: [
  //   //   { label: 'legacy', href: '/dashboard/more/legacy' },
  //   // ]
  // }
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
  const [openSubmenu, setOpenSubmenu] = useState<number | null>(null);
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
      setOpenSubmenu(null); // 收縮時關閉所有子選單
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

  // 切換子選單狀態
  const toggleSubmenu = (index: number, event: React.MouseEvent) => {
    event.preventDefault(); // 阻止連結的默認行為
    setOpenSubmenu(openSubmenu === index ? null : index);
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
        <div className="w-10 h-10 relative">
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
        const isActive = (() => {
          // 精確匹配當前路徑
          if (pathname === item.href) return true;
          
          // 如果有子選單，檢查是否在子選單路徑上
          if (item.submenu) {
            return item.submenu.some(subItem => pathname === subItem.href);
          }
          
          // 對於沒有子選單的項目，檢查是否為其子路徑（但排除 /dashboard 這個特殊情況）
          if (item.href !== '/dashboard' && pathname && pathname.startsWith(item.href + '/')) {
            return true;
          }
          
          return false;
        })();
        const hasSubmenu = item.submenu && item.submenu.length > 0;
        const isSubmenuOpen = openSubmenu === index;
        
        const menuContent = (
          <div className={`flex items-center p-3 rounded-lg transition-all duration-300 ${
            isActive 
              ? 'bg-gradient-to-r from-blue-700 to-cyan-600 text-white shadow-lg' 
              : 'text-blue-100 hover:bg-blue-800/30'
          }`}
          style={{
            boxShadow: isActive ? '0 4px 10px rgba(0, 150, 255, 0.3)' : 'none'
          }}>
            <div className="w-10 h-8 relative">
              <Image
                src={item.icon}
                alt={`${item.label} 圖標`}
                fill
                className="object-contain" // 放大 1.5 倍
                style={{ 
                  filter: isActive 
                    ? 'brightness(1.2) drop-shadow(0 0 2px rgba(255, 255, 255, 0.5))' 
                    : 'brightness(1)'
                }}
              />
            </div>
            <div className="ml-4 whitespace-nowrap overflow-hidden text-sm font-medium flex-grow"
                style={{ 
                  opacity: expanded ? 1 : 0, 
                  transition: 'opacity 0.3s',
                }}>
              {expanded && getDisplayText(index, item.label)}
            </div>
            {/* 下拉箭頭 (只在展開且有子選單時顯示) */}
            {expanded && hasSubmenu && (
              <div className="ml-2 transition-transform duration-300" style={{ 
                transform: isSubmenuOpen ? 'rotate(180deg)' : 'rotate(0deg)'
              }}>
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            )}
          </div>
        );
        
        return (
          <li key={item.href} className="mb-2 px-2">
            <div className="relative">
              {/* 主選單項目 */}
              {hasSubmenu ? (
                // 有子選單的項目保持 div 結構並使用 onClick
                <div onClick={(e) => toggleSubmenu(index, e)} className="cursor-pointer">
                  {menuContent}
                </div>
              ) : (
                // 沒有子選單的項目使用 Link 元件
                <Link href={item.href}>
                  {menuContent}
                </Link>
              )}
              
              {/* 子選單 */}
              {hasSubmenu && expanded && (
                <div 
                  className="overflow-hidden transition-all duration-300 pl-6 mt-1"
                  style={{ 
                    maxHeight: isSubmenuOpen ? `${item.submenu.length * 2.5}rem` : '0',
                    opacity: isSubmenuOpen ? 1 : 0,
                  }}
                >
                  <ul className="space-y-1 py-1">
                    {item.submenu.map((subItem, subIndex) => {
                      const isSubActive = pathname === subItem.href;
                      return (
                        <li key={subItem.href}>
                          <Link 
                            href={subItem.href}
                            className={`block px-3 py-2 rounded-md text-sm transition-colors duration-200 ${
                              isSubActive 
                                ? 'bg-blue-600/40 text-white' 
                                : 'text-blue-200 hover:bg-blue-700/30'
                            }`}
                          >
                            {textProgress >= 1.5 ? subItem.label : generateWaveText(subItem.label, textProgress)}
                          </Link>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
      </div>
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
      
    </div>
  );
}