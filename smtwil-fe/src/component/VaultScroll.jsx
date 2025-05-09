"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useCurrentAccount, useSuiClientQueries, useSuiClientQuery } from "@mysten/dapp-kit";
import useMoveStore from "../store/moveStore";

const ContractAlterScroll = () => {
  const account = useCurrentAccount();
  const [coinsInVault, setCoinsInVault] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const packageName = useMoveStore((state) => state.packageName);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [coinTypes, setCoinTypes] = useState([]);
  const [formattedAmounts, setFormattedAmounts] = useState([]);
  const [coinIcon, setCoinIcon] = useState([]);
  const [manualControl, setManualControl] = useState(false);

  // 保留所有原始查詢和資料處理邏輯...
  const vaultAndCap = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address,
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!account?.address,
      staleTime: 30000,
    }
  );
  
  // 保留原始邏輯...
  const getVaultAndCap = useCallback(() => {
    let ownerCapObjects = null;
    let vaultID = null;
    if (vaultAndCap.data) {
      ownerCapObjects = vaultAndCap.data.data.filter((obj) =>
        obj.data?.type?.includes(packageName + "::vault::OwnerCap")
      );
      vaultID = ownerCapObjects[0]?.data?.content?.fields?.vaultID;
    }
    return { ownerCapObjects, vaultID };
  }, [vaultAndCap.data, packageName]);
  
  const { vaultID } = getVaultAndCap();
  
  const vaultList = useSuiClientQuery(
    "getDynamicFields",
    { parentId: vaultID },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  );
  
  const getObjectIds = useCallback(() => {
    if (!vaultList?.data?.data) return [];
    return vaultList.data.data.map((item) => item.objectId);
  }, [vaultList?.data]);
  
  const objectIds = getObjectIds();
  
  const coinData = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: objectIds,
      options: { showContent: true, showType: true },
    },
    {
      enabled: objectIds.length > 0,
      staleTime: 30000,
    }
  );
  
  const coinMetadataQueries = useSuiClientQueries({
    queries: coinTypes.map(coinType => ({
      method: "getCoinMetadata",
      params: {
        coinType: coinType
      }
    })),
    combine: (result) => {
      return {
        data: result.map((res) => res.data),
        isSuccess: result.every((res) => res.isSuccess),
        isPending: result.some((res) => res.isPending),
        isError: result.some((res) => res.isError),
      };
    },
    enabled: coinTypes.length > 0,
    staleTime: 30000,
  });

  // 保留金額格式化邏輯
  useEffect(() => {
    if (!coinMetadataQueries?.data || !coinsInVault.length) 
      return;
    try {
      const formatted = coinsInVault.map((coin, index) => {
        const amount = BigInt(coin[2]);
        const decimals = coinMetadataQueries.data[index]?.decimals || 0;
        const divisor = BigInt(10) ** BigInt(decimals);
        

        let formattedAmount;
        if (divisor === BigInt(1)) {
          formattedAmount = amount.toString();
        } else {
          const integerPart = amount / divisor;
          const fractionalPart = amount % divisor;
          const paddedFractionalPart = fractionalPart.toString().padStart(decimals, '0');
          
          formattedAmount = `${integerPart}.${paddedFractionalPart}`;
          formattedAmount = formattedAmount.replace(/\.?0+$/, '');
        }
        
        return formattedAmount;
      });
      
      setFormattedAmounts(formatted);
    } catch (error) {
      console.error("Error formatting amounts:", error);
    }
  }, [coinMetadataQueries?.data, coinsInVault]);

  // 保留代幣資料處理邏輯
  useEffect(() => {
    if (!coinData.data) return;

    try {
      const processedCoins = [];
      const extractedCoinTypes = [];

      coinData.data.forEach((coinObj) => {
        if (!coinObj?.data?.content) return;

        const type = coinObj.data.type || "";
        const typeMatch = type.match(/<(.+)>/);
        const fullCoinType = typeMatch ? typeMatch[1] : "Unknown";

        let formattedCoinType = "Unknown";
        if (fullCoinType !== "Unknown") {
          const parts = fullCoinType.split("::");
          if (parts.length > 0) {
            const address = parts[0];
            if (address.length > 10) {
              const prefix = address.substring(0, 7);
              const suffix = address.substring(address.length - 5);
              const remainingParts = parts.slice(1).join("::");
              formattedCoinType = `${prefix}...${suffix}::${remainingParts}`;
            } else {
              formattedCoinType = fullCoinType;
            }
          }
        }
        const coinSymbol = fullCoinType.split("::").pop() || "Unknown";
        const amount = coinObj.data?.content?.fields?.balance || "0";

        processedCoins.push([coinSymbol, formattedCoinType, amount, fullCoinType]);
        extractedCoinTypes.push(fullCoinType);
      });

      setCoinsInVault(processedCoins);
      setCoinTypes(extractedCoinTypes);
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing token data:", error);
      setIsLoading(false);
    }
  }, [coinData.data]);


  
  // 簡化 loading 邏輯
  useEffect(() => {
    const isDataLoading = !coinData.data && objectIds.length > 0;
    if (isLoading !== isDataLoading) {
      setIsLoading(isDataLoading);
    }
  }, [coinData.data, objectIds, isLoading]);

  // 優化的自動輪播效果，加入手動控制
  useEffect(() => {
    if (coinsInVault.length <= 1) return;
    
    let timer;
    if (!manualControl) {
      timer = setInterval(() => {
        setAnimating(true);
        setTimeout(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % coinsInVault.length);
          setAnimating(false);
        }, 700); // 增加動畫持續時間為更流暢的效果
      }, 6000); // 增加到6秒切換一次
    }
    
    return () => clearInterval(timer);
  }, [coinsInVault.length, manualControl]);

  // 手動切換到前一個代幣
  const goToPrevious = () => {
    setManualControl(true);
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + coinsInVault.length) % coinsInVault.length);
      setAnimating(false);
    }, 700);
    
    // 6秒後恢復自動輪播
    setTimeout(() => setManualControl(false), 6000);
  };

  // 手動切換到下一個代幣
  const goToNext = () => {
    setManualControl(true);
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % coinsInVault.length);
      setAnimating(false);
    }, 700);
    
    // 6秒後恢復自動輪播
    setTimeout(() => setManualControl(false), 6000);
  };

  // 獲取代幣 ICON，優化使用漸變背景
  const getTokenIcon = (tokenName) => {
    const initials = tokenName.substring(0, 2).toUpperCase();
    // 為每個代幣生成獨特顏色 (基於簡單的哈希)
    const hash = tokenName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    
    return (
      <div 
        className="rounded-full w-8 h-8 flex items-center justify-center text-white text-sm font-bold shadow-lg relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, hsl(${hue}, 80%, 55%), hsl(${(hue+60) % 360}, 85%, 45%))`,
          transform: 'translateZ(0)'
        }}
      >
        <span className="drop-shadow-md z-10">{initials}</span>
        <div className="absolute inset-0 bg-white opacity-20 animate-pulse" 
             style={{animationDuration: '3s'}}></div>
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 to-white/20 rounded-full"></div>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-center w-full">
      <div className="rounded-2xl backdrop-blur-lg bg-white/60 shadow-xl p-0 w-full max-w-3xl h-20 overflow-hidden border border-white/40 transition-all duration-300 hover:shadow-2xl">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
            <p className="text-gray-700 font-medium">正在載入資產...</p>
          </div>
        ) : coinsInVault.length > 0 ? (
          <div className="relative h-full">
            {/* 主要卡片內容 - 橫向布局 */}
            <div className={`transition-all duration-700 ease-in-out transform h-full ${
              animating ? "opacity-0 translate-y-8 scale-98" : "opacity-100 translate-y-0 scale-100"
            }`}>
              <div className="flex items-center justify-between h-full px-6">
                {/* 左側 - 代幣標誌與名稱 */}
                <div className="flex items-center space-x-3">
                  <img href= {coinMetadataQueries.data[currentIndex]?.iconUrl}></img>
                  <div>
                    <div className="text-gray-900 font-semibold tracking-tight">
                      {coinsInVault[currentIndex][0]}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">{coinsInVault[currentIndex][1]}</div>
                  </div>
                </div>
                
                {/* 中間 - 數量 */}
                <div className="flex-1 max-w-xs mx-6">
                  <div className="bg-gradient-to-r from-gray-50/70 to-white/80 rounded-xl p-2.5 transform transition-all duration-300 hover:scale-102 hover:shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="text-gray-800 font-medium text-xs uppercase tracking-wider">數量</div>
                      <div className="text-lg font-bold text-gray-900 tracking-tight">
                        {formattedAmounts[currentIndex] || "0"}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 右側 - 估算價值和控制 */}
                <div className="flex items-center space-x-5">
                  <div className="text-right">
                    <div className="text-gray-800 font-medium text-xs uppercase tracking-wider">估算價值</div>
                    <div className="text-lg font-bold text-gray-900 tracking-tight">-</div>
                  </div>
                  
                  {coinsInVault.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <button 
                        onClick={goToPrevious}
                        className="text-gray-700 hover:text-indigo-600 transition-all p-1 rounded-full hover:bg-white/80 active:scale-95"
                        aria-label="前一個資產"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      
                      <div className="flex space-x-1">
                        {coinsInVault.map((_, index) => (
                          <div 
                            key={index} 
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              index === currentIndex 
                                ? "w-4 bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-sm" 
                                : "w-1.5 bg-gray-300/70 hover:bg-gray-400/80 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (index !== currentIndex) {
                                setManualControl(true);
                                setAnimating(true);
                                setTimeout(() => {
                                  setCurrentIndex(index);
                                  setAnimating(false);
                                }, 700);
                                setTimeout(() => setManualControl(false), 6000);
                              }
                            }}
                          ></div>
                        ))}
                      </div>
                      
                      <button 
                        onClick={goToNext}
                        className="text-gray-700 hover:text-indigo-600 transition-all p-1 rounded-full hover:bg-white/80 active:scale-95"
                        aria-label="下一個資產"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <div className="bg-gradient-to-br from-gray-100/80 to-white/90 rounded-full w-10 h-10 flex items-center justify-center text-gray-400 text-xl mr-4 backdrop-blur-sm shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <p className="text-gray-700 font-semibold">您的金庫中沒有資產</p>
              <p className="text-gray-500 text-xs">添加資產來查看它們</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractAlterScroll;