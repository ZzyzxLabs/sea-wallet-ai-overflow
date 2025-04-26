"use client";
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton, useAutoConnectWallet } from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import useHeirStore from "../../store/heirStore"; // 確保正確引入 store 路徑
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const account = useCurrentAccount();
  const router = useRouter();
  const autoConnectionStatus = useAutoConnectWallet();
  
  // 從 Zustand store 獲取狀態和方法
  const {
    heirs,
    getTotalRatio,
  } = useHeirStore();

  // 如果沒有繼承人資料，可能需要重定向或顯示特定訊息
  useEffect(() => {
    // 僅在客戶端渲染時檢查
    if (typeof window !== 'undefined') {
      // 如果沒有繼承人資料或者資料不完整，可選擇重定向到主頁
      if (!heirs || heirs.length === 0 || !heirs[0].name) {
        // console.log("沒有繼承人資料，顯示空狀態");
        // 如需自動重定向，取消下面的註釋：
        // router.push("/");
      }
    }
  }, [heirs, router]);

  // 100 天倒計時狀態
  const [daysRemaining, setDaysRemaining] = useState(100);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // 設置倒計時
  useEffect(() => {
    // 假設設置一個 100 天後的結束日期
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysRemaining);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference <= 0) {
        // 倒計時結束
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

  // 處理地址顯示格式化
  const formatAddress = (address) => {
    if (!address) return "Not set";
    if (address.includes('@')) return address; // 如果是電子郵件，直接返回
    // 如果是 Sui 地址，返回縮寫形式
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  // 檢查地址類型並返回對應圖標
  const getAddressIcon = (address) => {
    if (!address) return null;
    if (address.startsWith("0x") && !address.includes("@")) {
      return "./sui.svg";
    }
    return "./mail-142.svg";
  };

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
      
      <div className="flex flex-col md:flex-row h-content">
        {/* 左側區域 - 100 天倒計時 */}
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
            
            {/* 重新啟動按鈕 */}
            <div className="mt-6 flex justify-center">
              <button 
                onClick={() => router.push("/")}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
              >
                Restart Process
              </button>
            </div>
          </div>
        </div>

        {/* 右側區域 - 繼承人確認列表 */}
        <div className="flex-1 p-6">
          <div className="bg-white rounded-lg shadow-md p-6 h-full">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Heir Confirmation List
            </h2>

            {heirs && heirs.length > 0 && heirs[0].name ? (
              <div className="space-y-4">
                {heirs.map((heir, index) => (
                  <div
                    key={heir.id}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex justify-between items-center flex-wrap">
                      <div className="mb-2 md:mb-0">
                        <h3 className="text-lg font-medium text-gray-800">
                          {heir.name || `Heir #${index + 1}`}
                        </h3>
                        <div className="flex items-center mt-1">
                          {heir.address && (
                            <img 
                              src={getAddressIcon(heir.address)} 
                              alt="Address Type" 
                              className="h-4 w-4 mr-2"
                            />
                          )}
                          <p className="text-gray-600">
                            <span className="font-medium">Address:</span>{" "}
                            {formatAddress(heir.address)}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center">
                          <span className="mr-2 text-gray-800">Allocation ratio:</span>
                          <span className="font-medium text-gray-800">{heir.ratio}%</span>
                        </div>
                      </div>
                      <div className="flex items-center">
                        {heir.address ? (
                          <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
                            Confirmed
                          </span>
                        ) : (
                          <span className="bg-yellow-100 text-yellow-800 px-4 py-2 rounded-full text-sm font-medium">
                            Not Confirmed
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">
                <p>No heirs have been set up yet.</p>
                <button 
                  onClick={() => router.push("/")}
                  className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  Create Your Will
                </button>
              </div>
            )}

            {heirs && heirs.length > 0 && (
              <div className="mt-4 text-sm text-gray-500 text-right">
                Total allocation ratio: {getTotalRatio()}%
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}