"use client";
import React, { useEffect, useState } from "react";
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import ButtonInContractAlter from "./ButtonInContractAlter";

const ContractAlter = () => {
    const account = useCurrentAccount();
    const [coinsInVault, setCoinsInVault] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    // Query vault and owner cap
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

    // Extract vault ID from the result
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

    // Query dynamic fields in the vault
    const vaultList = useSuiClientQuery(
        "getDynamicFields",
        {
            parentId: vaultId,
        },
        {
            enabled: !!vaultId,
        }
    );

    // Get objectId list from vaultList
    const objectIds = React.useMemo(() => {
        if (!vaultList?.data?.data) return [];
        return vaultList.data.data.map(item => item.objectId);
    }, [vaultList?.data]);

    // Use multiGetObjects to fetch all token objects
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

    // Process data when token data is loaded
    useEffect(() => {
        if (!coinData.data) {
            return;
        }

        try {
            const processedCoins = coinData.data.map(coinObj => {
                if (!coinObj?.data?.content) return null;
                
                // Parse token type
                const type = coinObj.data.type || "";
                const typeMatch = type.match(/<(.+)>/);
                const fullCoinType = typeMatch ? typeMatch[1] : "Unknown";
                
                // Format token address (0x12345...67890::remaining part)
                let formattedCoinType = "Unknown";
                if (fullCoinType !== "Unknown") {
                    const parts = fullCoinType.split("::");
                    if (parts.length > 0) {
                        const address = parts[0];
                        // If the address is long enough, take the first 5 and last 5 characters
                        if (address.length > 10) {
                            const prefix = address.substring(0, 7); // 0x + first 5 characters
                            const suffix = address.substring(address.length - 5);
                            const remainingParts = parts.slice(1).join("::");
                            formattedCoinType = `${prefix}...${suffix}::${remainingParts}`;
                        } else {
                            formattedCoinType = fullCoinType;
                        }
                    }
                }
                
                // Get token symbol (usually the last part)
                const coinSymbol = fullCoinType.split("::").pop() || "Unknown";
                
                // Get token amount
                const amount = coinObj.data?.content?.fields?.balance || "0";
                
                return [coinSymbol, formattedCoinType, amount];
            }).filter(coin => coin !== null);

            setCoinsInVault(processedCoins);
            setIsLoading(false);
        } catch (error) {
            console.error("Error processing token data:", error);
            setIsLoading(false);
        }
    }, [coinData.data]);

    // Set loading state
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
                                    {coin[2]}
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