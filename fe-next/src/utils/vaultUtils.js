/**
 * Vault and OwnerCap utility functions for SeaVault
 */
import { useSuiClientQuery } from "@mysten/dapp-kit";

/**
 * Custom hook to get vault and ownerCap information
 * @param {string} accountAddress - User's account address
 * @param {string} packageName - Package name for filtering OwnerCap objects
 * @returns {Object} Query result and extracted vault data
 */
export const useVaultAndOwnerCap = (accountAddress, packageName) => {
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
    let ownerCapObjects = null;
    let vaultID = null;
    
    if (vaultAndCapQuery.data) {
      ownerCapObjects = vaultAndCapQuery.data.data.filter((obj) =>
        obj.data?.type?.includes(packageName + "::seaVault::OwnerCap")
      );
      vaultID = ownerCapObjects[0]?.data?.content?.fields?.vaultID;
    }
    
    return { ownerCapObjects, vaultID };
  };

  const { ownerCapObjects, vaultID } = getVaultAndCap();

  // Get the owner cap ID for transaction parameters
  const ownerCapId = ownerCapObjects?.[0]?.data?.objectId;

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
 * @param {string} vaultID - ID of the vault to query
 * @returns {Object} Query result with vault dynamic fields
 */
export const useVaultList = (vaultID) => {
  return useSuiClientQuery(
    "getDynamicFields",
    { parentId: vaultID },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  );
};
