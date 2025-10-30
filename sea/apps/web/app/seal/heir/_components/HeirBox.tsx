"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  useSuiClientQuery,
  useSuiClientQueries,
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import useMoveStore from "@/utils/moveStore";
import { useRouter } from "next/navigation";
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
      console.log("refreshing vault object");
      try {
        // Add type guard for SuiParsedData
        const content = vaultObject.data.data.content;
        if (content && "fields" in content) {
          // Use type assertion and optional chaining
          const fields = content.fields as VaultFields;

          if (fields?.cap_activated && "fields" in fields.cap_activated) {
            const capActivatedField = fields.cap_activated;

            if (
              capActivatedField.fields?.contents &&
              Array.isArray(capActivatedField.fields.contents)
            ) {              const capItem = capActivatedField.fields.contents.find(
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

      // Add refetch trigger based on toggle state
      refetchInterval: 10000,
      refetchOnWindowFocus: true,
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

  // Query metadata for each coin type - PROPERLY PLACED AT COMPONENT LEVEL
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
          const typeMatch = type.match(/\<(.+)\>/);
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
                formattedCoinType = fullCoinType || "Unknown";
              }
            }
          }

          const coinSymbol = (fullCoinType && fullCoinType !== "Unknown") ? fullCoinType.split("::").pop() || "Unknown" : "Unknown";
          // Use type assertion and optional chaining to fix SuiParsedData error
          const content = coinObj.data?.content as unknown as CoinContent;
          const amount = content?.fields?.balance || "0";

          return [coinSymbol, formattedCoinType, amount, fullCoinType || "Unknown"]; // Store the full coin type too
        })
        .filter((coin): coin is string[] => coin !== null);

      setCoinsInVault(processedCoins);
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing token data:", error);
      setIsLoading(false);
    }
  }, [coinData.data]);

  // Calculate time lock status and remaining time
  useEffect(() => {
    if (lastUpdate !== null && timeLeft !== null) {
      const currentTime = Math.floor(Date.now()); // Current time in seconds
      const timeSinceLastUpdate = currentTime - lastUpdate;
      console.log("timeSinceLastUpdate", timeSinceLastUpdate);
      console.log("timeLeft", timeLeft);
      console.log("currentTime", currentTime);

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
  // Format remaining time to display
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
    // if (!isVaultWarned) {
    //   console.error("Vault is not in withdrawal state yet");
    //   return;
    // }

    try {
      setIsWithdrawing(true);
      console.log("Withdraw from vault", vaultID);
        // Filter coins with amount > 0 before processing
      const coinsWithBalance = coinsInVault.filter((coin: string[]) => {
        return coin && coin[2] && BigInt(coin[2]) > BigInt(0);
      });
        // Collect asset names and coin types from coinsWithBalance
      let assetNames = coinsWithBalance.map((coin: string[]) => coin[0]);
      let coinTypes = coinsWithBalance.map((coin: string[]) => coin[3]).filter((t): t is string => t !== "Unknown"); // Full coin type is at index 3

      // for the first time to trigger the grace period
      // just need to send one tx to the contract
      if (!isVaultWarned) {
        assetNames = assetNames.slice(0, 1);
        coinTypes = coinTypes.slice(0, 1);
      }
      console.log("params", heir.data.objectId, vaultID, assetNames, coinTypes);
      // Create transaction using memberWithdrawTx
      const tx = memberWithdrawTx(
        heir.data.objectId,
        vaultID,
        coinTypes,
        coinTypes
      );
      console.log("tx", tx);

      // Execute transaction
      signAndExecuteTransaction(
        {
          transaction: tx as any,
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

            // Update component state directly (if possible from transaction results)
            if (!isVaultWarned) {
              // setIsVaultWarned(true);
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
  // Check if component should show a disabled "Already withdrawn" button
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

  return (
    <div className='border-2 rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-300 bg-gradient-to-br from-white to-blue-50 border-blue-200 w-full transform hover:scale-[1.01]'>
      <div className='flex flex-col md:flex-row md:items-center justify-between'>
        <div className='flex-1'>
          <div>
            <div className='flex justify-between items-center mb-3'>
              <div className='flex items-center gap-3'>
                <div className='w-2 h-2 rounded-full bg-blue-500 animate-pulse'></div>
                <h2 className='text-xl font-bold text-blue-700 tracking-wide'>
                  Vault: {vaultID.slice(0, 8)}...{vaultID.slice(-6)}
                </h2>
              </div>
              {isAlreadyWithdrawn ? (
                <button
                  className='bg-gray-400 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 cursor-not-allowed shadow-md'
                  disabled={true}
                >
                  <span>Withdrawn</span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-5 w-5'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                  >
                    <path
                      fillRule='evenodd'
                      d='M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </button>
              ) : isTimeLocked ? (
                <button
                  className='bg-gray-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 cursor-not-allowed shadow-md'
                  disabled={true}
                >
                  <span>Locked: {formatRemainingTime(remainingLockTime)}</span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-5 w-5'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                  >
                    <path
                      fillRule='evenodd'
                      d='M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z'
                      clipRule='evenodd'
                    />
                  </svg>
                </button>
              ) : isVaultWarned ? (
                <button
                  className='bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                >
                  <span>{isWithdrawing ? "Withdrawing..." : "Withdraw"}</span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-5 w-5'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                  >
                    <path d='M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z' />
                    <path
                      fillRule='evenodd'
                      d='M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z'
                      clipRule='evenodd'
                    />
                  </svg>
                </button>
              ) : (
                <button
                  className='bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  onClick={handleWithdraw}
                >
                  <span>Verify</span>
                  <svg
                    xmlns='http://www.w3.org/2000/svg'
                    className='h-5 w-5'
                    viewBox='0 0 20 20'
                    fill='currentColor'
                  >
                    <path
                      fillRule='evenodd'
                      d='M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z'
                      clipRule='evenodd'
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4 mt-4'>
            <div className='bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 shadow-sm'>
              <p className='text-sm text-gray-500 mb-1'>Cap ID</p>
              <p className='font-semibold text-gray-800'>#{capID.slice(0, 10)}...</p>
            </div>
            <div className='bg-gradient-to-br from-purple-50 to-pink-50 p-4 rounded-xl border border-purple-100 shadow-sm'>
              <p className='text-sm text-gray-500 mb-1'>Your Share</p>
              <p className='font-semibold text-gray-800'>{((capPercentage || 0) * 100).toFixed(1)}%</p>
            </div>
          </div>

          {/* Coins in Vault Section - Only show if not already withdrawn */}
          {!isAlreadyWithdrawn && (
            <div className='mt-6'>
              <h3 className='font-bold text-lg text-gray-800 mb-3 flex items-center gap-2'>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Assets in Vault
              </h3>
              <div className='bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm'>
                {isLoading ? (
                  <div className='p-6 text-center text-gray-500 flex items-center justify-center gap-3'>
                    <div className='w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin'></div>
                    Loading assets...
                  </div>
                ) : coinsInVault.length > 0 ? (
                  <div className='overflow-x-auto'>
                    <table className='w-full'>
                      <thead className='bg-gradient-to-r from-blue-50 to-indigo-50'>
                        <tr>
                          <th className='p-4 text-left font-semibold text-gray-700 text-sm'>Coin</th>
                          <th className='p-4 text-left font-semibold text-gray-700 text-sm'>Type</th>
                          <th className='p-4 text-right font-semibold text-gray-700 text-sm'>Total Amount</th>
                          <th className='p-4 text-right font-semibold text-gray-700 text-sm'>Your Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {coinsInVault.map((coin, index) => {
                          if (!coin || !coin[2] || coin[2] == "0") return null;

                          const totalAmount = Number(coin[2]) / Math.pow(10, coinMetadataQueries?.data?.[index]?.decimals || 0);
                          const yourShare = totalAmount * (capPercentage || 0);

                          return (
                            <tr key={index} className='border-t border-gray-100 hover:bg-blue-50/50 transition-colors duration-150'>
                              <td className='p-4'>
                                <span className='inline-flex items-center gap-2 font-medium text-gray-800 bg-blue-50 px-3 py-1 rounded-lg'>
                                  <div className='w-2 h-2 bg-blue-500 rounded-full'></div>
                                  {coin[0]}
                                </span>
                              </td>
                              <td className='p-4 text-xs text-gray-500 font-mono max-w-[200px] truncate' title={coin[1]}>
                                {coin[1]}
                              </td>
                              <td className='p-4 text-right font-medium text-gray-700'>
                                {totalAmount.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                              </td>
                              <td className='p-4 text-right'>
                                <span className='font-bold text-blue-700 bg-blue-100 px-3 py-1 rounded-lg'>
                                  {yourShare.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className='p-6 text-center text-gray-500 flex flex-col items-center gap-2'>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    No assets in this Vault
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default HeirBox;
