"use client";

import { useState, useEffect } from "react";

export default function DashboardFooter() {
  const [currentTime, setCurrentTime] = useState("");
  const socialLinks = [
    {
      name: "X",
      icon: "/iconFooter/X.svg",
      url: "https://x.com",
      color: "#1DA1F2",
    },
    {
      name: "Discord",
      icon: "/iconFooter/discord.svg",
      url: "https://discord.gg",
      color: "#5865F2",
    },
    {
      name: "GitHub",
      icon: "/iconFooter/github.svg",
      url: "https://github.com",
      color: "#C06EFF",
    },
    {
      name: "Telegram",
      icon: "/iconFooter/telegram.svg",
      url: "https://t.me",
      color: "#0088cc",
    },
  ];
  // 每秒更新時間
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      const seconds = now.getSeconds().toString().padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <footer className="fixed bottom-0 min-w-full pl-15 z-10">
      {/* 波浪動畫背景 */}
      <div className="absolute inset-0 bg-white/50">
        <div className="absolute inset-0 bg-[url('/oceanew.gif')] bg-repeat-x bg-top animate-wave"></div>
      </div>

      {/* 內容 */}
      <div className="relative py-4 pl-6 backdrop-blur-sm bg-gradient-to-b from-blue-50/80 to-white">
        <div className="flex justify-between items-center flex-wrap">
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
          <div className=" justify-between">
            <div className="flex space-x-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group relative"
                  aria-label={social.name}
                >
                  <div
                    className="absolute -inset-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-md"
                    style={{ background: social.color }}
                  ></div>
                  <div
                    className={`relative flex items-center justify-center w-10 h-10 rounded-full transition-all duration-300 transform 
                    backdrop-blur-sm group-hover:scale-110 border border-white border-opacity-30 group-hover:border-opacity-0`}
                  >
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
          </div>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-500 font-medium">
            © {new Date().getFullYear()} SeaWallet{" "}
            <span className="text-slate-700">Copyright Reserved</span>
          </span>{" "}
          <div className="text-sm text-blue-600/90 bg-blue-50 px-3 py-1 rounded-full shadow-sm">
            {currentTime} UTC+8
          </div>
        </div>
      </div>
    </footer>
  );
}
