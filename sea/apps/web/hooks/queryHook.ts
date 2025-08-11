/**
 * Vault and OwnerCap utility functions for SeaVault
 */
import { useSuiClientQuery, useSuiClientQueries, useCurrentAccount } from "@mysten/dapp-kit";
import { CoinBalance, CoinStruct, DynamicFieldInfo, PaginatedCoins, SuiObjectResponse } from "@mysten/sui/client";

const packageID = '0x1' //TODO

/**
 * Function to get all coins or filter by specific coin type
 * @param {Object} params - Parameters object
 * @param {string} [params.type] - Optional coin type to filter by
 * @returns {Promise<CoinStruct[] | undefined>} Array of coins or undefined if pending
 */
export async function getCoin(params: { type?: string }): Promise<CoinStruct[] | undefined > {
    const ac = useCurrentAccount();
    const address = ac?.address;
    const prope = await useSuiClientQuery(
        'getAllCoins',
        { owner: address },
    );
    if(!prope.isPending){
        if(!params.type){
            return prope.data?.data;
        }else{
            return prope.data?.data.filter(item => item.coinType === params.type);
        }
    }
    return undefined;
}

/**
 * Function to get dynamic fields for a specific object
 * @param {Object} params - Parameters object
 * @param {string} params.object - Object ID to get dynamic fields for
 * @returns {Promise<DynamicFieldInfo[] | undefined>} Array of dynamic field info or undefined if pending
 */
export async function getDynamicF(params: { object: string }): Promise<DynamicFieldInfo[] | undefined> {
    const prope = await useSuiClientQuery(
        'getDynamicFields',
        { parentId: params.object },
    );
    if(!prope.isPending){
        return prope.data?.data;
    }
    return undefined;
}


/**
 * Function to get vault and ownerCap information
 * @param {string} accountAddress - User's account address
 * @param {string} packageName - Package name for filtering OwnerCap objects
 * @returns {Object} Vault and ownerCap data
 */
export async function getVaultAndOwnerCap(params: { accountAddress: string, packageName: string }): Promise<{ ownerCapObjects: SuiObjectResponse[] | null, vaultID: string | null, ownerCapId: string | null } | undefined> {
    const prope = await useSuiClientQuery(
        'getOwnedObjects',
        { 
            owner: params.accountAddress,
            options: { showType: true, showContent: true }
        },
    );
    
    if (!prope.isPending && prope.data) {
        const ownerCapObjects = prope.data.data.filter((obj) =>
            obj.data?.type?.includes(params.packageName + "::sea_vault::OwnerCap")
        );
        
        const vaultID = (ownerCapObjects[0]?.data?.content as any)?.fields?.vaultID || null;
        const ownerCapId = ownerCapObjects[0]?.data?.objectId || null;
        
        return { ownerCapObjects, vaultID, ownerCapId };
    }
    return undefined;
}

/**
 * Function to get vault dynamic fields
 * @param {string} vaultID - ID of the vault to query
 * @returns {Object} Vault dynamic fields data
 */
export async function getVaultDynamicFields(params: { vaultID: string }): Promise<DynamicFieldInfo[] | undefined> {
    const prope = await useSuiClientQuery(
        'getDynamicFields',
        { parentId: params.vaultID },
    );
    
    if (!prope.isPending && prope.data) {
        return prope.data.data;
    }
    return undefined;
}

/**
 * Function to get objects of a certain type owned by an address
 * @param {Object} params - Parameters object
 * @param {string} [params.addr] - Optional address to query, defaults to current account address
 * @param {string} params.type - Object type to filter by (partial match)
 * @returns {Promise<SuiObjectResponse[] | undefined>} Array of objects matching the type or undefined if pending
 */
export async function getCertainType(params:{ addr?: string, type: string}): Promise<SuiObjectResponse[] | undefined> {
    let address;
    if(!params.addr) {
         address = useCurrentAccount()?.address;
    }else {
         address = params.addr;
    }

    const prope = await useSuiClientQuery(
        'getOwnedObjects',
        { owner: address },
    );

    if (!prope.isPending && prope.data) {
        return prope.data.data.filter(item => item.data?.type?.includes(params.type));
    }
    return undefined;
}