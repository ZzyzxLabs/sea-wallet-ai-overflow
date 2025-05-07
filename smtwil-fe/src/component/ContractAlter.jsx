"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useCurrentAccount, useSuiClientQueries, useSuiClientQuery } from "@mysten/dapp-kit";
import ButtonInContractAlter from "./ButtonInContractAlter";
import useMoveStore from "../store/moveStore";

const ContractAlter = () => {
  const account = useCurrentAccount();
  const [coinsInVault, setCoinsInVault] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const packageName = useMoveStore((state) => state.packageName);
  
  // 存儲幣種小數位數的狀態
  const [coinDecimals, setCoinDecimals] = useState({});
  // 跟踪當前正在查詢的幣種類型
  const [currentCoinType, setCurrentCoinType] = useState(null);
  
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
  console.log("vaultList", vaultList.data);
  
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
  console.log("coinData", coinData.data);
  
  // 獲取幣種小數位數
  const coinMetadataQuery = useSuiClientQuery(
    "getCoinMetadata",
    { coinType: currentCoinType || "" },
    { 
      enabled: !!currentCoinType,
      staleTime: 300000,
    }
  );
  console.log("coinMetadataQuery", coinMetadataQuery.data);
  
  // 處理代幣數據並提取需要查詢的幣種類型
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

          // 檢查是否需要獲取該幣種的小數位數
          if (fullCoinType !== "Unknown" && !coinDecimals[fullCoinType] && !currentCoinType) {
            setCurrentCoinType(fullCoinType);
          }

          return [coinSymbol, formattedCoinType, amount, fullCoinType];
        })
        .filter((coin) => coin !== null);

      setCoinsInVault(processedCoins);
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing token data:", error);
      setIsLoading(false);
    }
  }, [coinData.data, coinDecimals, currentCoinType]);
  
  // 查詢下一個幣種的元數據
  useEffect(() => {
    if (!currentCoinType && coinsInVault.length > 0) {
      const nextCoinToFetch = coinsInVault.find(
        coin => coin[3] && !coinDecimals[coin[3]]
      );
      
      if (nextCoinToFetch) {
        setCurrentCoinType(nextCoinToFetch[3]);
      }
    }
  }, [coinsInVault, coinDecimals, currentCoinType]);

  // 簡化 loading 邏輯
  useEffect(() => {
    const isDataLoading = !coinData.data && objectIds.length > 0;
    if (isLoading !== isDataLoading) {
      setIsLoading(isDataLoading);
    }
  }, [coinData.data, objectIds, isLoading]);


  return (
    <div className="flex justify-center items-center w-full h-fit bg-white">
      <div className="rounded-lg bg-white shadow-md p-4 mb-4 w-1/2">
        <h3 className="text-lg font-medium mb-3 text-center">
          YOUR WILL CONTENT
        </h3>
        <div className="grid grid-cols-2 -gap-2">
          <div className="text-black font-medium">Coin Type</div>
          <div className="text-black font-medium">Amount</div>

          {isLoading ? (
            <div className="col-span-2 py-4 text-center text-gray-500">
              Loading assets...
            </div>
          ) : coinsInVault.length > 0 ? (
            coinsInVault.map((coin, index) => (
              <React.Fragment key={index}>
                <div className="py-2 border-t text-black dark:border-gray-700">
                  {coin[0]}{" "}
                  <span className="text-xs text-gray-500">{coin[1]}</span>
                </div>
                <div className="py-2 border-t text-black dark:border-gray-700">
                  
                   {(coin[2] / Math.pow(10, coinDecimals[index]))}
                </div>
              </React.Fragment>
            ))
          ) : (
            <div className="col-span-2 py-4 text-center text-gray-500">
              No assets in your Vault
            </div>
          )}
        </div>
      </div>
      <ButtonInContractAlter />
    </div>
  );
};

export default ContractAlter;