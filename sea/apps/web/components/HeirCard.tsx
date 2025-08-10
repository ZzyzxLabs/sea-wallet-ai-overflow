"use client";

import { useState, useEffect, useRef } from "react";

interface Heir {
  id: string;
  name: string;
  ratio: string;
  address: string;
}

interface HeirCardProps {
  heirs: Heir[];
  addHeir: () => void;
  removeHeir: (id: string) => void;
  updateHeir: (id: string, field: keyof Heir, value: string) => void;
  getTotalRatio: () => number;
  handleVerify: () => void;
  isProcessing: boolean;
}

export default function HeirCard({ 
  heirs, 
  addHeir, 
  removeHeir, 
  updateHeir, 
  getTotalRatio, 
  handleVerify, 
  isProcessing 
}: HeirCardProps) {
  const prevHeirsCountRef = useRef(0);
  const animationInProgressRef = useRef(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heirs.length !== prevHeirsCountRef.current && !animationInProgressRef.current) {
      animationInProgressRef.current = true;

      requestAnimationFrame(() => {
        if (heirs.length > prevHeirsCountRef.current) {
          if (cardRef.current) {
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight + 80}px`;

            const newHeirElements = document.querySelectorAll('[data-heir-id]');
            const newHeirElement = newHeirElements[newHeirElements.length - 1] as HTMLElement;

            if (newHeirElement) {
              newHeirElement.style.opacity = '0';
              newHeirElement.style.transform = 'translateY(15px)';
              void newHeirElement.offsetWidth;

              setTimeout(() => {
                newHeirElement.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
                newHeirElement.style.opacity = '1';
                newHeirElement.style.transform = 'translateY(0)';
              }, 50);
            }

            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 400);
          }
        } else {
          if (cardRef.current) {
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight}px`;

            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 350);
          } else {
            animationInProgressRef.current = false;
          }
        }

        prevHeirsCountRef.current = heirs.length;
      });
    }
  }, [heirs.length]);

  const handleAddHeir = () => {
    if (animationInProgressRef.current) return;
    addHeir();
  };

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div ref={cardRef} className="relative">
        <div className="p-8 rounded-2xl bg-white/10 border border-white/20 backdrop-blur space-y-6">
          <h2 className="text-2xl font-bold text-white text-center mb-6">Set Your Heirs</h2>

          <div className="space-y-4">
            {heirs.map((heir, index) => (
              <div
                key={heir.id}
                className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all duration-200"
                data-heir-id={heir.id}
                style={{
                  opacity: index < prevHeirsCountRef.current ? 1 : 0,
                  transform: index < prevHeirsCountRef.current ? 'translateY(0)' : 'translateY(15px)',
                  transition: 'opacity 0.35s ease-out, transform 0.35s ease-out'
                }}
              >
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-center">
                  <div className="font-bold text-white text-sm">Heir {index + 1}</div>
                  <input
                    type="text"
                    className="px-3 py-2 rounded-lg bg-slate-800/50 border border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                    placeholder="Name"
                    value={heir.name || ""}
                    onChange={(e) => updateHeir(heir.id, "name", e.target.value)}
                  />
                  <input
                    type="number"
                    className="px-3 py-2 rounded-lg bg-slate-800/50 border border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                    placeholder="% Share"
                    value={heir.ratio || ""}
                    onChange={(e) => updateHeir(heir.id, "ratio", e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "-") {
                        e.preventDefault();
                      }
                    }}
                  />
                  <div className="flex items-center gap-2">
                    <div className="relative flex-grow">
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2 z-10">
                        <svg 
                          className="w-4 h-4 text-white/60"
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          {heir.address && heir.address.startsWith("0x") && !heir.address.includes("@") ? (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                          ) : (
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                          )}
                        </svg>
                      </div>
                      <input
                        type="text"
                        className="w-full px-3 py-2 pl-10 rounded-lg bg-slate-800/50 border border-white/20 text-white placeholder-white/50 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/20 transition-all"
                        placeholder="Address/Email"
                        value={heir.address || ""}
                        onChange={(e) => updateHeir(heir.id, "address", e.target.value)}
                      />
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => removeHeir(heir.id)}
                        className="p-2 rounded-full text-red-400 hover:bg-red-500/20 transition-all duration-200"
                        disabled={heirs.length <= 1}
                        title="Remove Heir"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleAddHeir}
              className="flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-all duration-200 hover:shadow-lg"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Heir
            </button>
          </div>

          <div className="border-t border-white/20 pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
              <div className="font-bold text-lg text-white">
                Total Share: <span className="text-blue-300">{getTotalRatio()}%</span>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    // Reset functionality - could be customized
                    window.location.reload();
                  }}
                  className="px-6 py-3 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-all duration-200 font-medium"
                >
                  Reset
                </button>

                <button
                  className={`px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all duration-200 ${
                    isProcessing ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg'
                  }`}
                  onClick={handleVerify}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <>
                      <span className="inline-block animate-spin mr-2">⟳</span>
                      Processing...
                    </>
                  ) : (
                    "Confirm & Create Vault"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
