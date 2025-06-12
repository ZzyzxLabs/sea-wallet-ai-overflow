"use client";
import React, { useEffect, useRef } from 'react';

const WaveEffect = () => {
  const svgRef = useRef(null);
  const pathRefs = useRef([]);  // Define configurations for multiple waves with varying Y positions and speeds
  const waveConfigs = [
    { amplitude: 70, frequency: 0.025, phaseOffset: 0, yOffset: 0.7, speed: 0.0003, color: "rgba(135, 206, 250, 0.15)" },
    { amplitude: 65, frequency: 0.023, phaseOffset: 0.3, yOffset: 0.65, speed: 0.0004, color: "rgba(100, 149, 237, 0.2)" },
    { amplitude: 60, frequency: 0.022, phaseOffset: 0.6, yOffset: 0.6, speed: 0.0005, color: "rgba(70, 130, 180, 0.25)" },
    { amplitude: 55, frequency: 0.021, phaseOffset: 0.9, yOffset: 0.55, speed: 0.0006, color: "rgba(65, 105, 225, 0.3)" },
    { amplitude: 50, frequency: 0.02, phaseOffset: 1.2, yOffset: 0.5, speed: 0.0007, color: "rgba(30, 144, 255, 0.25)" },
    { amplitude: 45, frequency: 0.019, phaseOffset: 1.5, yOffset: 0.45, speed: 0.0008, color: "rgba(0, 191, 255, 0.2)" },
    { amplitude: 40, frequency: 0.018, phaseOffset: 1.8, yOffset: 0.4, speed: 0.0009, color: "rgba(135, 206, 235, 0.18)" },
    { amplitude: 35, frequency: 0.017, phaseOffset: 2.1, yOffset: 0.35, speed: 0.001, color: "rgba(173, 216, 230, 0.15)" },
    { amplitude: 30, frequency: 0.016, phaseOffset: 2.4, yOffset: 0.3, speed: 0.0011, color: "rgba(176, 224, 230, 0.12)" }
  ];
  const waveControls = useRef({
    mouseInfluence: 0,
  });

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;

    let animationFrameId;

    const handleMouseMove = (event) => {
      const mouseY = event.clientY;
      const windowHeight = window.innerHeight;
      waveControls.current.mouseInfluence = (windowHeight - mouseY) / windowHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      const now = Date.now();
      const svgWidth = svg.clientWidth;
      const svgHeight = svg.clientHeight;

      if (svgWidth === 0 || svgHeight === 0) {
        animationFrameId = requestAnimationFrame(animate);
        return;
      }

      pathRefs.current.forEach((path, index) => {
        if (!path) return;        const config = waveConfigs[index];
        const currentPhase = now * config.speed + config.phaseOffset;
        
        // Generate angular waves by finding peaks and valleys
        const points = [];
        const waveLength = (2 * Math.PI) / config.frequency; // One complete wave cycle
        const numPeaks = Math.ceil(svgWidth / (waveLength / 2)); // Number of peaks and valleys
          for (let i = 0; i <= numPeaks; i++) {
          const x = (i * svgWidth) / numPeaks;
          const baseWave = config.amplitude * Math.sin(x * config.frequency + currentPhase);
          const influencedWave = baseWave + (config.amplitude * waveControls.current.mouseInfluence * Math.sin(x * config.frequency * 0.5 + currentPhase * 0.8));
          points.push([x, svgHeight * config.yOffset + influencedWave]);
        }
        
        // Ensure we have the end point
        if (points[points.length - 1][0] < svgWidth) {
          const x = svgWidth;
          const baseWave = config.amplitude * Math.sin(x * config.frequency + currentPhase);
          const influencedWave = baseWave + (config.amplitude * waveControls.current.mouseInfluence * Math.sin(x * config.frequency * 0.5 + currentPhase * 0.8));
          points.push([x, svgHeight * config.yOffset + influencedWave]);
        }

        if (points.length === 0) return;

        let d = `M ${points[0][0]} ${points[0][1]}`;
        for (let i = 1; i < points.length; i++) {
          d += ` L ${points[i][0]} ${points[i][1]}`;
        }
        d += ` L ${svgWidth} ${svgHeight} L 0 ${svgHeight} Z`;
        path.setAttribute('d', d);      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  return (
    <div className="max-w-full"> {/* Use React.Fragment to return multiple elements */}
      <svg
        ref={svgRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          zIndex: -1,
        }}
      >
        {waveConfigs.map((config, index) => (
          <path
            key={index}
            ref={(el) => (pathRefs.current[index] = el)}            fill={config.color}
          />
        ))}
      </svg>
    </div>
  );
};

export default WaveEffect;
