"use client";
import React, { useState, useEffect, useRef } from 'react';
const WaveEffect = ({ 
  rows = 15, 
  cols = 40, 
  blockSize = 20, 
  animationDuration = 800,
  waveIntensity = 15,
  className = "",
  isBackground = false,
  showInstructions = true 
}) => {  const [ripples, setRipples] = useState([]);
  const [dimensions, setDimensions] = useState({ rows, cols });
  const [lastClickTime, setLastClickTime] = useState(0);  const containerRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Calculate dynamic dimensions for background mode
  useEffect(() => {
    if (isBackground) {
      const calculateDimensions = () => {
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const dynamicCols = Math.floor(screenWidth / blockSize);
        const dynamicRows = Math.floor(screenHeight / blockSize);
        setDimensions({ rows: dynamicRows, cols: dynamicCols });
      };

      calculateDimensions();
      window.addEventListener('resize', calculateDimensions);
      return () => window.removeEventListener('resize', calculateDimensions);
    } else {
      setDimensions({ rows, cols });
    }
  }, [isBackground, blockSize, rows, cols]);
  // Add global click listener for background mode
  useEffect(() => {
    if (isBackground) {
      const handleGlobalClick = (event) => {        // Throttle clicks to prevent spam
        const now = Date.now();
        if (now - lastClickTime < 200) return; // Increased throttle to 200ms
        setLastClickTime(now);
        
        // Calculate which block was clicked based on mouse position
        const rect = document.documentElement.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const colIndex = Math.floor(x / blockSize);
        const rowIndex = Math.floor(y / blockSize);
        
        // Make sure the click is within our grid bounds
        if (rowIndex >= 0 && rowIndex < dimensions.rows && colIndex >= 0 && colIndex < dimensions.cols) {
          handleBlockClick(rowIndex, colIndex);
        }
      };

      document.addEventListener('click', handleGlobalClick, { passive: true });
      return () => document.removeEventListener('click', handleGlobalClick);
    }
  }, [isBackground, dimensions, blockSize, lastClickTime]);  // Clear animation frame on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);
  // Single animation loop for smooth ripple effects
  useEffect(() => {
    let isAnimating = false;
    
    const animate = () => {
      setRipples(prev => {
        const now = Date.now();
        const filtered = prev.filter(ripple => {
          const elapsed = now - ripple.startTime;
          return elapsed < animationDuration + 1000; // Reduced cleanup time
        });
        
        if (filtered.length > 0) {
          if (!isAnimating) {
            isAnimating = true;
            animationFrameRef.current = requestAnimationFrame(animate);
          }
        } else {
          isAnimating = false;
        }
        
        return filtered;
      });
    };
    
    if (ripples.length > 0 && !isAnimating) {
      animate();
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      isAnimating = false;
    };
  }, [ripples.length, animationDuration]);  const handleBlockClick = (rowIndex, colIndex) => {
    const rippleId = Date.now();
    const newRipple = {
      id: rippleId,
      centerRow: rowIndex,
      centerCol: colIndex,
      startTime: Date.now(),
      maxRadius: Math.max(dimensions.rows, dimensions.cols) * 1.5 // Simplified calculation
    };
    
    setRipples(prev => [...prev.slice(-1), newRipple]); // Keep max 2 ripples for better performance
  };  const getBlockStyle = (rowIndex, colIndex) => {
    const currentTime = Date.now();
    let isAnimating = false;
    let animationIntensity = 0;
    
    // Early exit for blocks far from any ripple center to improve performance
    for (const ripple of ripples) {
      const roughDistance = Math.abs(rowIndex - ripple.centerRow) + Math.abs(colIndex - ripple.centerCol);
      if (roughDistance > ripple.maxRadius) continue;
      
      const distance = Math.sqrt(
        Math.pow(rowIndex - ripple.centerRow, 2) + 
        Math.pow(colIndex - ripple.centerCol, 2)
      );
      
      const elapsed = currentTime - ripple.startTime;
      const rippleSpeed = 0.08; // Slightly faster ripple speed
      const currentRippleRadius = elapsed * rippleSpeed;
      
      // Check if ripple has reached this block
      if (distance <= currentRippleRadius && distance >= currentRippleRadius - 2) {
        isAnimating = true;
        // Calculate intensity based on distance from ripple edge
        const edgeDistance = Math.abs(distance - currentRippleRadius);
        animationIntensity = Math.max(animationIntensity, Math.max(0, 1 - edgeDistance / 2));
        break; // Early exit once we find an active ripple
      }
    }
    
    const baseStyle = {
      width: `${blockSize}px`,
      height: `${blockSize}px`,
      cursor: isBackground ? 'default' : 'pointer',
      border: isBackground ? 'none' : '1px solid #1e40af',
      borderRadius: isBackground ? '1px' : '2px',
      transition: isAnimating ? 'none' : 'all 0.15s ease-out', // Disable transition during animation
      willChange: isAnimating ? 'transform, background-color' : 'auto',
    };
    
    if (!isAnimating || animationIntensity < 0.1) {
      return {
        ...baseStyle,
        backgroundColor: isBackground ? 'rgba(59, 130, 246, 0.1)' : '#3b82f6',
        transform: 'translateY(0) scaleY(1)',
      };
    }

    const intensity = animationIntensity * waveIntensity;
    return {
      ...baseStyle,
      backgroundColor: isBackground 
        ? `rgba(96, 165, 250, ${0.2 + animationIntensity * 0.3})` 
        : '#60a5fa',
      transform: `translateY(-${intensity}px) scaleY(${1 + animationIntensity * 0.2})`, // Reduced scale change
    };
  };
  const renderGrid = () => {
    const grid = [];
    
    for (let row = 0; row < dimensions.rows; row++) {
      const rowBlocks = [];
      for (let col = 0; col < dimensions.cols; col++) {        rowBlocks.push(
          <div
            key={`${row}-${col}`}
            className="block"
            style={getBlockStyle(row, col)}
            onClick={isBackground ? undefined : () => handleBlockClick(row, col)}            onMouseEnter={isBackground ? undefined : (e) => {
              // Optimized hover effect
              if (!e.target.style.transform.includes('translateY')) {
                e.target.style.backgroundColor = '#60a5fa';
                e.target.style.transform = 'scale(1.05)';
              }
            }}
            onMouseLeave={isBackground ? undefined : (e) => {
              // Optimized hover effect
              if (!e.target.style.transform.includes('translateY')) {
                e.target.style.backgroundColor = '#3b82f6';
                e.target.style.transform = 'scale(1)';
              }
            }}
          />
        );
      }
      
      grid.push(
        <div 
          key={row} 
          className="row"
          style={{
            display: 'flex',
            gap: '0px',
            marginBottom: '0px',
          }}
        >
          {rowBlocks}
        </div>
      );
    }
    
    return grid;
  };

  return (
    <>      <style jsx>{`
        .wave-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: ${isBackground ? '0' : '20px'};
          background: ${isBackground ? 'transparent' : 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'};
          border-radius: ${isBackground ? '0' : '12px'};
          box-shadow: ${isBackground ? 'none' : '0 8px 32px rgba(0, 0, 0, 0.3)'};
          ${isBackground ? 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: -1; overflow: hidden; pointer-events: none;' : ''}
        }

        .wave-grid {
          display: flex;
          flex-direction: column;
          gap: ${isBackground ? '1px' : '2px'};
          padding: ${isBackground ? '0' : '10px'};
          border-radius: ${isBackground ? '0' : '8px'};
          background: ${isBackground ? 'transparent' : 'rgba(15, 23, 42, 0.5)'};
          ${isBackground ? 'width: 100%; height: 100%; justify-content: center; align-items: center;' : ''}
        }

        .block {
          user-select: none;
          border-radius: 2px;
        }

        .block:hover {
          box-shadow: ${isBackground ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.4)'};
        }

        .instructions {
          margin-top: 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 14px;
          max-width: 300px;
        }
      `}</style>
        <div className={`wave-container ${className}`} ref={containerRef}>
        <div className="wave-grid">
          {renderGrid()}
        </div>
        
        {showInstructions && !isBackground && (
          <div className="instructions">
            <p>Click on any block to create a wave effect that spreads from that block!</p>
            <p>The wave will ripple outward from the exact position you clicked.</p>
          </div>
        )}
      </div>
    </>
  );
};

export default WaveEffect;