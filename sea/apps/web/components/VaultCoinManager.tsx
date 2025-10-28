"use client";

import React, { useState, useEffect } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClientQuery,
  useSuiClient,
  useSuiClientQueries,
} from "@mysten/dapp-kit";
import { Tile } from "./tile";
import { getVaultAndOwnerCap, getVaultDynamicFields } from "../utils/queryer";
import { SuiObjectResponse, DynamicFieldInfo } from "@mysten/sui/client";

// TODO: Import these from your actual store locations
// import useMoveStore from "../store/moveStore";
// import useHeirStore from "../store/heirStore";

// PLACEHOLDER: Transaction functions - replace with actual implementations
const newCoinTxFunctions = (
  ownerCapId: string,
  vaultId: string,
  coinIds: string[],
  amount: bigint,
  coinType: string,
  finalCoinType: string,
  userAddress: string,
) => {
  console.log("PLACEHOLDER: newCoinTxFunctions called with:", {
    ownerCapId, vaultId, coinIds, amount: amount.toString(), coinType, finalCoinType, userAddress
  });
  // TODO: Replace with actual transaction building logic
  return null; // This should return a transaction block
};

const alterTx = (
  ownerCapId: string,
  vaultId: string,
  coinIds: string[],
  amount: bigint,
  coinType: string,
  finalCoinType: string,
  userAddress: string
) => {
  console.log("PLACEHOLDER: alterTx called with:", {
    ownerCapId, vaultId, coinIds, amount: amount.toString(), coinType, finalCoinType, userAddress
  });
  // TODO: Replace with actual transaction building logic
  return null; // This should return a transaction block
};

type VaultCoinManagerProps = {
  note?: string;
  minHeight?: string;
  className?: string;
  packageName?: string;
};

