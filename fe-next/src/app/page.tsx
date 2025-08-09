"use client";
import { useState, useEffect } from "react";
import Image from "next/image";

// Component for animated coin replacement
function AnimatedCoin({ show, xPosition }: { show: boolean; xPosition: string }) {
  const [animationPhase, setAnimationPhase] = useState("gif");
  
  useEffect(() => {
    if (show && animationPhase === "gif") {
      // Switch to static image after gif duration (assuming ~2-3 seconds for gif)
      const timer = setTimeout(() => {
        setAnimationPhase("static");
      }, 2500);
      
      return () => clearTimeout(timer);
    }
  }, [show, animationPhase]);

  useEffect(() => {
    // Reset animation phase when show becomes false
    if (!show) {
      setAnimationPhase("gif");
    }
  }, [show]);

  if (!show) return null;

  return (
    <div className={`w-12 h-12 absolute top-1/2 transform -translate-y-1/2 ${xPosition}`}>
      {animationPhase === "gif" ? (
        <Image 
          src="/ani/flowsui.gif" 
          alt="Coin animation" 
          width={48}
          height={48}
          className="w-full h-full object-contain"
          unoptimized={true}
        />
      ) : (
        <Image 
          src="/ani/5.png" 
          alt="Coin" 
          width={48}
          height={48}
          className="w-full h-full object-contain"
        />
      )}
    </div>
  );
}

export default function Home() {
  const [showCoins, setShowCoins] = useState(false);

  return (
    <div className="bg-[#12184d] relative overflow-hidden">
      <div className="absolute inset-0 z-0">
        <div className="h-1/6 relative">
          <AnimatedCoin show={showCoins} xPosition="left-4" />
        </div>
        <div className="h-1/6 relative">
          <AnimatedCoin show={showCoins} xPosition="left-77" />
        </div>
        <div className="h-1/6 relative">
          <AnimatedCoin show={showCoins} xPosition="left-28" />
        </div>
        <div className="h-1/6 relative">
          <AnimatedCoin show={showCoins} xPosition="right-99" />
        </div>
        <div className="h-1/6 relative">
          <AnimatedCoin show={showCoins} xPosition="right-16" />
        </div>
        <div className="h-1/6 relative">
          <AnimatedCoin show={showCoins} xPosition="right-188" />
        </div>
      </div>
      <div className="w-screen h-screen z-10 relative">
        <div className="flex flex-col items-center justify-center h-full">
          <span className="m-10 text-6xl font-bold animated-gradient-text flex flex-row">
            <p>Sea</p>
            <p>Vault</p>
          </span>
            <button 
            className="bg-white text-black rounded-xs text-4xl px-4 py-2 relative overflow-hidden transition-colors duration-300 hover:text-white hover:bg-slate-800 focus:text-white focus:bg-slate-800 launch-button"
            onMouseEnter={() => setShowCoins(true)}
            onFocus={() => setShowCoins(true)}
            onClick={() => window.location.href = '/vault'}
            >
            Launch App
            </button>
          {/* for dev reference, from this commit, all user can only own ONE seaVault */}
        </div>
        <style jsx>{`
          @keyframes textGradient {
            0% {
              background-position: 0% 50%;
            }
            50% {
              background-position: 100% 50%;
            }
            100% {
              background-position: 0% 50%;
            }
          }

          @keyframes coinFall {
            0% {
              transform: translateY(-100vh) rotate(0deg);
              opacity: 1;
            }
            100% {
              transform: translateY(100vh) rotate(360deg);
              opacity: 0;
            }
          }

          .animated-gradient-text {
            background: linear-gradient(
              -45deg,
              #d9ffff,
              #4dffff,
              #2894ff,
              #0066cc
            );
            background-size: 400% 400%;
            animation: textGradient 8s ease infinite;
            -webkit-background-clip: text;
            background-clip: text;
            -webkit-text-fill-color: transparent;
          }

          .launch-button::before {
            content: "";
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 0;
            background-color: black;
            transition: height 0.2s ease;
            z-index: -1;
          }

          .launch-button:hover::before,
          .launch-button:focus::before {
            height: 100%;
          }
        `}</style>
      </div>
    </div>
  );
}
