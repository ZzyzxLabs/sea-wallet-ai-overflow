/**
 * Vault and OwnerCap utility functions for SeaVault
 */
import { CoinBalance, CoinStruct, DynamicFieldInfo, PaginatedCoins, SuiObjectResponse, SuiClient } from "@mysten/sui/client";

const packageID = '0x1' //TODO

/**
 * Function to get all coins or filter by specific coin type
 * @param {SuiClient} suiClient - Sui client instance  
 * @param {string} address - Owner address
 * @param {Object} params - Parameters object
 * @param {string} [params.type] - Optional coin type to filter by
 * @returns {Promise<CoinStruct[] | undefined>} Array of coins or undefined if pending
 */
export async function getCoin(params: { suiClient: SuiClient, address: string, type?: string }): Promise<CoinStruct[] | undefined > {
    try {
        const result = await params.suiClient.getAllCoins({
            owner: params.address
        });
        
        if (result && result.data) {
            if (!params.type) {
                return result.data;
            } else {
                return result.data.filter(item => item.coinType === params.type);
            }
        }
    } catch (error) {
        console.error('Error in getCoin:', error);
        throw error;
    }
    return undefined;
}

/**
 * Function to get dynamic fields for a specific object
 * @param {SuiClient} suiClient - Sui client instance
 * @param {Object} params - Parameters object
 * @param {string} params.object - Object ID to get dynamic fields for
 * @returns {Promise<DynamicFieldInfo[] | undefined>} Array of dynamic field info or undefined if pending
 */
export async function getDynamicF(params: { suiClient: SuiClient, object: string }): Promise<DynamicFieldInfo[] | undefined> {
    try {
        const result = await params.suiClient.getDynamicFields({
            parentId: params.object
        });
        
        if (result && result.data) {
            return result.data;
        }
    } catch (error) {
        console.error('Error in getDynamicF:', error);
        throw error;
    }
    return undefined;
}


/**
 * Function to get vault and ownerCap information
 * @param {SuiClient} suiClient - Sui client instance
 * @param {string} accountAddress - User's account address
 * @param {string} packageName - Package name for filtering OwnerCap objects
 * @returns {Object} Vault and ownerCap data
 */
export async function getVaultAndOwnerCap(params: { suiClient: SuiClient, accountAddress: string, packageName: string }): Promise<{ ownerCapObjects: SuiObjectResponse[] | null, vaultID: string | null, ownerCapId: string | null } | undefined> {
    try {
        const result = await params.suiClient.getOwnedObjects({
            owner: params.accountAddress,
            options: { showType: true, showContent: true }
        });
        
        if (result && result.data) {
            const ownerCapObjects = result.data.filter((obj) =>
                obj.data?.type?.includes(params.packageName + "::sea_vault::OwnerCap")
            );
            
            const vaultID = (ownerCapObjects[0]?.data?.content as any)?.fields?.vaultID || null;
            const ownerCapId = ownerCapObjects[0]?.data?.objectId || null;
            
            return { ownerCapObjects, vaultID, ownerCapId };
        }
    } catch (error) {
        console.error('Error in getVaultAndOwnerCap:', error);
        throw error;
    }
    return undefined;
}

/**
 * Function to get vault dynamic fields
 * @param {SuiClient} suiClient - Sui client instance
 * @param {string} vaultID - ID of the vault to query
 * @returns {Object} Vault dynamic fields data
 */
export async function getVaultDynamicFields(params: { suiClient: SuiClient, vaultID: string }): Promise<DynamicFieldInfo[] | undefined> {
    try {
        const result = await params.suiClient.getDynamicFields({
            parentId: params.vaultID
        });
        
        if (result && result.data) {
            return result.data;
        }
    } catch (error) {
        console.error('Error in getVaultDynamicFields:', error);
        throw error;
    }
    return undefined;
}

/**
 * Function to get objects of a certain type owned by an address
 * @param {SuiClient} suiClient - Sui client instance
 * @param {Object} params - Parameters object
 * @param {string} address - Address to query
 * @param {string} params.type - Object type to filter by (partial match)
 * @returns {Promise<SuiObjectResponse[] | undefined>} Array of objects matching the type or undefined if pending
 */
export async function getCertainType(params: { suiClient: SuiClient, address: string, type: string }): Promise<SuiObjectResponse[] | undefined> {
    try {
        const result = await params.suiClient.getOwnedObjects({
            owner: params.address,
            options: { showType: true, showContent: true }
        });
        
        if (result && result.data) {
            return result.data.filter(item => item.data?.type?.includes(params.type));
        }
    } catch (error) {
        console.error('Error in getCertainType:', error);
        throw error;
    }
    return undefined;
}