"use client";
import "@mysten/dapp-kit/dist/index.css";
import {
  ConnectButton,
  useAutoConnectWallet,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import useHeirStore from "../../../store/heirStore"; // 確保正確引入 store 路徑
import { useRouter } from "next/navigation";
import { AllWilllist } from "../../../component/willComponent/willmain";

export default function Dashboard() {
  const account = useCurrentAccount();
  const router = useRouter();
  const autoConnectionStatus = useAutoConnectWallet();

  // 從 Zustand store 獲取狀態和方法
  const { heirs, getTotalRatio } = useHeirStore();

  // 如果沒有繼承人資料，可能需要重定向或顯示特定訊息
  useEffect(() => {
    // 僅在客戶端渲染時檢查
    if (typeof window !== "undefined") {
      // 如果沒有繼承人資料或者資料不完整，可選擇重定向到主頁
      if (!heirs || heirs.length === 0 || !heirs[0].name) {
        // console.log("沒有繼承人資料，顯示空狀態");
        // 如需自動重定向，取消下面的註釋：
        // router.push("/");
      }
    }
  }, [heirs, router]);
  // 倒計時狀態 - 設置為 2 分鐘
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(2);
  const [seconds, setSeconds] = useState(0);

  // 完成度狀態 - 根據截圖添加
  const [completionPercentage, setCompletionPercentage] = useState(86.7);

  // 設置倒計時
  useEffect(() => {
    // 設置一個 30 天後的結束日期
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysRemaining);
    endDate.setHours(endDate.getHours() + hours);
    endDate.setMinutes(endDate.getMinutes() + minutes);
    endDate.setSeconds(endDate.getSeconds() + seconds);

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

  // 模擬繼承人資料 - 根據截圖調整
  const nominatedHeirs = [
    {
      id: 1,
      address: "alexnander99904dj@gmail.com",
      type: "email",
      dateNominated: "Apr 12, 2025",
      allocation: "30%",
    },
    {
      id: 2,
      address: "0x71C7656EC7ab88b09...976F",
      type: "wallet",
      dateNominated: "Apr 12, 2025",
      allocation: "20%",
    },
    {
      id: 3,
      address: "0x77C2344CCEa7ac890...66F8",
      type: "wallet",
      dateNominated: "May 4, 2025",
      allocation: "20%",
    },
    {
      id: 4,
      address: "0x77C2344CCEa7ac890...66F8",
      type: "wallet",
      dateNominated: "May 4, 2025",
      allocation: "20%",
    },
    {
      id: 5,
      address: "0x77C2344CCEa7ac890...66F8",
      type: "wallet",
      dateNominated: "May 4, 2025",
      allocation: "10%",
    },
  ];

  return (
    <div className="flex-1 px-8 py-8 bg-white/50">
      {/* 頂部標題與錢包按鈕 */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Will State</h1>
          <p className="text-sm text-gray-600">
            Monitor your smart will countdown and manage heir distributions
          </p>
        </div>
        <ConnectButton />
      </div>

      {/* 倒計時卡片 */}
      <div className="bg-blue-500/40 rounded-lg mb-6 overflow-hidden">
        <div className="flex flex-col p-6  items-center">
          <div className="flex justify-end mb-2">
          </div>
          <div className="flex justify-center space-x-4 text-white text-5xl font-bold py-10">
            <div className="flex flex-col items-center">
              <span>{daysRemaining}</span>
              <span className="text-sm mt-1">Days</span>
            </div>
            <div className="text-4xl self-start mt-2">:</div>
            <div className="flex flex-col items-center">
              <span>{hours.toString().padStart(2, "0")}</span>
              <span className="text-sm mt-1">Hours</span>
            </div>
            <div className="text-4xl self-start mt-2">:</div>
            <div className="flex flex-col items-center">
              <span>{minutes.toString().padStart(2, "0")}</span>
              <span className="text-sm mt-1">Minutes</span>
            </div>
            <div className="text-4xl self-start mt-2">:</div>
            <div className="flex flex-col items-center">
              <span>{seconds.toString().padStart(2, "0")}</span>
              <span className="text-sm mt-1">Seconds</span>
            </div>
          </div>
          <div className="justify-center"> Till Will Execution</div>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-6">

      </p>
      <AllWilllist
        width="100%"
        height="80vh"
        maxWidth="80vw"

      ></AllWilllist>
      {/* 繼承人列表 */}
      <div className="mb-6 mt-12">
        <h2 className="text-lg font-semibold mb-4">Nominated Heirs</h2>
        <div className="border rounded-lg overflow-hidden">
          {/* 表頭 */}
          <div className="grid grid-cols-12 bg-gray-50 py-3 px-4 border-b">
            <div className="col-span-5">
              <span className="text-sm font-medium text-gray-700">
                Heir Info
              </span>
            </div>
            <div className="col-span-4">
              <span className="text-sm font-medium text-gray-700">
                Date Nominated
              </span>
            </div>
            <div className="col-span-3 text-right">
              <span className="text-sm font-medium text-gray-700">
                Allocation
              </span>
            </div>
          </div>

          {/* 繼承人列表項 */}
          {nominatedHeirs.map((heir) => (
            <div
              key={heir.id}
              className="grid grid-cols-12 py-3 px-4 border-b last:border-b-0"
            >
              <div className="col-span-5 flex items-center">
                <div className="flex-shrink-0 mr-3">
                  {heir.type === "email" ? (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                      />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-gray-800">{heir.address}</span>
              </div>
              <div className="col-span-4 flex items-center">
                <span className="text-sm text-gray-800">
                  {heir.dateNominated}
                </span>
              </div>
              <div className="col-span-3 flex items-center justify-end">
                <span className="text-sm font-medium text-gray-800">
                  {heir.allocation}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
