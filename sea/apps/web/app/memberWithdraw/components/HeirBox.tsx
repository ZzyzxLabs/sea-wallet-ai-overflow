"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useSuiClientQuery,
  useSuiClientQueries,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useRouter } from "next/navigation";
import { Badge } from "@workspace/ui/components/badge";
import { Button } from "@workspace/ui/components/button";
import { Gift, Wallet, Clock, CheckCircle2, Lock, AlertTriangle } from "lucide-react";
import useMoveStore from "@/utils/moveStore";

type CoinMetadata = {
  decimals: number;
  name: string;
  symbol: string;
};

type CoinData = {
  data: CoinMetadata[];
  isSuccess: boolean;
  isPending: boolean;
  isError: boolean;
};

// Define types for heir and SUI objects
type HeirData = {
  data: {
    objectId: string;
    content: {
      fields: {
        capID: string;
        vaultID: string;
        withdrawn_count: number;
      };
    };
  };
};

type VaultFields = {
  cap_activated: {
    fields: {
      contents: Array<{
        fields: {
          key: string;
          value: boolean;
        };
      }>;
    };
  };
  cap_percentage: {
    fields: {
      contents: Array<{
        fields: {
          key: string;
          value: number;
        };
      }>;
    };
  };
  is_warned: boolean;
  last_update: number;
  time_left: number;
  asset_withdrawn: {
    fields: {
      id: {
        id: string;
      };
    };
  };
};

type CoinContent = {
  fields: {
    balance: string;
  };
};

