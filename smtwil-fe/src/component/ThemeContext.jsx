"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

// 創建主題上下文
const ThemeContext = createContext();

// 主題提供者組件
export const ThemeProvider = ({ children }) => {
  // 檢查是否優先使用暗色模式以及本地存儲的主題
  const [theme, setTheme] = useState('light');
  const [mounted, setMounted] = useState(false);
  
  // 在客戶端加載時從localStorage讀取主題設置
  useEffect(() => {
    // 使用標志表示組件已掛載
    setMounted(true);
    
    // 檢查用戶的系統偏好設置
    const prefersDark = window.matchMedia && 
                       window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    // 從localStorage讀取保存的主題，如果沒有則使用系統偏好
    const savedTheme = localStorage.getItem('hair-theme');
    const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
    
    setTheme(initialTheme);
    updateTheme(initialTheme);
    
    // 監聽系統主題變更
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e) => {
      if (!localStorage.getItem('hair-theme')) {
        const newTheme = e.matches ? 'dark' : 'light';
        setTheme(newTheme);
        updateTheme(newTheme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);
  
  // 更新整個文檔的主題
  const updateTheme = (newTheme) => {
    // 更新文檔data-theme屬性
    document.documentElement.setAttribute('data-theme', newTheme);
    
    // 更新dark類
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.add('light');
      document.documentElement.classList.remove('dark');
    }
  };
  
  // 切換主題函數
  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    
    // 保存到localStorage
    localStorage.setItem('hair-theme', newTheme);
    
    // 更新文檔
    updateTheme(newTheme);
  };
  
  // 防止在伺服器端渲染期間出現閃爍
  if (!mounted) {
    return <>{children}</>;
  }
  
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

// 使用主題的自定義Hook
export const useTheme = () => {
  return useContext(ThemeContext);
};