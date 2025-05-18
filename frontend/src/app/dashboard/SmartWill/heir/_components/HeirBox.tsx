"use client"
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSuiClientQuery, useSuiClientQueries, useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import useMoveStore from '@/store/moveStore';

type CoinMetadata = {
  decimals: number;
  name: string;
  symbol: string;
}

type CoinData = {
  data: CoinMetadata[];
  isSuccess: boolean;
  isPending: boolean;
  isError: boolean;
}

// Define types for heir and SUI objects
type HeirData = {
  data: {
    objectId: string;
    content: {
      fields: {
        capID: string;
        vaultID: string;
      }
    }
  }
}

type VaultFields = {
  cap_activated: {
    fields: {
      contents: Array<{
        fields: {
          key: string;
          value: boolean;
        }
      }>
    }
  };
  cap_percentage: {
    fields: {
      contents: Array<{
        fields: {
          key: string;
          value: number;
        }
      }>
    }
  };
  is_warned: boolean;
  asset_withdrawn: {
    fields: {
      id: {
        id: string;
      }
    }
  };
}

type CoinContent = {
  fields: {
    balance: string;
  }
}

function HeirBox({heir, index}: {heir: HeirData, index: number}) {
  const account = useCurrentAccount();
  const [coinsInVault, setCoinsInVault] = useState([]);
  const [capID, setCapID] = useState(heir.data?.content?.fields?.capID)
  const [vaultID, setVaultID] = useState(heir.data?.content?.fields?.vaultID)
  const [capActivated, setCapActivated] = useState(null)
  const [capPercentage, setCapPercentage] = useState(null)
  const [isVaultWarned, setIsVaultWarned] = useState(null)
  const [isLoading, setIsLoading] = useState(true);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [assetWithdrawnID, setAssetWithdrawnID] = useState(null)
  const memberWithdrawTx = useMoveStore((state) => state.memberWithdrawTx);
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();

  const vaultList = useSuiClientQuery(
    "getDynamicFields",
    { parentId: vaultID },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  );
  
  const vaultObject = useSuiClientQuery(
    "getObject",
    { 
      id: vaultID,
      options: { showContent: true, showType: true }
    },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  )

  

  useEffect(() => {
    if (vaultObject.data) {
      try {
        // Add type guard for SuiParsedData
        const content = vaultObject.data.data.content;
        if (content && 'fields' in content) {
          // Use type assertion and optional chaining
          const fields = content.fields as VaultFields;
          
          if (fields?.cap_activated && 'fields' in fields.cap_activated) {
            const capActivatedField = fields.cap_activated;
            
            if (capActivatedField.fields?.contents && Array.isArray(capActivatedField.fields.contents)) {
              const capItem = capActivatedField.fields.contents.find(item => 
                item.fields && item.fields.key === capID
              );
              
              setCapActivated(capItem?.fields?.value);
            }
          }
          
          if (fields?.cap_percentage && 'fields' in fields.cap_percentage) {
            const capPercentageField = fields.cap_percentage;
            
            if (capPercentageField.fields?.contents && Array.isArray(capPercentageField.fields.contents)) {
              const percentageItem = capPercentageField.fields.contents.find(item => 
                item.fields && item.fields.key === capID
              );
              
              if (percentageItem) {
                const myPercentage = percentageItem.fields.value;
                const totalPercentage = capPercentageField.fields.contents.reduce(
                  (acc, item) => acc + (item.fields?.value || 0), 0
                );
                
                setCapPercentage(myPercentage/totalPercentage);
              }
            }
          }
          if (fields?.asset_withdrawn && 'fields' in fields.asset_withdrawn) {
            const assetWithdrawnField = fields.asset_withdrawn;
            setAssetWithdrawnID(assetWithdrawnField.fields.id.id)
          }
          
          setIsVaultWarned(fields?.is_warned);
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
      staleTime: 30000,

      // Add refetch trigger based on toggle state
      refetchInterval: false,
      refetchOnWindowFocus: false,
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
    return coinData.data?.map(coinObj => {
      const type = coinObj?.data?.type || "";
      const typeMatch = type.match(/<(.+)>/);
      return typeMatch ? typeMatch[1] : null;
    }).filter(Boolean) || [];
  }, [coinData.data]);
  
  // Query metadata for each coin type - PROPERLY PLACED AT COMPONENT LEVEL
  const coinMetadataQueries = useSuiClientQueries({
    queries: coinTypes.map(coinType => ({
      method: "getCoinMetadata",
      params: {
        coinType: coinType
      }
    })),
    combine: (result) => {
      return {
        data: result.map((res) => res.data),
        isSuccess: result.every((res) => res.isSuccess),
        isPending: result.some((res) => res.isPending),
        isError: result.some((res) => res.isError),
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
          const typeMatch = type.match(/<(.+)>/);
          const fullCoinType = typeMatch ? typeMatch[1] : "Unknown";

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
          // Use type assertion and optional chaining to fix SuiParsedData error
          const content = coinObj.data?.content as unknown as CoinContent;
          const amount = content?.fields?.balance || "0";

          return [coinSymbol, formattedCoinType, amount, fullCoinType]; // Store the full coin type too
        })
        .filter((coin) => coin !== null);

      setCoinsInVault(processedCoins);
      setIsLoading(false);
    } catch (error) {
      console.error("Error processing token data:", error);
      setIsLoading(false);
    }
  }, [coinData.data]);

  

  const handleWithdraw = async () => {
    // if (!isVaultWarned) {
    //   console.error("Vault is not in withdrawal state yet");
    //   return;
    // }

    try {
      setIsWithdrawing(true);
      console.log("Withdraw from vault", vaultID);
      // Collect asset names and coin types from coinsInVault
      const assetNames = coinsInVault.map(coin => coin[0]);
      const coinTypes = coinsInVault.map(coin => coin[3]); // Full coin type is at index 3
      console.log("params",heir.data.objectId, vaultID, assetNames, coinTypes)
      // Create transaction using memberWithdrawTx
      const tx = memberWithdrawTx(
        heir.data.objectId, 
        vaultID, 
        assetNames,
        coinTypes
      );
      console.log("tx",tx)

      // Execute transaction
      signAndExecuteTransaction({
        transaction: tx,
        chain: "sui:testnet"
      },
      {
        onSuccess: (result) => {
          console.log("Withdraw transaction succeeded:", result);
          setIsWithdrawing(false);
        },
        onError: (error) => {
          console.error("Error withdrawing assets:", error);
          setIsWithdrawing(false);
        }
      });

    } catch (error) {
      console.error("Error withdrawing assets:", error);
    } finally {
      setIsWithdrawing(false);
    }
  };

  if (capActivated === false) {
    return (
      <></>
    )
  }

  return (
    <div  className="border-2 rounded-xl p-5 shadow-md hover:shadow-lg transition-shadow bg-white border-blue-200 w-full">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div className="flex-1">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-l font-bold text-blue-600">Vault ID: {vaultID}</h2>
              {isVaultWarned ? (
                <button 
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-300 flex items-center"
                  onClick={handleWithdraw}
                  disabled={isWithdrawing}
                >
                  <span>{isWithdrawing ? "Withdrawing..." : "Withdraw"}</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                    <path fillRule="evenodd" d="M3 8h14v7a2 2 0 01-2 2H5a2 2 0 01-2-2V8zm5 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                </button>
              ) : (
                <button 
                  className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded-lg font-semibold transition-colors duration-300 flex items-center"
                  onClick={handleWithdraw}
                >
                  <span>Verify</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-1" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </button>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-3">
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-gray-700 mb-1">Cap ID: #{capID}</p>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <p className="font-medium text-gray-700 mb-1">Percentage: {capPercentage}</p>
            </div>
          </div>
          
          {/* Coins in Vault Section */}
          <div className="mt-4">
            <h3 className="font-medium text-gray-800 mb-2">Assets in Vault</h3>
            <div className="bg-gray-50 rounded-lg overflow-hidden">
              {isLoading ? (
                <div className="p-4 text-center text-gray-500">
                  Loading assets...
                </div>
              ) : coinsInVault.length > 0 ? (
                <div className="grid grid-cols-4 gap-4">
                  <div className="p-2 font-medium text-gray-700 bg-gray-100">Coin</div>
                  <div className="p-2 font-medium text-gray-700 bg-gray-100">Type</div>
                  <div className="p-2 font-medium text-gray-700 bg-gray-100">Amount</div>
                  <div className="p-2 font-medium text-gray-700 bg-gray-100">Your Share</div>
                  
                  {coinsInVault.map((coin, index) => (
                    <React.Fragment key={index}>
                      <div className="p-2 border-t border-gray-200 text-gray-500">{coin[0]}</div>
                      <div className="p-2 border-t border-gray-200 text-xs text-gray-500">{coin[1]}</div>
                      <div className="p-2 border-t border-gray-200 text-gray-500">
                        {Number(coin[2])/(Math.pow(10, coinMetadataQueries?.data?.[index]?.decimals || 0))}
                      </div>
                      <div className="p-2 border-t border-gray-200 text-gray-500">
                        {(Number(coin[2])/(Math.pow(10, coinMetadataQueries?.data?.[index]?.decimals || 0))) * (capPercentage || 0)}
                      </div>
                    </React.Fragment>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No assets in this Vault
                </div>
              )}
            </div>
          </div>
        </div>
      
      </div>
    </div>
  )
}

export default HeirBox