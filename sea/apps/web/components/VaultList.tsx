"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  useCurrentAccount,
  useSuiClientQuery,
  useSignAndExecuteTransaction,
  useSuiClient
} from "@mysten/dapp-kit";
import { Tile } from "./tile";
import { getVaultAndOwnerCap, getVaultDynamicFields } from "../utils/queryer";
import { package_addr } from "@/utils/package";
import { DynamicFieldInfo, SuiObjectResponse } from "@mysten/sui/client";
import { Button } from "@workspace/ui/components/button";
import { Input } from "@workspace/ui/components/input";
import { Badge } from "@workspace/ui/components/badge";
import { RefreshCw, Wallet, Coins } from "lucide-react";

interface CoinData {
  symbol: string;
  formattedType: string;
  amount: string;
  fullType: string;
}

interface WithdrawAmounts {
  [index: number]: string;
}

type VaultListProps = {
  note?: string;
  minHeight?: string;
  className?: string;
};

export function VaultList({ note = "Loading vault assets...", minHeight = "min-h-[22rem]", className }: VaultListProps) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageName = package_addr;
  
  // State management
  const [vaultData, setVaultData] = useState<{
    ownerCapObjects: SuiObjectResponse[] | null;
    vaultID: string | null;
    ownerCapId: string | null;
  } | null>(null);
  const [dynamicFields, setDynamicFields] = useState<DynamicFieldInfo[] | null>(null);
  const [coinsInVault, setCoinsInVault] = useState<CoinData[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<WithdrawAmounts>({});
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [toggle, setToggle] = useState(false);

  // Use the sign and execute transaction hook directly
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  // Fetch vault and owner cap data
  useEffect(() => {
    const fetchVaultData = async () => {
      if (!account?.address) return;
      
      setIsLoading(true);
      try {
        const vaultResult = await getVaultAndOwnerCap({
          suiClient,
          accountAddress: account.address,
          packageName: packageName
        });
        
        console.log("Vault and OwnerCap data:", vaultResult);
        setVaultData(vaultResult || null);

        // If we have a vault ID, get dynamic fields
        if (vaultResult?.vaultID) {
          const dynamicFieldsResult = await getVaultDynamicFields({
            suiClient,
            vaultID: vaultResult.vaultID
          });
          
          console.log("Vault dynamic fields:", dynamicFieldsResult);
          setDynamicFields(dynamicFieldsResult || null);
        }
      } catch (error) {
        console.error("Error fetching vault data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultData();
  }, [account?.address, packageName, toggle]);

  // Get objectIds from dynamic fields
  const getObjectIds = useCallback(() => {
    if (!dynamicFields) return [];
    return dynamicFields.map((item) => item.objectId);
  }, [dynamicFields]);

  const objectIds = getObjectIds();

  // Query coin data from the vault
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

  // Add effect to refetch when toggle changes
  useEffect(() => {
    if (coinData) {
      coinData.refetch();
    }
  }, [toggle]);

  // Extract coin types
  const coinTypes = useMemo(() => {
    return (
      coinData.data
        ?.map((coinObj) => {
          const type = coinObj?.data?.type || "";
          const typeMatch = type.match(/<(.+)>/);
          return typeMatch ? typeMatch[1] : null;
        })
        .filter((type): type is string => Boolean(type)) || []
    );
  }, [coinData.data]);

  // Query metadata for each coin type - using individual queries
  const coinMetadataResults = coinTypes.map(coinType => 
    useSuiClientQuery(
      "getCoinMetadata",
      { coinType },
      { enabled: Boolean(coinType), staleTime: 30000 }
    )
  );

  // Combine metadata results
  const coinMetadata = useMemo(() => {
    return coinMetadataResults.map(result => result.data).filter(Boolean);
  }, [coinMetadataResults]);

  // Process coin data
  useEffect(() => {
    if (!coinData.data) return;

    try {
      const processedCoins: CoinData[] = coinData.data
        .map((coinObj) => {
          if (!coinObj?.data?.content) return null;

          const type = coinObj.data.type || "";
          const typeMatch = type.match(/<(.+)>/);
          const fullCoinType = typeMatch ? typeMatch[1] : "Unknown";

          let formattedCoinType = "Unknown";
          if (fullCoinType && fullCoinType !== "Unknown") {
            const parts = fullCoinType.split("::");
            if (parts.length > 0) {
              const address = parts[0];
              if (address && address.length > 10) {
                const prefix = address.substring(0, 7);
                const suffix = address.substring(address.length - 5);
                const remainingParts = parts.slice(1).join("::");
                formattedCoinType = `${prefix}...${suffix}::${remainingParts}`;
              } else {
                formattedCoinType = fullCoinType;
              }
            }
          }

          const coinSymbol = fullCoinType && fullCoinType !== "Unknown" ? fullCoinType.split("::").pop() || "Unknown" : "Unknown";
          const amount = (coinObj.data?.content as any)?.fields?.balance || "0";

          return {
            symbol: coinSymbol,
            formattedType: formattedCoinType,
            amount: amount,
            fullType: fullCoinType
          };
        })
        .filter((coin): coin is CoinData => coin !== null);

      setCoinsInVault(processedCoins);
    } catch (error) {
      console.error("Error processing token data:", error);
    }
  }, [coinData.data]);

  // Add a function to normalize coin type addresses
  const normalizeType = useCallback((typeStr: string) => {
    return typeStr.replace(/^0x0+/, "0x");
  }, []);

  // Handle withdraw from vault - placeholder implementation
  const handleWithdraw = async (coin: CoinData, index: number) => {
    if (!withdrawAmount[index] || parseFloat(withdrawAmount[index]) <= 0) {
      alert("Please enter a valid amount to withdraw");
      return;
    }

    setIsWithdrawing(true);

    try {
      const decimals = coinMetadata[index]?.decimals || 6;
      const amountInSmallestUnit = BigInt(
        Math.floor(parseFloat(withdrawAmount[index]) * Math.pow(10, decimals))
      );
      const coinType = normalizeType(coin.fullType || coinTypes[index] || "");

      console.log("Using coin type for withdrawal:", coinType);
      console.log("Amount to withdraw:", amountInSmallestUnit.toString());

      // TODO: Implement actual withdrawal transaction
      setTimeout(() => {
        setWithdrawAmount({ ...withdrawAmount, [index]: "" });
        refreshData();
        alert("Withdrawal successful (simulated)");
        setIsWithdrawing(false);
      }, 1000);

    } catch (error) {
      console.error("Withdrawal failed:", error);
      alert("Failed to withdraw: " + (error instanceof Error ? error.message : "Unknown error"));
      setIsWithdrawing(false);
    }
  };

  // Refresh data function
  const refreshData = useCallback(() => {
    setToggle((prev) => !prev);
    if (coinData) {
      coinData.refetch();
    }
  }, [coinData]);

  // Determine display content
  const displayNote = isLoading 
    ? "Loading vault assets..." 
    : vaultData?.vaultID 
      ? `Found ${coinsInVault.length} assets in vault`
      : "No vault found";

  const headerExtra = (
    <div className="flex items-center gap-2">
      {vaultData?.vaultID && (
        <Badge variant="secondary" className="text-xs">
          {dynamicFields?.length || 0} items
        </Badge>
      )}
      <Button 
        variant="outline" 
        size="sm" 
        onClick={refreshData}
        disabled={isLoading}
        className="h-8"
      >
        <RefreshCw className={`h-3 w-3 ${isLoading ? 'animate-spin' : ''}`} />
      </Button>
    </div>
  );

  return (
    <Tile 
      title="SeaVault Assets" 
      description={displayNote} 
      minHeight={minHeight} 
      className={className}
      headerExtra={headerExtra}
    >
      <div className="space-y-4">
        {/* Vault Info Section */}
        {vaultData?.vaultID && (
          <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <div className="text-sm">
              <span className="text-muted-foreground">Vault ID:</span>
              <span className="ml-2 font-mono text-xs">
                {vaultData.vaultID.slice(0, 8)}...{vaultData.vaultID.slice(-8)}
              </span>
            </div>
          </div>
        )}

        {/* Assets List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            Loading assets...
          </div>
        ) : coinsInVault.length > 0 ? (
          <div className="space-y-3">
            {coinsInVault.map((coin, index) => {
              if (!coin || !coin.amount || coin.amount === "0") return null;

              const decimals = coinMetadata[index]?.decimals || 6;
              const displayAmount = parseFloat(coin.amount) / Math.pow(10, decimals);

              return (
                <div key={index} className="p-4 border rounded-lg bg-card/50">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Coins className="h-4 w-4 text-primary" />
                        <span className="font-medium">{coin.symbol}</span>
                        <Badge variant="outline" className="text-xs">
                          {displayAmount.toFixed(6)}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground font-mono truncate">
                        {coin.formattedType}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Input
                        type="number"
                        placeholder="Amount"
                        className="w-24 h-8 text-xs"
                        value={withdrawAmount[index] || ""}
                        onChange={(e) =>
                          setWithdrawAmount({
                            ...withdrawAmount,
                            [index]: e.target.value,
                          })
                        }
                        disabled={isWithdrawing}
                        step="0.000001"
                        min="0"
                        max={displayAmount.toString()}
                      />
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => handleWithdraw(coin, index)}
                        disabled={isWithdrawing}
                        className="h-8 text-xs"
                      >
                        {isWithdrawing ? "..." : "Withdraw"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <Wallet className="h-8 w-8 mb-2 opacity-50" />
            <p className="text-sm">
              {vaultData ? "No assets in your vault" : "No vault found"}
            </p>
            {!vaultData && (
              <p className="text-xs mt-1">
                Connect your wallet to view vault assets
              </p>
            )}
          </div>
        )}

        {/* Debug Information (Development Only) */}
        {process.env.NODE_ENV === 'development' && (vaultData || dynamicFields) && (
          <details className="mt-6">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Debug Information
            </summary>
            <div className="mt-2 space-y-2">
              {vaultData && (
                <div className="text-xs">
                  <h4 className="font-medium mb-1">Vault Data:</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(vaultData, null, 2)}
                  </pre>
                </div>
              )}
              {dynamicFields && (
                <div className="text-xs">
                  <h4 className="font-medium mb-1">Dynamic Fields:</h4>
                  <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                    {JSON.stringify(dynamicFields, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}
      </div>
    </Tile>
  );
}

export default VaultList;
