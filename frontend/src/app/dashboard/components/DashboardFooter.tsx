/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";
import ContractAlterScroll from "../../../component/VaultScroll";

// 社交媒體連結資料
const socialLinks = [
  {
    name: "X",
    icon: "/iconFooter/X.svg",
    url: "https://x.com/SeaWallet_ai",
    color: "#1DA1F2",
  },
  {
    name: "Discord",
    icon: "/iconFooter/discord.svg",
    url: "https://discord.gg/bQyqMJgCjA",
    color: "#5865F2",
  },
  {
    name: "GitHub",
    icon: "/iconFooter/github.svg",
    url: "https://github.com/ZzyzxLabs",
    color: "#C06EFF",
  },
  {
    name: "Telegram",
    icon: "/iconFooter/telegram.svg",
    url: "https://t.me",
    color: "#0088cc",
  },
];

export default function DashboardFooter() {
  const [currentTime, setCurrentTime] = useState("");

  // 使用 requestAnimationFrame 優化時間更新
  useEffect(() => {
    let animationFrameId;

    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
      animationFrameId = requestAnimationFrame(updateTime);
    };

    updateTime();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <footer className="sticky bottom-0 w-full bg-white/50 z-10">
      {/* 波浪動畫背景 */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[url('/oceanew.gif')] bg-repeat-x bg-top animate-wave"></div>
      </div>

      {/* 內容 */}
      <div className="relative py-4 px-6 backdrop-blur-sm bg-gradient-to-b from-blue-50/80 to-white">
        <div className="flex justify-between items-center flex-wrap gap-4 max-w-7xl mx-auto">
          {/* 左側：連結、社交媒體、版權和時間 */}
          <div className="flex items-center space-x-12">
            <div className="flex space-x-6">
              <a
                href="#"
                className="text-blue-700 hover:text-blue-500 transition-colors duration-200 text-sm"
              >
                Terms
              </a>
              <a
                href="#"
                className="text-blue-700 hover:text-blue-500 transition-colors duration-200 text-sm"
              >
                Privacy
              </a>
            </div>
            <div className="flex items-center space-x-6">
              <div className="flex space-x-4">
                {socialLinks.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative"
                    aria-label={social.name}
                    title={social.name}
                  >
                    <div
                      className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
                      style={{ background: social.color }}
                    ></div>
                    <div className="relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 transform backdrop-blur-sm group-hover:scale-110 border border-white border-opacity-30 group-hover:border-opacity-0">
                      <div className="text-white group-hover:scale-110 transition-transform duration-300">
                        <img
                          src={social.icon}
                          alt={social.name}
                          className="w-6 h-6"
                        />
                      </div>
                    </div>
                  </a>
                ))}
              </div>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 font-medium">
                © {new Date().getFullYear()} SeaWallet{" "}
                <span className="text-slate-700">Copyright Reserved</span>
              </span>
              <div className="text-sm text-blue-600/90 bg-blue-50 px-3 py-1 rounded-full shadow-sm">
                {currentTime} UTC+8
              </div>
            </div>
          </div>

          {/* 右側：ContractAlterScroll */}
          <div>
            <ContractAlterScroll />
          </div>
        </div>
      </div>
    </footer>
  );
}