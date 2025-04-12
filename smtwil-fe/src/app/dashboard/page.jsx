"use client";
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton, useAutoConnectWallet } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import useHeirStore from "../../store/heirStore"; // Ensure correct import path for store

export default function dashboard() {
  const account = useCurrentAccount();
  const autoConnectionStatus = useAutoConnectWallet();
  console.log("autoConnectionStatus", autoConnectionStatus);

  // Get states and methods from Zustand store
  const {
    isConnecting,
    showWelcome,
    showNextCard,
    showDashboardIndicator, // New: Get dashboard indicator state
    showWarning,
    warningMessage,
    heirs,

    setIsConnecting,
    setShowWelcome,
    setShowNextCard,
    closeWarning,
    setHeirs,
    addHeir,
    removeHeir,
    updateHeir,
    getTotalRatio,
    handleVerify,
  } = useHeirStore();
  useEffect(() => {
    // 範例繼承人數據
    const exampleHeirs = [
      { id: 1, email: "alice@example.com", ratio: "50" },
      { id: 2, email: "bob@example.com", ratio: "30" },
      { id: 3, email: "charlie@example.com", ratio: "20" },
    ];

    // 更新 store 中的數據
    setHeirs(exampleHeirs);
  }, []);
  // 100 days countdown state
  const [daysRemaining, setDaysRemaining] = useState(100);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Set up countdown
  useEffect(() => {
    // Assuming setting an end date 100 days from now
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysRemaining);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference <= 0) {
        // Countdown ended
        clearInterval(timer);
        setDaysRemaining(0);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hrs = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((difference % (1000 * 60)) / 1000);

        setDaysRemaining(days);
        setHours(hrs);
        setMinutes(mins);
        setSeconds(secs);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="p-4 absolute top-0 right-0">
        <ConnectButton />
      </div>

      {/* 標題區域 */}
      <div className="bg-blue-300 py-8">
        <h1 className="text-3xl text-gray-800 font-bold text-center">
          Will Center
        </h1>
        <p className="text-lg text-gray-800 font-semibold text-center mt-2">
          Inspect and Alter your Smart Will
        </p>
      </div>
      <div className="flex flex-row h-content">
        {/* Left area - 100 days countdown */}
        <div className="flex-1 bg-secondary p-6">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Smart Will Countdown
            </h2>
            <div className="bg-gray-100 rounded-lg p-6">
              <div className="text-center">
                <div className="text-5xl font-bold text-primary mb-4">
                  {daysRemaining}
                </div>
                <div className="text-xl font-medium text-gray-700">Days</div>
              </div>

              <div className="flex justify-center mt-4 space-x-4">
                <div className="text-center">
                  <div className="text-2xl text-gray-600 font-bold">
                    {hours}
                  </div>
                  <div className="text-sm text-gray-600">Hours</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-gray-600 font-bold">
                    {minutes}
                  </div>
                  <div className="text-sm text-gray-600">Minutes</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl text-gray-600 font-bold">
                    {seconds}
                  </div>
                  <div className="text-sm text-gray-600">Seconds</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right area - Heir confirmation list */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            <h2 className="text-2xl font-semibold text-gray-800">
              Heir Confirmation List
            </h2>

            {heirs && heirs.length > 0 ? (
              <div className="space-y-4">
                {heirs.map((heir, index) => (
                  <div
                    key={heir.id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-medium">
                          Heir #{index + 1}
                        </h3>
                        <p className="text-gray-600 mt-1">
                          <span className="font-medium">Email:</span>{" "}
                          {heir.email || "Not set"}
                        </p>
                        <div className="mt-2 flex items-center">
                          <span className="mr-2">Allocation ratio:</span>
                          <span className="font-medium">{heir.ratio}%</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {heir.email ? (
                          <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                            Set
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
                            Not set
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>No heirs have been set up yet</p>
              </div>
            )}

            <div className="mt-4 text-sm text-gray-500 text-right">
              Total allocation ratio: {getTotalRatio()}%
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
