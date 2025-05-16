"use client";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useCurrentAccount, useSuiClientQueries, useSuiClientQuery } from "@mysten/dapp-kit";
import ButtonInContractAlter from "./ButtonInContractAlter";
import useMoveStore from "../store/moveStore";
import useHeirStore from "../store/heirStore";

const ContractAlter = () => {
  const account = useCurrentAccount();
  const [coinsInVault, setCoinsInVault] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const packageName = useMoveStore((state) => state.packageName);
  const { setVaultName } = useHeirStore(); // Get setter function at component level
  const VaultName = useHeirStore((state) => state.VaultName);
  
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
        obj.data?.type?.includes(packageName + "::seaVault::OwnerCap")
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
  
  // Log vault list data properly
  useEffect(() => {
    if (vaultList.data) {
      console.log("vaultList", vaultList.data);
      
      // Update vault name at the correct place
      if (vaultList.data?.data) {
        setVaultName(vaultList.data.data.map(item => item.name));
      }
    }
  }, [vaultList.data, setVaultName]);
  
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
  
  // Log coin data properly
  useEffect(() => {
    if (coinData.data) {
      console.log("coinData", coinData.data);
    }
  }, [coinData.data]);
  
  // Extract coin types (moved outside of effects)
  const coinTypes = useMemo(() => {
    return coinData.data?.map(coinObj => {
      const type = coinObj?.data?.type || "";
      const typeMatch = type.match(/<(.+)>/);
      return typeMatch ? typeMatch[1] : null;
    }).filter(Boolean) || [];
  }, [coinData.data]);
  
  // Query metadata for each coin type - PROPERLY PLACED AT COMPONENT LEVEL
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
  
  // Log coin metadata properly
  useEffect(() => {
    if (coinMetadataQueries?.data) {
      console.log("Coin metadata:", coinMetadataQueries.data);
    }
  }, [coinMetadataQueries?.data]);

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

  return (
    <div className="flex justify-center items-center w-full h-fit bg-white/30">
      <div className="rounded-lg p-4 mb-4 w-1/2">
        <h3 className="text-lg text-gray-800 font-medium mb-3 text-center">
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
                  {coin[2]/Math.pow(10,coinMetadataQueries.data[index]?.decimals)}{" "}
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