function HeirBox({ heir, index }: { heir: HeirData; index: number }) {
  const router = useRouter();
  const account = useCurrentAccount();
  const [coinsInVault, setCoinsInVault] = useState<string[][]>([]);
  const [capID, setCapID] = useState(heir.data?.content?.fields?.capID);
  const [vaultID, setVaultID] = useState(heir.data?.content?.fields?.vaultID);
  const [withdrawnCount, setWithdrawnCount] = useState(
    heir.data?.content?.fields?.withdrawn_count
  );
  const [capActivated, setCapActivated] = useState<boolean | null>(null);
  const [capPercentage, setCapPercentage] = useState<number | null>(null);
  const [isVaultWarned, setIsVaultWarned] = useState<boolean | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isAlreadyWithdrawn, setIsAlreadyWithdrawn] = useState(false);
  const [isTimeLocked, setIsTimeLocked] = useState(false);
  const [remainingLockTime, setRemainingLockTime] = useState(0);
  
  const memberWithdrawTx = useMoveStore((state) => state.memberWithdrawTx);
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const vaultList = useSuiClientQuery(
    "getDynamicFields",
    { parentId: vaultID },
    {
      enabled: !!vaultID,
      staleTime: 5000,
    }
  );

  const vaultObject = useSuiClientQuery(
    "getObject",
    {
      id: vaultID,
      options: { showContent: true, showType: true },
    },
    {
      enabled: !!vaultID,
      refetchInterval: 1000,
      refetchIntervalInBackground: true,
      staleTime: 0,
    }
  );

  useEffect(() => {
    if (vaultObject.data?.data) {
      try {
        const content = vaultObject.data.data.content;
        if (content && "fields" in content) {
          const fields = content.fields as VaultFields;

          if (fields?.cap_activated && "fields" in fields.cap_activated) {
            const capActivatedField = fields.cap_activated;
            if (
              capActivatedField.fields?.contents &&
              Array.isArray(capActivatedField.fields.contents)
            ) {
              const capItem = capActivatedField.fields.contents.find(
                (item) => item.fields && item.fields.key === capID
              );
              setCapActivated(capItem?.fields?.value ?? null);
            }
          }

          if (fields?.cap_percentage && "fields" in fields.cap_percentage) {
            const capPercentageField = fields.cap_percentage;
            if (
              capPercentageField.fields?.contents &&
              Array.isArray(capPercentageField.fields.contents)
            ) {
              const percentageItem = capPercentageField.fields.contents.find(
                (item) => item.fields && item.fields.key === capID
              );

              if (percentageItem) {
                const myPercentage = percentageItem.fields.value;
                const totalPercentage =
                  capPercentageField.fields.contents.reduce(
                    (acc, item) => acc + (item.fields?.value || 0),
                    0
                  );
                setCapPercentage(myPercentage / totalPercentage);
              }
            }
          }

          setIsVaultWarned(fields?.is_warned);
          setLastUpdate(fields?.last_update);
          setTimeLeft(fields?.time_left);
        }
      } catch (error) {
        console.error("Error parsing vault data:", error);
      }
    }
  }, [capID, vaultObject.data]);

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
      staleTime: 5000,
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
    }
  );

  // Extract coin types
  const coinTypes = useMemo(() => {
    return (
      coinData.data
        ?.map((coinObj) => {
          const type = coinObj?.data?.type || "";
          const typeMatch = type.match(/\<(.+)\>/);
          return typeMatch ? typeMatch[1] : null;
        })
        .filter(Boolean) || []
    );
  }, [coinData.data]);

  // Query metadata for each coin type
  const coinMetadataQueries = useSuiClientQueries({
    queries: coinTypes.map((coinType) => ({
      method: "getCoinMetadata",
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
  } as any) as CoinData;

  // Process token data
  useEffect(() => {
    if (!coinData.data) return;

    try {
      const processedCoins = coinData.data
        .map((coinObj) => {
          if (!coinObj?.data?.content) return null;

          const type = coinObj.data.type || "";
          const typeMatch = type.match(/\<(.+)\>/);
          const fullCoinType = typeMatch ? typeMatch[1] : "Unknown";

          let formattedCoinType = "Unknown";
          if (fullCoinType && fullCoinType !== "Unknown") {
            const parts = fullCoinType.split("::");
            if (parts.length > 0 && parts[0]) {
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

          const coinSymbol = fullCoinType ? fullCoinType.split("::").pop() || "Unknown" : "Unknown";
          const content = coinObj.data?.content as unknown as CoinContent;
          const amount = content?.fields?.balance || "0";

          return [coinSymbol, formattedCoinType, amount, fullCoinType || "Unknown"];
        })
        .filter((coin): coin is string[] => coin !== null);

      setCoinsInVault(processedCoins);
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing token data:", error);
      setIsLoading(false);
    }
  }, [coinData.data]);

  // Calculate time lock status
  useEffect(() => {
    if (lastUpdate !== null && timeLeft !== null) {
      const currentTime = Math.floor(Date.now());
      const timeSinceLastUpdate = currentTime - lastUpdate;

      if (timeSinceLastUpdate < timeLeft) {
        setIsTimeLocked(true);
        const remainingTime = timeLeft - timeSinceLastUpdate;
        setRemainingLockTime(remainingTime);
      } else {
        setIsTimeLocked(false);
        setRemainingLockTime(0);
      }
    }
  }, [lastUpdate, timeLeft]);

  // Format remaining time
  const formatRemainingTime = (milliseconds: number) => {
    const seconds = milliseconds / 1000;
    if (seconds <= 0) return "0m";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    let result: string[] = [];

    if (days > 0) result.push(`${days}d`);
    if (hours > 0) result.push(`${hours}h`);
    if (minutes > 0) result.push(`${minutes}m`);
    if (secs > 0) result.push(`${secs}s`);

    return result.join(" ");
  };

  const handleWithdraw = async () => {
    try {
      setIsWithdrawing(true);
      console.log("Withdraw from vault", vaultID);

      // Filter coins with amount > 0 before processing
      const coinsWithBalance = coinsInVault.filter((coin: string[]) => {
        return coin && coin[2] && BigInt(coin[2]) > BigInt(0);
      });

      // Collect asset names and coin types from coinsWithBalance
      let assetNames = coinsWithBalance.map((coin: string[]) => coin[0]);
      let coinTypesFiltered = coinsWithBalance.map((coin: string[]) => coin[3]).filter((type): type is string => Boolean(type));

      // For the first time to trigger the grace period
      if (!isVaultWarned) {
        assetNames = assetNames.slice(0, 1);
        coinTypesFiltered = coinTypesFiltered.slice(0, 1);
      }

      console.log("params", heir.data.objectId, vaultID, assetNames, coinTypesFiltered);

      // Create transaction using memberWithdrawTx
      const tx = memberWithdrawTx(
        heir.data.objectId,
        vaultID || "",
        coinTypesFiltered,
        coinTypesFiltered
      );

      console.log("tx", tx);

      // Execute transaction
      signAndExecuteTransaction(
        {
          transaction: tx,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("Withdraw transaction succeeded:", result);
            setIsWithdrawing(false);

            // Force refetch all data
            vaultObject.refetch();
            vaultList.refetch();
            coinData.refetch();

            // Update component state directly
            if (!isVaultWarned) {
              // Grace period triggered
            } else {
              setWithdrawnCount(coinsInVault.length);
            }

            setTimeout(() => {
              router.refresh();
            }, 2000);
          },
          onError: (error) => {
            console.error("Error withdrawing assets:", error);
            setIsWithdrawing(false);
          },
        }
      );

    } catch (error) {
      console.error("Error withdrawing assets:", error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  // Check if already withdrawn
  useEffect(() => {
    if (
      (capActivated === false || coinsInVault.length === withdrawnCount) &&
      coinsInVault.length > 0
    ) {
      setIsAlreadyWithdrawn(true);
    } else {
      setIsAlreadyWithdrawn(false);
    }
  }, [capActivated, coinsInVault, withdrawnCount]);

  const getStatusIcon = () => {
    if (isAlreadyWithdrawn) return <CheckCircle2 className="h-4 w-4" />;
    if (isTimeLocked) return <Lock className="h-4 w-4" />;
    if (isVaultWarned) return <Gift className="h-4 w-4" />;
    return <AlertTriangle className="h-4 w-4" />;
  };

  const getStatusColor = () => {
    if (isAlreadyWithdrawn) return "text-emerald-400";
    if (isTimeLocked) return "text-slate-400";
    if (isVaultWarned) return "text-green-400";
    return "text-yellow-400";
  };

  const getButtonVariant = () => {
    if (isAlreadyWithdrawn || isTimeLocked) return "secondary";
    if (isVaultWarned) return "default";
    return "outline";
  };

  return (
    <div className="p-6 rounded-2xl bg-white/10 border border-white/20 backdrop-blur hover:bg-white/15 transition-all duration-300">
      <div className="flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg bg-white/10 ${getStatusColor()}`}>
              {getStatusIcon()}
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                Vault #{vaultID?.slice(-8)}
              </h3>
              <p className="text-sm text-slate-400">Cap ID: {capID?.slice(-8)}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-xs">
              {(capPercentage ? (capPercentage * 100).toFixed(1) : "0")}% Share
            </Badge>
            <Button
              variant={getButtonVariant()}
              size="sm"
              onClick={handleWithdraw}
              disabled={isWithdrawing || isAlreadyWithdrawn || isTimeLocked}
              className="h-8"
            >
              {isWithdrawing ? (
                <>
                  <div className="animate-spin rounded-full h-3 w-3 border-2 border-current border-t-transparent mr-2" />
                  Processing...
                </>
              ) : isAlreadyWithdrawn ? (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Withdrawn
                </>
              ) : isTimeLocked ? (
                <>
                  <Clock className="h-3 w-3 mr-1" />
                  Locked: {formatRemainingTime(remainingLockTime)}
                </>
              ) : isVaultWarned ? (
                <>
                  <Gift className="h-3 w-3 mr-1" />
                  Withdraw
                </>
              ) : (
                <>
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Verify
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Assets Section - Only show if not already withdrawn */}
        {!isAlreadyWithdrawn && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-300">Available Assets</h4>
            <div className="rounded-xl bg-white/5 border border-white/10 overflow-hidden">
              {isLoading ? (
                <div className="p-4 text-center text-slate-400">
                  <div className="animate-pulse flex items-center justify-center">
                    <Wallet className="h-4 w-4 mr-2" />
                    Loading assets...
                  </div>
                </div>
              ) : coinsInVault.length > 0 ? (
                <div className="divide-y divide-white/10">
                  {coinsInVault.map((coin, idx) => {
                    if (!coin || !coin[2] || coin[2] === "0") return null;

                    const decimals = coinMetadataQueries?.data?.[idx]?.decimals || 0;
                    const totalAmount = Number(coin[2]) / Math.pow(10, decimals);
                    const yourShare = totalAmount * (capPercentage || 0);

                    return (
                      <div key={idx} className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                            <span className="text-xs font-bold text-white">
                              {coin[0]?.charAt(0) || "?"}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-white">{coin[0]}</div>
                            <div className="text-xs text-slate-400 font-mono">
                              {coin[1]}
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="text-sm font-medium text-white">
                            {yourShare.toFixed(6)}
                          </div>
                          <div className="text-xs text-slate-400">
                            of {totalAmount.toFixed(6)} total
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-center text-slate-400">
                  <Gift className="h-6 w-6 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No assets in this vault</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Status Information */}
        <div className="text-xs text-slate-400 space-y-1">
          <div>Vault ID: <span className="font-mono text-slate-300">{vaultID}</span></div>
          {isVaultWarned && (
            <div className="flex items-center gap-1 text-yellow-400">
              <AlertTriangle className="h-3 w-3" />
              Vault is in withdrawal period
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeirBox;
