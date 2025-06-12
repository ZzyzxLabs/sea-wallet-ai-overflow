import { useSuiClientQuery, useSuiClientQueries } from "@mysten/dapp-kit"
import { useMemo, useCallback } from "react"

// Type definitions for better type safety
export interface ProcessedCoin {
  symbol: string;
  formattedType: string;
  fullType: string;
  balance: string;
  displayBalance: number;
  decimals: number;
  metadata: any;
  objectId: string;
  rawCoinObject: any;
}

/**
 * Custom hook to get vault and ownerCap information
 * @param accountAddress - User's account address
 * @param packageName - Package name for filtering OwnerCap objects
 * @returns Query result and extracted vault data
 */
export const useVaultAndOwnerCap = (accountAddress: string, packageName: string) => {
  // Query vault and owner cap objects
  const vaultAndCapQuery = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: accountAddress,
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!accountAddress,
      staleTime: 30000,
    }
  );
  // Extract vault ID and ownerCap objects
  const getVaultAndCap = () => {
    let ownerCapObjects: any[] = [];
    let vaultID: string | null = null;
    
    if (vaultAndCapQuery.data) {
      ownerCapObjects = vaultAndCapQuery.data.data.filter((obj: any) =>
        obj.data?.type?.includes(packageName + "::seaVault::OwnerCap")
      );
      vaultID = ownerCapObjects[0]?.data?.content?.fields?.vaultID || null;
    }
    
    return { ownerCapObjects, vaultID };
  };

  const { ownerCapObjects, vaultID } = getVaultAndCap();
  // Get the owner cap ID for transaction parameters
  const ownerCapId = ownerCapObjects?.[0]?.data?.objectId || null;

  return {
    vaultAndCapQuery,
    ownerCapObjects,
    vaultID,
    ownerCapId,
    getVaultAndCap
  };
};

/**
 * Custom hook to get vault dynamic fields
 * @param vaultID - ID of the vault to query
 * @returns Query result with vault dynamic fields
 */
export const useVaultList = (vaultID: string) => {
  return useSuiClientQuery(
    "getDynamicFields",
    { parentId: vaultID },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  );
};

/**
 * Custom hook for finding vault with basic functionality
 * @param address - User's address to find vault for
 * @returns Query result with vault information
 */
export const useFindVault = (address: string) => {
    const inventory = useSuiClientQuery(
        "getOwnedObjects",
        {
            owner: address,
            options: { showType: true, showContent: true },
        },
        {
            enabled: !!address,
            staleTime: 30000,
        }
    );

    // Process the data to extract vault-related objects
    const processedData = {
        ...inventory,
        vaultObjects: inventory.data?.data?.filter((obj: any) => 
            obj.data?.type?.includes("::seaVault::")
        ) || [],
        ownerCapObjects: inventory.data?.data?.filter((obj: any) => 
            obj.data?.type?.includes("::seaVault::OwnerCap")
        ) || []
    };

    return processedData;
};

/**
 * Custom hook to get vault object details
 * @param vaultID - ID of the vault to query
 * @returns Query result with vault object details
 */
export const useVaultObject = (vaultID: string) => {
  return useSuiClientQuery(
    "getObject",
    {
      id: vaultID,
      options: { showContent: true, showType: true },
    },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  );
};

/**
 * Comprehensive hook that provides complete vault information and methods
 * @param accountAddress - User's account address
 * @param packageName - Package name for filtering OwnerCap objects
 * @returns Complete vault data with all methods and refetch capabilities
 */
