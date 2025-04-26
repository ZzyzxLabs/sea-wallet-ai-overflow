import React, { useState } from "react";

// Popular Sui network coins for reference
const popularCoins = [
  ["SUI", "0x2::sui::SUI"],
  ["USDC", "0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN"],
  ["WETH", "0x27792d9fed7f9844eb4839566001bb6f6cb4804f66aa2da6fe1ee242d896881::coin::COIN"],
  ["BTC", "0xc44f8d1a9d1048bdd3777fe4a1bf74c3f4e97f234ce9e68608d8a3a2743eda8b::coin::COIN"],
  ["CETUS", "0x06864a6f921804860930db6ddbe2e16acdf8504495ea7481637a1c8b9a8fe54b::cetus::CETUS"],
];

// Format address function to prevent overflow
const formatAddress = (address) => {
  if (!address) return "";
  return `${address.slice(0, 8)}...${address.slice(-6)}`;
};

const buttonInContractAlter = ({ onAddAsset }) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [amount, setAmount] = useState(0);
  const [error, setError] = useState("");
  const [modalAnimation, setModalAnimation] = useState("");

  const openModal = () => {
    setShowModal(true);
    // Apply fade-in animation
    setModalAnimation("animate-fadeIn");
  };

  const closeModal = () => {
    // Apply fade-out animation
    setModalAnimation("animate-fadeOut");
    // Wait for animation to finish before hiding modal
    setTimeout(() => {
      setShowModal(false);
      setError("");
      setSelectedCoin(null);
      setAmount(0);
    }, 300);
  };

  const handleCoinSelect = (coin) => {
    setSelectedCoin(coin);
  };

  const handleAddCoin = () => {
    // Basic validation
    if (!selectedCoin || amount <= 0) {
      setError("Please select a coin and ensure amount is greater than 0");
      return;
    }

    // Call the parent component's callback with the new coin data
    if (onAddAsset) {
      onAddAsset([selectedCoin[0], selectedCoin[1], amount]);
    }
    
    // Close modal with animation
    closeModal();
  };

  return (
    <>
      {/* Button styled to match the page's design */}
      <button
        onClick={openModal}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Add New Asset
      </button>

      {/* Modal Window - Hidden by default */}
      {showModal && (
        <div className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${modalAnimation}`}>
          <div className={`bg-white rounded-lg shadow-md p-6 w-96 max-w-full ${modalAnimation === "animate-fadeIn" ? "animate-scaleIn" : "animate-scaleOut"}`}>
            <h3 className="text-2xl font-semibold text-black mb-4">
              Add New Asset
            </h3>
            
            {error && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md">
                {error}
              </div>
            )}
            
            <div className="mb-4">
              <label className="block text-lg font-medium text-black mb-2">
                Select Coin
              </label>
              <div className="space-y-2">
                {popularCoins.map((coin, index) => (
                  <div 
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      selectedCoin && selectedCoin[0] === coin[0] 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                    }`}
                    onClick={() => handleCoinSelect(coin)}
                  >
                    <div className="flex items-center">
                      <div className="font-medium text-black">{coin[0]}</div>
                      <div className="ml-1 text-xs text-gray-500 overflow-hidden text-ellipsis" title={coin[1]}>
                        {formatAddress(coin[1])}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="mb-6">
              <label className="block text-lg font-medium text-black mb-2">
                Amount
              </label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black"
                placeholder="Enter amount"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-black"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCoin}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        
        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        
        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }
        
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }
        
        .animate-fadeOut {
          animation: fadeOut 0.3s ease-out forwards;
        }
        
        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }
        
        .animate-scaleOut {
          animation: scaleOut 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default buttonInContractAlter;