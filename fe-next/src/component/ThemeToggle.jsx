"use client";

import React from 'react';
import { useTheme } from './ThemeContext';

const ThemeToggle = () => {
  const themeContext = useTheme();
  
  // 如果 ThemeContext 不可用，顯示一個空元素
  if (!themeContext) {
    return null;
  }
  
  const { theme, toggleTheme } = themeContext;

  return (
    <button
      onClick={toggleTheme}
      className="relative group p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors duration-300"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      <div className="absolute -inset-0.5 bg-gradient-to-r from-yellow-400 to-purple-500 rounded-full blur opacity-60 group-hover:opacity-100 transition duration-300"></div>
      
      <div className="relative">
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-800">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"></path>
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-300">
            <circle cx="12" cy="12" r="4"></circle>
            <path d="M12 2v2"></path>
            <path d="M12 20v2"></path>
            <path d="m4.93 4.93 1.41 1.41"></path>
            <path d="m17.66 17.66 1.41 1.41"></path>
            <path d="M2 12h2"></path>
            <path d="M20 12h2"></path>
            <path d="m6.34 17.66-1.41 1.41"></path>
            <path d="m19.07 4.93-1.41 1.41"></path>
          </svg>
        )}
      </div>
    </button>
  );
};

export default ThemeToggle;