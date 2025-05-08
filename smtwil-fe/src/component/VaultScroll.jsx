"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useCurrentAccount, useSuiClientQueries, useSuiClientQuery } from "@mysten/dapp-kit";
import ButtonInContractAlter from "./ButtonInContractAlter";
import useMoveStore from "../store/moveStore";

const ContractAlterScroll = () => {
  const account = useCurrentAccount();
  const [coinsInVault, setCoinsInVault] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const packageName = useMoveStore((state) => state.packageName);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  
  // Query vault and owner cap
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
  
  // Extract vault ID
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
  
  // Query dynamic fields
  const vaultList = useSuiClientQuery(
    "getDynamicFields",
    { parentId: vaultID },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  );
  
  // Get objectIds
  const getObjectIds = useCallback(() => {
    if (!vaultList?.data?.data) return [];
    return vaultList.data.data.map((item) => item.objectId);
  }, [vaultList?.data]);
  
  const objectIds = getObjectIds();
  
  // Query coin data
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
  
  // 處理代幣數據
  useEffect(() => {
    if (!coinData.data) return;

    try {
      const processedCoins = coinData.data
        .map((coinObj) => {
          if (!coinObj?.data?.content) return null;

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

          return [coinSymbol, formattedCoinType, amount];
        })
        .filter((coin) => coin !== null);

      setCoinsInVault(processedCoins);
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

  // 自動輪播效果
  useEffect(() => {
    if (coinsInVault.length <= 1) return;
    
    const timer = setInterval(() => {
      setAnimating(true);
      setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % coinsInVault.length);
        setAnimating(false);
      }, 500); // 動畫持續時間
    }, 5000); // 每5秒切換一次
    
    return () => clearInterval(timer);
  }, [coinsInVault.length]);

  // 獲取代幣首字母作為 ICON
  const getTokenInitials = (tokenName) => {
    return tokenName.substring(0, 2).toUpperCase();
  };

  return (
    <div className="flex justify-center items-center w-full h-fit bg-white">
      <div className="rounded-lg bg-gray-100 shadow-md p-0 mb-4 w-full max-w-md overflow-hidden">
        {isLoading ? (
          <div className="py-8 text-center text-gray-500">
            Loading assets...
          </div>
        ) : coinsInVault.length > 0 ? (
          <div className={`transition-all duration-500 ${
            animating ? "transform -translate-y-16 opacity-0" : "transform translate-y-0 opacity-100"
          }`}>
            <div className="grid grid-cols-3 gap-0 items-center p-4">
              <div className="col-span-1 flex flex-col items-start">
                <div className="bg-red-900 rounded-full w-16 h-16 flex items-center justify-center text-white text-xl font-bold mb-2">
                  {getTokenInitials(coinsInVault[currentIndex][0])}
                </div>
                <div className="text-black font-medium text-lg">{coinsInVault[currentIndex][0]}</div>
                <div className="text-xs text-gray-500">price</div>
              </div>
              <div className="col-span-1 text-center">
                <div className="text-black font-medium mb-1">amount</div>
                <div className="text-xl font-semibold">{coinsInVault[currentIndex][2]}</div>
              </div>
              <div className="col-span-1 text-right">
                <div className="text-black font-medium mb-1">value</div>
                <div className="text-xl font-semibold text-gray-500">-</div>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">
            No assets in your Vault
          </div>
        )}
      </div>
      <ButtonInContractAlter />
    </div>
  );
};

export default ContractAlterScroll;