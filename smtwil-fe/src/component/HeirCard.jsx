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
    <div className="bg-primary rounded-lg p-8 shadow-none w-full max-w-3xl" ref={cardRef}>
      <h1 className="text-4xl text-black font-bold mb-6">Set Your Heir</h1>

      <div className="space-y-4">
        {heirs.map((heir, index) => (
          <div
            key={heir.id}
            className="grid grid-cols-4 gap-4 items-center"
            data-heir-id={heir.id}
            style={{
              opacity: index < prevHeirsCountRef.current ? 1 : 0,
              transform: index < prevHeirsCountRef.current ? 'translateY(0)' : 'translateY(15px)',
              transition: 'opacity 0.35s ease-out, transform 0.35s ease-out'
            }}
          >
            <div className="font-bold text-black">Heir {index + 1}</div>
            <input
              type="text"
              className="p-2 border border-gray-300 rounded-md text-black"
              placeholder="Name"
              value={heir.name || ""}
              onChange={(e) => updateHeir(heir.id, "name", e.target.value)}
            />
            <input
              type="text"
              className="p-2 border border-gray-300 rounded-md text-black"
              placeholder="% of Share"
              value={heir.ratio || ""}
              onChange={(e) => updateHeir(heir.id, "ratio", e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "-") {
                  e.preventDefault();
                }
              }}
            />
            <div className="flex items-center">
              <div className="relative flex-grow">
                <div className="absolute left-2 top-1/2 transform -translate-y-1/2">
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
                  className="p-2 pl-8 border border-gray-300 rounded-md w-full text-black"
                  placeholder="Wallet Address or Email"
                  value={heir.address || ""}
                  onChange={(e) => updateHeir(heir.id, "address", e.target.value)}
                />
              </div>
              {index > 0 && (
                <button
                  onClick={() => removeHeir(heir.id)}
                  className="ml-2 text-gray-600 hover:text-black"
                  disabled={heirs.length <= 1}
                  title="Remove Heir"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <button
          onClick={handleAddHeir}
          className="flex items-center text-black font-bold"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Add Another Heir
        </button>
      </div>

      <div className="my-8 border-t border-gray-300"></div>

      <div className="flex justify-between items-center">
        <div className="font-bold text-lg text-black">
          Total % Now: <span>{getTotalRatio()}</span>%
        </div>

        <div className="flex space-x-4">
          <button
            className="px-6 py-3 bg-gray-200 text-black rounded-full hover:bg-gray-300 transition"
          >
            Reset
          </button>

          <button
            className={`px-6 py-3 bg-secondary text-white rounded-full hover:bg-secondary-dark transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={handleVerify}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Processing...
              </>
            ) : (
              "Confirm"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
