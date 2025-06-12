import { useSuiClientQuery } from "@mysten/dapp-kit"

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
    let ownerCapObjects: any[] | null = null;
    let vaultID: string | null = null;
    
    if (vaultAndCapQuery.data) {
      ownerCapObjects = vaultAndCapQuery.data.data.filter((obj: any) =>
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
  const getObjectIds = () => {
    if (!vaultListData?.data?.data) return [];
    return vaultListData.data.data.map((item: any) => item.objectId);
  };

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

  // Refetch all vault-related data
  const refetchAll = () => {
    vaultAndCapData.vaultAndCapQuery.refetch();
    vaultListData.refetch();
    vaultObjectData.refetch();
    vaultContentsQuery.refetch();
  };

  // Get methods for easy access
  const getMethods = {
    getVaultID: () => vaultID,
    getOwnerCap: () => ownerCapObjects?.[0],
    getOwnerCapId: () => ownerCapId,
    getVaultContents: () => vaultContentsQuery.data,
    getVaultObject: () => vaultObjectData.data,
    getVaultList: () => vaultListData.data,
    getObjectIds: getObjectIds,
  };

  return {
    // Current data
    vaultID,
    ownerCap: ownerCapObjects?.[0],
    ownerCapId,
    ownerCapObjects,
    vaultContents: vaultContentsQuery.data,
    vaultObject: vaultObjectData.data,
    vaultList: vaultListData.data,
    objectIds,

    // Query states
    data: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.data,
      vaultList: vaultListData.data,
      vaultObject: vaultObjectData.data,
      vaultContents: vaultContentsQuery.data,
    },

    // Error states
    error: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.error,
      vaultList: vaultListData.error,
      vaultObject: vaultObjectData.error,
      vaultContents: vaultContentsQuery.error,
    },

    // Loading states
    isLoading: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.isPending,
      vaultList: vaultListData.isPending,
      vaultObject: vaultObjectData.isPending,
      vaultContents: vaultContentsQuery.isPending,
      any: vaultAndCapData.vaultAndCapQuery.isPending || 
           vaultListData.isPending || 
           vaultObjectData.isPending || 
           vaultContentsQuery.isPending,
    },

    // Success states
    isSuccess: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.isSuccess,
      vaultList: vaultListData.isSuccess,
      vaultObject: vaultObjectData.isSuccess,
      vaultContents: vaultContentsQuery.isSuccess,
      all: vaultAndCapData.vaultAndCapQuery.isSuccess && 
           vaultListData.isSuccess && 
           vaultObjectData.isSuccess && 
           vaultContentsQuery.isSuccess,
    },

    // Refetch methods
    refetch: {
      vaultAndCap: vaultAndCapData.vaultAndCapQuery.refetch,
      vaultList: vaultListData.refetch,
      vaultObject: vaultObjectData.refetch,
      vaultContents: vaultContentsQuery.refetch,
      all: refetchAll,
    },

    // Get methods
    get: getMethods,

    // Helper methods
    helpers: {
      hasVault: () => !!vaultID,
      hasOwnerCap: () => !!ownerCapId,
      isEmpty: () => objectIds.length === 0,
      isReady: () => !!vaultID && !!ownerCapId && vaultContentsQuery.isSuccess,
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