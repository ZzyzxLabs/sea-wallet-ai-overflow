"use client";
import React, { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import ButtonInContractAlter from "./ButtonInContractAlter";

const ContractAlter = () => {
  const account = useCurrentAccount();
  const [coinsInVault, setCoinsInVault] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // 查詢 vault 和 owner cap
  const vaultAndCap = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address,
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!account,
    }
  );

  // 從結果中提取 vault ID
  const vaultId = React.useMemo(() => {
    if (!vaultAndCap.data) return null;

    const ownerCapObjects = vaultAndCap.data.data.filter((obj) =>
      obj.data?.type?.includes("::vault::OwnerCap")
    );

    if (ownerCapObjects && ownerCapObjects.length > 0) {
      return ownerCapObjects[0]?.data?.content?.fields?.vault_id;
    }
    return null;
  }, [vaultAndCap.data]);

  // 查詢 vault 中的動態字段
  const vaultList = useSuiClientQuery(
    "getDynamicFields",
    {
      parentId: vaultId,
    },
    {
      enabled: !!vaultId,
    }
  );

  // 從 vaultList 獲取 objectId 列表
  const objectIds = React.useMemo(() => {
    if (!vaultList?.data?.data) return [];
    return vaultList.data.data.map(item => item.objectId);
  }, [vaultList?.data]);

  // 使用 multiGetObjects 獲取所有代幣對象
  const coinData = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: objectIds,
      options: { showContent: true, showType: true }
    },
    {
      enabled: objectIds.length > 0,
    }
  );

  // 當代幣資料載入完成後處理資料
  useEffect(() => {
    if (!coinData.data) {
      return;
    }

    try {
      const processedCoins = coinData.data.map(coinObj => {
        if (!coinObj?.data?.content) return null;
        
        // 解析代幣類型
        const type = coinObj.data.type || "";
        const typeMatch = type.match(/<(.+)>/);
        const fullCoinType = typeMatch ? typeMatch[1] : "Unknown";
        
        // 格式化代幣地址 (0x12345...67890::後面部分)
        let formattedCoinType = "Unknown";
        if (fullCoinType !== "Unknown") {
          const parts = fullCoinType.split("::");
          if (parts.length > 0) {
            const address = parts[0];
            // 如果地址長度足夠，取前5位和後5位
            if (address.length > 10) {
              const prefix = address.substring(0, 7); // 0x + 前5位
              const suffix = address.substring(address.length - 5);
              const remainingParts = parts.slice(1).join("::");
              formattedCoinType = `${prefix}...${suffix}::${remainingParts}`;
            } else {
              formattedCoinType = fullCoinType;
            }
          }
        }
        
        // 獲取代幣符號（通常是最後一部分）
        const coinSymbol = fullCoinType.split("::").pop() || "Unknown";
        
        // 獲取代幣金額
        const amount = coinObj.data?.content?.fields?.balance || "0";
        
        return [coinSymbol, formattedCoinType, amount];
      }).filter(coin => coin !== null);

      setCoinsInVault(processedCoins);
      setIsLoading(false);
    } catch (error) {
      console.error("處理代幣資料時發生錯誤:", error);
      setIsLoading(false);
    }
  }, [coinData.data]);

  // 設定載入狀態
  useEffect(() => {
    setIsLoading(!coinData.data && objectIds.length > 0);
  }, [coinData.data, objectIds]);

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
              正在載入資產...
            </div>
          ) : coinsInVault.length > 0 ? (
            coinsInVault.map((coin, index) => (
              <React.Fragment key={index}>
                <div className="py-2 border-t text-black dark:border-gray-700">
                  {coin[0]}{" "}
                  <span className="text-xs text-gray-500">{coin[1]}</span>
                </div>
                <div className="py-2 border-t text-black dark:border-gray-700">
                  {coin[2]}
                </div>
              </React.Fragment>
            ))
          ) : (
            <div className="col-span-2 py-4 text-center text-gray-500">
              無資產在您的 Vault 中
            </div>
          )}
        </div>
      </div>
      <ButtonInContractAlter />
    </div>
  );
};

export default ContractAlter;