// Format address function to prevent overflow
const formatAddress = (address: string) => {
  if (!address) return "";
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-19)}`;
};

function normalizeType(typeStr: string) {
  return typeStr.replace(/^0x0+/, "0x");
}

export function VaultCoinManager({ 
  note = "Vault Manager", 
  minHeight = "min-h-[22rem]", 
  className,
  packageName = "0x1" // TODO: Update with actual package ID
}: VaultCoinManagerProps) {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();

  // Vault data state
  const [vaultData, setVaultData] = useState<{
    ownerCapObjects: SuiObjectResponse[] | null;
    vaultID: string | null;
    ownerCapId: string | null;
  } | null>(null);
  const [dynamicFields, setDynamicFields] = useState<DynamicFieldInfo[] | null>(null);
  const [coinsInVault, setCoinsInVault] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Coin add modal state
  const [showModal, setShowModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<[string, string, number] | null>(null);
  const [amount, setAmount] = useState(0);
  const [errorr, setErrorr] = useState("");
  const [modalAnimation, setModalAnimation] = useState("");
  const [availableCoins, setAvailableCoins] = useState<[string, string, number][]>([]);
  const [coinMetadata, setCoinMetadata] = useState<any[]>([]);
  const [transactionDigest, setTransactionDigest] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Transaction hook
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
          showRawEffects: true,
        },
      }),
  });

  // Get all balances for current account
  const AllBLN = useSuiClientQuery(
    "getAllBalances",
    {
      owner: account?.address || "",
    },
    {
      enabled: !!account,
    }
  );

  // Get vault and owner cap objects
  const vaultAndCap = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address || "",
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!account,
    }
  );

  // Query vault object
  const vaultObject = useSuiClientQuery(
    "getObject",
    {
      id: vaultData?.vaultID || "",
      options: { showContent: true },
    },
    {
      enabled: !!vaultData?.vaultID,
    }
  );

  // Fetch vault data
  useEffect(() => {
    const fetchVaultData = async () => {
      if (!account?.address) return;
      
      setLoading(true);
      try {
        const vaultResult = await getVaultAndOwnerCap({
          accountAddress: account.address,
          packageName: packageName
        });
        
        console.log("Vault and OwnerCap data:", vaultResult);
        setVaultData(vaultResult || null);

        // If we have a vault ID, get dynamic fields
        if (vaultResult?.vaultID) {
          const dynamicFieldsResult = await getVaultDynamicFields({
            vaultID: vaultResult.vaultID
          });
          
          console.log("Vault dynamic fields:", dynamicFieldsResult);
          setDynamicFields(dynamicFieldsResult || null);
          
          // Extract coins from dynamic fields
          if (dynamicFieldsResult) {
            const coins = dynamicFieldsResult.map((field: any) => {
              return [field.name?.value || 'Unknown', field.objectType || '', 0]; // Adjust based on actual structure
            });
            setCoinsInVault(coins);
          }
        }
      } catch (error) {
        console.error("Error fetching vault data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVaultData();
  }, [account?.address, packageName]);

  // Update available coins when balances are fetched
  useEffect(() => {
    if (AllBLN.data) {
      const userCoins = AllBLN.data.map((coin) => {
        const coinPath = coin.coinType.split("::");
        const coinName = coinPath.length > 2 ? coinPath[2] : coinPath[1];
        return [coinName, coin.coinType, parseInt(coin.totalBalance)] as [string, string, number];
      });
      setAvailableCoins(userCoins);
    }
  }, [AllBLN.data]);

  // Query metadata for all available coins
  const coinMetadataQueries = useSuiClientQueries({
    queries: availableCoins.map(coin => ({
      method: "getCoinMetadata" as const,
      params: {
        coinType: normalizeType(coin[1])
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
  });

  useEffect(() => {
    if (coinMetadataQueries.data && availableCoins.length > 0) {
      setCoinMetadata(coinMetadataQueries.data);
    }
  }, [coinMetadataQueries.data, availableCoins.length]);

  // Modal functions
  const openModal = () => {
    setShowModal(true);
    setModalAnimation("animate-fadeIn");
  };

  const closeModal = () => {
    setModalAnimation("animate-fadeOut");
    setTimeout(() => {
      setShowModal(false);
      setErrorr("");
      setSelectedCoin(null);
      setAmount(0);
      setIsProcessing(false);
    }, 300);
  };

  // Handle coin selection
  const handleCoinSelect = (coin: [string, string, number]) => {
    setSelectedCoin(coin);
    setErrorr("");
  };

  // Find matching coins for the selected coin type
  const findMatchingCoins = () => {
    if (!selectedCoin || !vaultAndCap.data) return [];

    const coinType = normalizeType(selectedCoin[1]);
    console.log(`Searching for coin type: ${coinType}`);

    const coinss = vaultAndCap.data.data.filter((obj) => {
      const objType = obj.data?.type;
      if (!objType) return false;

      const match = objType.match(/<([^>]+)>/);
      if (match && match[1]) {
        const extractedCoinType = match[1];
        return extractedCoinType === normalizeType(selectedCoin[1]);
      }
      return false;
    }) || [];

    console.log(`Found ${coinss.length} matching coins`, coinss, coinType);
    return coinss;
  };

  // Safely extract object IDs from coins
  const safeExtractObjectIds = (coins: any[]) => {
    if (!coins || !Array.isArray(coins)) {
      return [];
    }
    
    return coins
      .filter(coin => coin && coin.data && coin.data.objectId)
      .map(coin => coin.data.objectId);
  };

  // Handle adding a new coin
  const handleAddCoin = async () => {
    if (!selectedCoin) {
      setErrorr("Please select a coin");
      return;
    }

    if (amount <= 0) {
      setErrorr("Please enter an amount greater than 0");
      return;
    }

    if (!vaultData?.ownerCapObjects || vaultData.ownerCapObjects.length === 0) {
      setErrorr("Owner capability object not found");
      return;
    }

    if (!vaultObject.data || !vaultObject.data.data) {
      setErrorr("Vault object not found");
      return;
    }

    if (isProcessing) {
      return;
    }
    
    setIsProcessing(true);
    setErrorr("Processing transaction... Please wait.");

    try {
      const matchingCoins = findMatchingCoins();
      const coinObjectIds = safeExtractObjectIds(matchingCoins);
      
      if (coinObjectIds.length === 0) {
        setErrorr("No valid coin objects found");
        setIsProcessing(false);
        return;
      }
      
      const selectedCoinIndex = availableCoins.findIndex(coin => 
        coin[0] === selectedCoin[0] && coin[1] === selectedCoin[1]
      );
      const dec = coinMetadata?.[selectedCoinIndex]?.decimals || 9;
      const amountInSmallestUnit = BigInt(
        Math.floor(amount * Math.pow(10, dec))
      );
      
      // PLACEHOLDER: Package name - replace with actual package ID
      const vault = vaultObject.data.data;
      const finalCoinType = normalizeType(selectedCoin[1]);
      
      console.log("Transaction parameters:", {
        capId: vaultData.ownerCapObjects?.[0]?.data?.objectId,
        vaultId: vault.objectId,
        coinIds: coinObjectIds,
        amountInSmallestUnit: amountInSmallestUnit.toString(),
        name: selectedCoin[0],
        coinType: finalCoinType
      });

      // PLACEHOLDER: Transaction building logic
      let tx;
      console.log("coinsInVault", coinsInVault);
      console.log("condition", !coinsInVault || !Array.isArray(coinsInVault) || !coinsInVault.map(coin => coin[0]).includes(selectedCoin[0]));
      
      if (!coinsInVault || !Array.isArray(coinsInVault) || !coinsInVault.map(coin => coin[0]).includes(selectedCoin[0])) {
        // TODO: Replace with actual newCoinTxFunctions from store
        tx = newCoinTxFunctions(
          vaultData.ownerCapObjects?.[0]?.data?.objectId || "",
          vault.objectId, 
          coinObjectIds,
          amountInSmallestUnit,
          finalCoinType,
          finalCoinType,
          account?.address || ""
        );
      } else {
        // TODO: Replace with actual alterTx from store
        tx = alterTx(
          vaultData.ownerCapObjects?.[0]?.data?.objectId || "",
          vault.objectId,
          coinObjectIds,
          amountInSmallestUnit,
          finalCoinType,
          finalCoinType,
          account?.address || ""
        );
      }

      if (!tx) {
        setErrorr("Failed to build transaction");
        setIsProcessing(false);
        return;
      }

      console.log("Executing transaction...");
      setErrorr("Executing transaction...");
      
      // Execute the transaction with callback handlers
      signAndExecuteTransaction(
        {
          transaction: tx,
          chain: "sui:testnet"
        },
        {
          onSuccess: (result) => {
            console.log("Transaction executed successfully", result);
            setTransactionDigest(result.digest);
            setTransactionStatus("Success");
            setErrorr("");
            
            setTimeout(() => {
              closeModal();
              // TODO: Add onTransactionSuccess callback if needed
              // onTransactionSuccess?.();
              
              // Refetch vault data
              window.location.reload(); // Replace with proper refetch
            }, 1000);
          },
          onError: (error) => {
            console.error("Transaction error:", error);
            setTransactionStatus("Failed");
            setErrorr("Transaction failed: " + (error.message || "Unknown error"));
            setIsProcessing(false);
          }
        }
      );

    } catch (error) {
      console.error("Error preparing transaction:", error);
      setErrorr("Error preparing transaction: " + ((error as Error).message || "Unknown error"));
      setIsProcessing(false);
    }
  };

  const displayNote = loading 
    ? "Loading vault data..." 
    : vaultData?.vaultID 
      ? `Vault ID: ${vaultData.vaultID.slice(0, 8)}...${vaultData.vaultID.slice(-8)}` 
      : note;

  return (
    <>
      <Tile title="Vault Manager" description={displayNote} minHeight={minHeight} className={className}>
        <div className="mt-4 space-y-4">
          {/* Add Asset Button */}
          {vaultData?.vaultID && (
            <div className="flex justify-between items-center">
              <h4 className="font-bold text-sm">Assets in Vault</h4>
              <button
                onClick={openModal}
                className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition"
              >
                Add Asset
              </button>
            </div>
          )}
          
          {/* Display coins in vault */}
          {coinsInVault.length > 0 && (
            <div className="text-xs">
              <div className="space-y-2">
                {coinsInVault.map((coin, index) => (
                  <div key={index} className="bg-gray-50 p-2 rounded flex justify-between">
                    <span className="font-medium">{coin[0]}</span>
                    <span className="text-gray-600">{coin[2] || 0}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Vault data for debugging */}
          {vaultData && (
            <div className="text-xs">
              <h4 className="font-bold mb-2">Vault Data:</h4>
              <div className="bg-gray-100 p-2 rounded text-xs">
                <p><strong>Vault ID:</strong> {formatAddress(vaultData.vaultID || "")}</p>
                <p><strong>Owner Cap ID:</strong> {formatAddress(vaultData.ownerCapId || "")}</p>
              </div>
            </div>
          )}
          
          {!vaultData && !loading && (
            <div className="text-sm text-gray-500">No vault data found</div>
          )}
        </div>
      </Tile>

      {/* Add Asset Modal */}
      {showModal && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${modalAnimation}`}
        >
          <div
            className={`bg-white rounded-lg shadow-md p-6 w-96 max-w-full ${modalAnimation === "animate-fadeIn" ? "animate-scaleIn" : "animate-scaleOut"}`}
          >
            <h3 className="text-2xl font-semibold text-black mb-4">
              Add New Asset
            </h3>

            {errorr && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
                {errorr}
              </div>
            )}

            <div className="mb-4">
              <label className="block text-lg font-medium text-black mb-2">
                Select Coin
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableCoins.map((coin, index) => (
                  <div
                    key={index}
                    className={`p-3 border rounded-lg cursor-pointer transition ${
                      selectedCoin && selectedCoin[0] === coin[0]
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400 bg-gray-50"
                    }`}
                    onClick={() => handleCoinSelect(coin)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-black">{coin[0]}</div>
                        <div
                          className="ml-1 text-xs text-gray-500 overflow-hidden text-ellipsis"
                          title={coin[1]}
                        >
                          {formatAddress(coin[1])}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {coinMetadata && coinMetadata[index] 
                          ? (Number(coin[2]) / Math.pow(10, coinMetadata[index]?.decimals || 0)).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: coinMetadata[index]?.decimals || 2
                            })
                          : coin[2] || 0}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-lg font-medium text-black mb-2">
                Amount
              </label>
              <input
                type="number"
                min="0"
                step="0.000000001"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-black"
                placeholder="Enter amount"
                disabled={isProcessing}
              />
            </div>

            {/* Transaction result */}
            {transactionDigest && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                <p className="font-medium">Transaction {transactionStatus}</p>
                <p className="text-xs break-all mt-1">
                  Digest: {transactionDigest}
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100 transition text-black"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleAddCoin}
                disabled={!selectedCoin || amount <= 0 || isProcessing}
                className={`px-4 py-2 text-white rounded transition ${
                  !selectedCoin || amount <= 0 || isProcessing
                    ? "bg-blue-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600"
                }`}
              >
                {isProcessing ? "Processing..." : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }

        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        @keyframes scaleOut {
          from { transform: scale(1); opacity: 1; }
          to { transform: scale(0.95); opacity: 0; }
        }

        .animate-fadeIn { animation: fadeIn 0.3s ease-out forwards; }
        .animate-fadeOut { animation: fadeOut 0.3s ease-out forwards; }
        .animate-scaleIn { animation: scaleIn 0.3s ease-out forwards; }
        .animate-scaleOut { animation: scaleOut 0.3s ease-out forwards; }
      `}</style>
    </>
  );
}
