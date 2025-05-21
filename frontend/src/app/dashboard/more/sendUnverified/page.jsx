"use client";

import React, { useState, useEffect } from "react";
import { useCurrentAccount, useSuiClientQuery, useSignAndExecuteTransaction, useSuiClient, useSuiClientQueries } from "@mysten/dapp-kit";
import useMoveStore from "../../../../store/moveStore";

export default function SendUnverified() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const sendCoin = useMoveStore((state) => state.sendcoinLol);
  const [toAddress, setToAddress] = useState("");
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [availableCoins, setAvailableCoins] = useState([]);
  const [coinMetadata, setCoinMetadata] = useState([]);

  // Fetch all coins in wallet
  const allBalances = useSuiClientQuery(
    "getAllBalances",
    { owner: account?.address },
    { enabled: !!account }
  );

  // Update available coins when balances are fetched
  useEffect(() => {
    if (allBalances.data) {
      const userCoins = allBalances.data.map((coin) => {
        const coinPath = coin.coinType.split("::");
        const coinName = coinPath.length > 2 ? coinPath[2] : coinPath[1];
        return [coinName, coin.coinType, parseInt(coin.totalBalance)];
      });
      setAvailableCoins(userCoins);
    }
  }, [allBalances.data]);

  // Fetch metadata for all available coins
  const coinMetadataQueries = useSuiClientQueries({
    queries: availableCoins.map((coin) => ({
      method: "getCoinMetadata",
      params: { coinType: coin[1] },
    })),
    combine: (result) => ({ data: result.map((res) => res.data) }),
    enabled: availableCoins.length > 0 && !!account,
  });
  useEffect(() => {
    if (coinMetadataQueries.data) setCoinMetadata(coinMetadataQueries.data);
  }, [coinMetadataQueries.data]);

  // Validate address
  const isValidAddress = (addr) => addr.startsWith("0x") && addr.length > 2;

  // Handle send
  const handleSend = async () => {
    setError(""); setSuccess("");
    if (!isValidAddress(toAddress)) {
      setError("Please enter a valid 0x address.");
      return;
    }
    if (!selectedCoin) {
      setError("Please select a coin.");
      return;
    }
    const coinIdx = availableCoins.findIndex((c) => c[1] === selectedCoin[1]);
    const decimals = coinMetadata[coinIdx]?.decimals || 9;
    const max = Number(selectedCoin[2]) / Math.pow(10, decimals);
    if (!amount || isNaN(amount) || Number(amount) <= 0 || Number(amount) > max) {
      setError(`Enter a valid amount (max ${max}).`);
      return;
    }
    try {
      // Prepare tx (simulate sending by calling fuseTxFunctions, but you may need to adjust for your contract logic)
      const amountInSmallest = BigInt(Math.floor(Number(amount) * Math.pow(10, decimals)));
      // For demo, just use the first coin objectId as input
      const coinObjectIds = [selectedCoin[1]];
      const tx = sendCoin(
        coinObjectIds,
        amountInSmallest,
        toAddress
      );
      signAndExecuteTransaction({ transaction: tx, chain: "sui:testnet" }, {
        onSuccess: () => setSuccess("Send success!"),
        onError: (e) => setError("Send failed: " + (e.message || "Unknown error")),
      });
    } catch (e) {
      setError("Error: " + (e.message || "Unknown error"));
    }
  };

  return (
    <div className="max-w-md mx-auto mt-10 p-6 bg-white text-black rounded shadow animate-fadeIn">
      <h2 className="text-xl font-bold mb-4">Send Unverified</h2>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Send to (0x...)</label>
        <input
          className={`w-full border rounded p-2 transition-all duration-200 ${error && !isValidAddress(toAddress) ? 'border-red-500 shake' : ''}`}
          value={toAddress}
          onChange={e => setToAddress(e.target.value)}
          placeholder="0x..."
        />
        {error && !isValidAddress(toAddress) && (
          <div className="text-xs text-red-500 mt-1 animate-fadeIn">Please enter a valid 0x address.</div>
        )}
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Coin</label>
        <select
          className={`w-full border rounded p-2 transition-all duration-200 ${error && !selectedCoin ? 'border-red-500 shake' : ''}`}
          value={selectedCoin ? selectedCoin[1] : ""}
          onChange={e => {
            const coin = availableCoins.find(c => c[1] === e.target.value);
            setSelectedCoin(coin);
          }}
        >
          <option value="">Select coin</option>
          {availableCoins.map((coin, idx) => (
            <option key={coin[1]} value={coin[1]}>
              {coin[0]} (Balance: {coinMetadata[idx] ? (Number(coin[2]) / Math.pow(10, coinMetadata[idx]?.decimals || 9)).toLocaleString() : coin[2]})
            </option>
          ))}
        </select>
        {error && !selectedCoin && (
          <div className="text-xs text-red-500 mt-1 animate-fadeIn">Please select a coin.</div>
        )}
      </div>
      <div className="mb-4">
        <label className="block mb-1 font-medium">Amount</label>
        <input
          className={`w-full border rounded p-2 transition-all duration-200 ${error && (isNaN(amount) || Number(amount) <= 0) ? 'border-red-500 shake' : ''}`}
          type="number"
          min="0"
          step="0.000000001"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          placeholder="Amount"
          disabled={!selectedCoin}
        />
        {error && (isNaN(amount) || Number(amount) <= 0) && (
          <div className="text-xs text-red-500 mt-1 animate-fadeIn">Enter a valid amount.</div>
        )}
        {error && selectedCoin && !isNaN(amount) && Number(amount) > 0 && Number(amount) > (coinMetadata[availableCoins.findIndex((c) => c[1] === selectedCoin[1])]?.decimals ? Number(selectedCoin[2]) / Math.pow(10, coinMetadata[availableCoins.findIndex((c) => c[1] === selectedCoin[1])]?.decimals) : Number(selectedCoin[2])) && (
          <div className="text-xs text-red-500 mt-1 animate-fadeIn">Amount exceeds balance.</div>
        )}
      </div>
      <button
        className={`w-full bg-blue-600 text-white py-2 rounded font-bold hover:bg-blue-700 transition-all duration-200 ${success ? 'animate-bounce' : ''}`}
        onClick={handleSend}
        disabled={!account || !selectedCoin || !amount || !isValidAddress(toAddress)}
      >
        Send
      </button>
      {error && !(error.includes('address') || error.includes('coin') || error.includes('amount')) && (
        <div className="mt-3 text-red-600 animate-fadeIn">{error}</div>
      )}
      {success && <div className="mt-3 text-green-600 animate-fadeIn">{success}</div>}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease; }
        @keyframes shake {
          10%, 90% { transform: translateX(-2px); }
          20%, 80% { transform: translateX(4px); }
          30%, 50%, 70% { transform: translateX(-8px); }
          40%, 60% { transform: translateX(8px); }
        }
        .shake { animation: shake 0.4s; }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        .animate-bounce { animation: bounce 0.5s; }
      `}</style>
    </div>
  );
}
