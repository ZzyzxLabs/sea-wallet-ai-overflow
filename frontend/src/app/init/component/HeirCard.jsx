import { useState, useEffect, useRef } from "react";

export default function HeirCard({ heirs, addHeir, removeHeir, updateHeir, getTotalRatio, handleVerify, isProcessing }) {
  const prevHeirsCountRef = useRef(0);
  const animationInProgressRef = useRef(false);
  const cardRef = useRef(null);

  useEffect(() => {
    if (heirs.length !== prevHeirsCountRef.current && !animationInProgressRef.current) {
      animationInProgressRef.current = true;

      requestAnimationFrame(() => {
        if (heirs.length > prevHeirsCountRef.current) {
          if (cardRef.current) {
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight + 80}px`;

            const newHeirElements = document.querySelectorAll('[data-heir-id]');
            const newHeirElement = newHeirElements[newHeirElements.length - 1];

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

  const getAddressType = (address) => {
    if (address && address.startsWith("0x") && !address.includes("@")) {
      return "sui";
    } else if (address && address.includes("@")) {
      return "email";
    }
    return "";
  };
  return (
    <div className="heir-card">
      <div className="container" ref={cardRef}>
        {/* Floating icon */}
        <div className="card">
          <h1 className="title">Set Your Heirs</h1>

          <div className="space-y-4">
            {heirs.map((heir, index) => (
              <div
                key={heir.id}
                className="heir-item"
                data-heir-id={heir.id}
                style={{
                  opacity: index < prevHeirsCountRef.current ? 1 : 0,
                  transform: index < prevHeirsCountRef.current ? 'translateY(0)' : 'translateY(15px)',
                  transition: 'opacity 0.35s ease-out, transform 0.35s ease-out'
                }}
              >
                <div className="grid grid-cols-4 gap-4 items-center">
                  <div className=" pl-3 font-bold text-white text-sm">Heir {index + 1}</div>
                  <input
                    type="text"
                    className="input"
                    placeholder="Name"
                    value={heir.name || ""}
                    onChange={(e) => updateHeir(heir.id, "name", e.target.value)}
                  />
                  <input
                    type="text"
                    className="input"
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
                        <img
                          src={
                            heir.address && heir.address.startsWith("0x") && !heir.address.includes("@")
                              ? "./sui.svg"
                              : "./mail-142.svg"
                          }
                          alt={
                            heir.address && heir.address.startsWith("0x") && !heir.address.includes("@")
                              ? "Sui Address"
                              : "Email Address"
                          }
                          className="w-4 h-4 transition-opacity duration-300"
                        />
                      </div>
                      <input
                        type="text"
                        className="input pl-10"
                        placeholder="Address/Email"
                        value={heir.address || ""}
                        onChange={(e) => updateHeir(heir.id, "address", e.target.value)}
                      />
                    </div>
                    {index > 0 && (
                      <button
                        onClick={() => removeHeir(heir.id)}
                        className="remove-button p-2 rounded-full hover:bg-red-500/20 transition-all duration-200"
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

          <div className="mt-6">
            <button
              onClick={handleAddHeir}
              className="button flex items-center text-white font-medium px-4 py-2 rounded-lg hover:shadow-lg transition-all duration-200"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Another Heir
            </button>
          </div>

          <div className="my-8 border-t border-white/20"></div>

          <div className="flex justify-between items-center">
            <div className="font-bold text-lg text-white">
              Total Share: <span className="text-blue-300">{getTotalRatio()}%</span>
            </div>            <div className="flex space-x-3">
              <button
                onClick={() => {
                  // Reset all heirs to initial state
                  window.location.reload();
                }}
                className="px-6 py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-all duration-200 font-medium"
              >
                Reset
              </button>

              <button
                className={`button px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
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
  );
}
