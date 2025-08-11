/**
 * Vault utility hooks for SeaVault
 * These hooks provide React-friendly interfaces for vault operations
 */
import { useSuiClientQuery, useCurrentAccount, useSuiClient } from "@mysten/dapp-kit";
import { useState, useEffect, useCallback } from "react";
import { getVaultAndOwnerCap, getVaultDynamicFields } from "../utils/queryer";
import { package_addr } from "@/utils/package";
import { DynamicFieldInfo, SuiObjectResponse } from "@mysten/sui/client";

/**
 * Custom hook to get vault and ownerCap information using React Query patterns
 * @param accountAddress - User's account address
 * @param packageName - Package name for filtering OwnerCap objects
 * @returns Query result and extracted vault data
 */
export const useVaultAndOwnerCap = (accountAddress?: string, packageName?: string) => {
  // Query vault and owner cap objects using the Sui client query hook
  const vaultAndCapQuery = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: accountAddress || "",
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!accountAddress,
      staleTime: 30000,
    }
  );

  // Extract vault ID and ownerCap objects
  const getVaultAndCap = useCallback(() => {
    let ownerCapObjects: SuiObjectResponse[] | null = null;
    let vaultID: string | null = null;
    
    if (vaultAndCapQuery.data && packageName) {
      ownerCapObjects = vaultAndCapQuery.data.data.filter((obj) =>
        obj.data?.type?.includes(packageName + "::sea_vault::OwnerCap")
      );
      vaultID = (ownerCapObjects[0]?.data?.content as any)?.fields?.vaultID || null;
    }
    
    return { ownerCapObjects, vaultID };
  }, [vaultAndCapQuery.data, packageName]);

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
 * Custom hook to get vault dynamic fields using React Query patterns
 * @param vaultID - ID of the vault to query
 * @returns Query result with vault dynamic fields
 */
export const useVaultList = (vaultID?: string) => {
  return useSuiClientQuery(
    "getDynamicFields",
    { parentId: vaultID || "" },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  );
};

/**
 * Combined hook that provides complete vault information
 * This replicates the async approach but with React hooks
 */
export const useVaultInfo = () => {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageName = package_addr;
  
  const [vaultData, setVaultData] = useState<{
    ownerCapObjects: SuiObjectResponse[] | null;
    vaultID: string | null;
    ownerCapId: string | null;
  } | null>(null);
  
  const [dynamicFields, setDynamicFields] = useState<DynamicFieldInfo[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchVaultData = useCallback(async () => {
    if (!account?.address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const vaultResult = await getVaultAndOwnerCap({
        suiClient,
        accountAddress: account.address,
        packageName: packageName
      });
      
      setVaultData(vaultResult || null);

      if (vaultResult?.vaultID) {
        const dynamicFieldsResult = await getVaultDynamicFields({
          suiClient,
          vaultID: vaultResult.vaultID
        });
        
        setDynamicFields(dynamicFieldsResult || null);
      }
    } catch (err) {
      console.error("Error fetching vault data:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsLoading(false);
    }
  }, [account?.address, suiClient, packageName]);

  useEffect(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  const refetch = useCallback(() => {
    fetchVaultData();
  }, [fetchVaultData]);

  return {
    vaultData,
    dynamicFields,
    isLoading,
    error,
    refetch
  };
};

/**
 * Hook to get object IDs from dynamic fields
 */
export const useObjectIds = (dynamicFields: DynamicFieldInfo[] | null) => {
  return useCallback(() => {
    if (!dynamicFields) return [];
    return dynamicFields.map((item) => item.objectId);
  }, [dynamicFields]);
};