export const useSeaVault = (accountAddress: string, packageName: string) => {
  // Get vault and owner cap information
  const vaultAndCapData = useVaultAndOwnerCap(accountAddress, packageName);
  const { vaultID, ownerCapId, ownerCapObjects } = vaultAndCapData;

  // Get vault dynamic fields (objects inside vault)
  const vaultListData = useVaultList(vaultID || "");
  
  // Get vault object details
  const vaultObjectData = useVaultObject(vaultID || "");

  // Get object IDs from vault list
  const getObjectIds = useCallback(() => {
    if (!vaultListData?.data?.data) return [];
    return vaultListData.data.data.map((item: any) => item.objectId);
  }, [vaultListData?.data]);

  const objectIds = getObjectIds();

  // Query all objects inside the vault
  const vaultContentsQuery = useSuiClientQuery(
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

  // Extract coin types from vault contents
  const coinTypes = useMemo(() => {
    return (
      vaultContentsQuery.data
        ?.map((coinObj: any) => {
          const type = coinObj?.data?.type || "";
          const typeMatch = type.match(/<(.+)>/);
          return typeMatch ? typeMatch[1] : null;
        })
        .filter(Boolean) || []
    );
  }, [vaultContentsQuery.data]);

  // Query metadata for each coin type
  const coinMetadataQueries = useSuiClientQueries({
    queries: coinTypes.map((coinType: string) => ({
      method: "getCoinMetadata" as const,
      params: {
        coinType: coinType,
      },
    })),
    combine: (result: any) => {
      return {
        data: result.map((res: any) => res.data),
        isSuccess: result.every((res: any) => res.isSuccess),
        isPending: result.some((res: any) => res.isPending),
        isError: result.some((res: any) => res.isError),
      };
    },
    enabled: coinTypes.length > 0,
    staleTime: 30000,
  });

  // Process coins data for easy consumption
  const processedCoins = useMemo(() => {
    if (!vaultContentsQuery.data || !coinMetadataQueries.data) return [];

    try {
      return vaultContentsQuery.data
        .map((coinObj: any, index: number) => {
          if (!coinObj?.data?.content) return null;

          const type = coinObj.data.type || "";
          const typeMatch = type.match(/<(.+)>/);
          const fullCoinType = typeMatch ? typeMatch[1] : "Unknown";

          // Format coin type for display
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
          const balance = coinObj.data?.content?.fields?.balance || "0";
          const metadata = coinMetadataQueries.data[index];
          const decimals = metadata?.decimals || 0;
          const displayBalance = parseFloat(balance) / Math.pow(10, decimals);

          return {
            symbol: coinSymbol,
            formattedType: formattedCoinType,
            fullType: fullCoinType,
            balance: balance,
            displayBalance: displayBalance,
            decimals: decimals,
            metadata: metadata,
            objectId: coinObj.data.objectId,
            rawCoinObject: coinObj
          };
        })
        .filter((coin: any) => coin !== null);
    } catch (error) {
      console.error("Error processing coin data:", error);
      return [];
    }
  }, [vaultContentsQuery.data, coinMetadataQueries.data]);

  // Normalize coin type addresses helper
  const normalizeType = useCallback((typeStr: string) => {
    return typeStr.replace(/^0x0+/, "0x");
  }, []);
  // Refetch all vault-related data
  const refetchAll = useCallback(() => {
    vaultAndCapData.vaultAndCapQuery.refetch();
    vaultListData.refetch();
    vaultObjectData.refetch();
    vaultContentsQuery.refetch();
  }, [vaultAndCapData.vaultAndCapQuery, vaultListData, vaultObjectData, vaultContentsQuery]);

  // Get methods for easy access
  const getMethods = {
    getVaultID: () => vaultID,
    getOwnerCap: () => ownerCapObjects?.[0],
    getOwnerCapId: () => ownerCapId,
    getVaultContents: () => vaultContentsQuery.data,
    getVaultObject: () => vaultObjectData.data,
    getVaultList: () => vaultListData.data,
    getObjectIds: getObjectIds,
    getProcessedCoins: () => processedCoins,
    getCoinTypes: () => coinTypes,
    getCoinMetadata: () => coinMetadataQueries.data,
    normalizeType: normalizeType,
  };
  return {
    // Current data
    vaultID,
    ownerCap: ownerCapObjects?.[0],
    ownerCapId,
    ownerCapObjects: ownerCapObjects || [],
    vaultContents: vaultContentsQuery.data,
    vaultObject: vaultObjectData.data,
    vaultList: vaultListData.data,
    objectIds,
    
    // Coin-specific data
    coinTypes,
    coinMetadata: coinMetadataQueries.data,
    processedCoins,
    coinsInVault: processedCoins, // Alias for backward compatibility

    // Query states
    data: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.data,
      vaultList: vaultListData.data,
      vaultObject: vaultObjectData.data,
      vaultContents: vaultContentsQuery.data,
      coinMetadata: coinMetadataQueries.data,
    },

    // Error states
    error: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.error,
      vaultList: vaultListData.error,
      vaultObject: vaultObjectData.error,
      vaultContents: vaultContentsQuery.error,
      coinMetadata: coinMetadataQueries.isError,
    },

    // Loading states
    isLoading: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.isPending,
      vaultList: vaultListData.isPending,
      vaultObject: vaultObjectData.isPending,
      vaultContents: vaultContentsQuery.isPending,
      coinMetadata: coinMetadataQueries.isPending,
      any: vaultAndCapData.vaultAndCapQuery.isPending || 
           vaultListData.isPending || 
           vaultObjectData.isPending || 
           vaultContentsQuery.isPending ||
           coinMetadataQueries.isPending,
    },

    // Success states
    isSuccess: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.isSuccess,
      vaultList: vaultListData.isSuccess,
      vaultObject: vaultObjectData.isSuccess,
      vaultContents: vaultContentsQuery.isSuccess,
      coinMetadata: coinMetadataQueries.isSuccess,
      all: vaultAndCapData.vaultAndCapQuery.isSuccess && 
           vaultListData.isSuccess && 
           vaultObjectData.isSuccess && 
           vaultContentsQuery.isSuccess &&
           coinMetadataQueries.isSuccess,
    },

    // Refetch methods
    refetch: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.refetch,
      vaultList: vaultListData.refetch,
      vaultObject: vaultObjectData.refetch,
      vaultContents: vaultContentsQuery.refetch,
      coinMetadata: () => {
        // Since useSuiClientQueries doesn't return refetch directly, 
        // we'll trigger a refetch through the parent
        vaultContentsQuery.refetch();
      },
      all: refetchAll,
    },

    // Get methods
    get: getMethods,

    // Helper methods
    helpers: {
      hasVault: () => !!vaultID,
      hasOwnerCap: () => !!ownerCapId,
      isEmpty: () => objectIds.length === 0,
      hasCoins: () => processedCoins.length > 0,
      isReady: () => !!vaultID && !!ownerCapId && vaultContentsQuery.isSuccess,
      getCoinBySymbol: (symbol: string) => processedCoins.find(coin => coin.symbol === symbol),
      getCoinByType: (type: string) => processedCoins.find(coin => coin.fullType === type),
      getTotalUniqueCoins: () => processedCoins.length,
      normalizeType: normalizeType,
    }
  };
};

// Object with hook-based methods for easy access
export const seaVault = {
    findVault: useFindVault,
    useVaultAndOwnerCap: useVaultAndOwnerCap,
    useVaultList: useVaultList,
    useVaultObject: useVaultObject,
    useSeaVault: useSeaVault,
};