'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClientQuery,
  useSuiClient,
} from "@mysten/dapp-kit";
import useMoveStore from "../utils/moveStore";

// Format address function to prevent overflow
const formatAddress = (address: string) => {
  if (!address) return "";
  if (address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-19)}`; 
};

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

interface CoinData {
  name: string;
  coinType: string;
  balance: number;
}

interface CoinAddProps {
  coinsInVault?: any[];
  onTransactionSuccess?: () => void;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  const handleBackgroundClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only close if clicking the background, not the modal content
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleBackgroundClick}
    >
      <div className="bg-white rounded-lg shadow-md p-6 w-96 max-w-full relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl font-bold"
        >
          ×
        </button>
        {children}
      </div>
    </div>
  );
};

const CoinAdd: React.FC<CoinAddProps> = ({ 
  coinsInVault, 
  onTransactionSuccess
}) => {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  
  // Get functions from move store
  const fuseTxFunctions = useMoveStore((state) => state.fuseTxFunctions);
  const alterTx = useMoveStore((state) => state.alterTx);
  const packageName = useMoveStore((state) => state.packageName);
  
  // Use the hook with custom execute function to get more detailed transaction results
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

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState<CoinData | null>(null);
  const [amount, setAmount] = useState(0);
  const [errorr, setErrorr] = useState("");
  const [modalAnimation, setModalAnimation] = useState("");
  const [availableCoins, setAvailableCoins] = useState<CoinData[]>([]);
  const [coinMetadata, setCoinMetadata] = useState<any[]>([]);
  const [transactionDigest, setTransactionDigest] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Get all balances for current account
  const AllBLN = useSuiClientQuery(
    "getAllBalances",
    {
      owner: account?.address || "",
    },
    {
      enabled: !!account?.address,
    }
  );

  function normalizeType(typeStr: string) {
    return typeStr.replace(/^0x0+/, "0x");
  }

  // Update available coins when balances are fetched
  useEffect(() => {
    if (AllBLN.data) {
      // Extract user's coins from data
      const userCoins: CoinData[] = AllBLN.data.map((coin) => {
        // Extract coin name from the coinType path
        const coinPath = coin.coinType.split("::");
        const coinName = coinPath.length > 2 ? coinPath[2] : coinPath[1];

        return {
          name: coinName || "Unknown",
          coinType: coin.coinType,
          balance: parseInt(coin.totalBalance)
        };
      });

      // Set available coins to user's coins only
      setAvailableCoins(userCoins);
    }
  }, [AllBLN.data]);

  // Fetch coin metadata using suiClient directly in useEffect to avoid hook violations
  useEffect(() => {
    const fetchCoinMetadata = async () => {
      if (availableCoins.length === 0) {
        setCoinMetadata([]);
        return;
      }
      
      try {
        const metadataPromises = availableCoins.map(async (coin) => {
          try {
            const metadata = await suiClient.getCoinMetadata({
              coinType: normalizeType(coin.coinType)
            });
            // Ensure we always return an object with at least decimals
            return metadata || { decimals: 6 };
          } catch (error) {
            console.warn(`Failed to fetch metadata for ${coin.coinType}:`, error);
            return { decimals: 6 }; // Default decimals
          }
        });
        
        const metadata = await Promise.all(metadataPromises);
        // Filter out any null values and ensure all entries have decimals
        const safeMetadata = metadata.map(m => m || { decimals: 6 });
        setCoinMetadata(safeMetadata);
      } catch (error) {
        console.error("Error fetching coin metadata:", error);
        // Set default metadata for all coins
        const defaultMetadata = availableCoins.map(() => ({ decimals: 6 }));
        setCoinMetadata(defaultMetadata);
      }
    };

    fetchCoinMetadata();
  }, [availableCoins, suiClient]);

  // Get vault and owner cap objects
  const vaultAndCap = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address || "",
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!account?.address,
    }
  );

  // Extract owner cap and find vault ID
  const { ownerCapObjects, vaultID } = useMemo(() => {
    let ownerCapObjects: any = null;
    let vaultID: string | null = null;
    if (vaultAndCap.data) {
      console.log("Vault and Cap Data:", vaultAndCap.data.data);
      console.log(packageName + "::sea_vault::OwnerCap");
      // Search for smart will owner cap in the data
      ownerCapObjects = vaultAndCap.data.data.filter((obj: any) =>
        obj.data?.type?.includes(packageName + "::sea_vault::OwnerCap")
      );
      vaultID = ownerCapObjects[0]?.data?.content?.fields?.vaultID || null;
    }
    return { ownerCapObjects, vaultID };
  }, [vaultAndCap.data, packageName]);

  // Query for the vault object separately
  const vaultObject = useSuiClientQuery(
    "getObject",
    {
      id: vaultID || "",
      options: { showContent: true },
    },
    {
      enabled: !!vaultID,
    }
  );

  // Function to handle coin selection
  const handleCoinSelect = (coin: CoinData) => {
    setSelectedCoin(coin);
    setErrorr(""); // Clear any previous errors
  };

  // Modal functions
  const openModal = () => {
    setIsModalOpen(true);
    // Apply fade-in animation
    setModalAnimation("animate-fadeIn");
  };

  const closeModal = () => {
    // Apply fade-out animation
    setModalAnimation("animate-fadeOut");
    // Wait for animation to finish before hiding modal
    setTimeout(() => {
      setIsModalOpen(false);
      setErrorr("");
      setSelectedCoin(null);
      setAmount(0);
      setIsProcessing(false);
    }, 300);
  };

  // Safely extract object IDs from coins
  const safeExtractObjectIds = (coins: any[]) => {
    if (!coins) {
      console.log("No coins provided");
      return [];
    }
    
    if (!Array.isArray(coins)) {
      console.log("Coins is not an array:", typeof coins);
      return [];
    }
    
    // Handle both formats: { data: { objectId } } and { coinObjectId }
    return coins
      .filter(coin => coin && (coin.data?.objectId || coin.coinObjectId))
      .map(coin => coin.data?.objectId || coin.coinObjectId);
  };
  
  // Function to find matching coins for the selected coin type
  const findMatchingCoins = async () => {
    if (!selectedCoin) return [];

    const targetCoinType = normalizeType(selectedCoin.coinType);
    console.log(`Searching for coin type: ${targetCoinType}`);

    try {
      // Query for coins owned by the user that match the selected coin type
      const coins = await suiClient.getCoins({
        owner: account?.address || "",
        coinType: targetCoinType,
      });

      console.log(`Found ${coins.data.length} matching coins for ${targetCoinType}`, coins.data);
      return coins.data;
    } catch (error) {
      console.error(`Error fetching coins of type ${targetCoinType}:`, error);
      return [];
    }
  };

  // Handle adding a new coin - using modified fuseTxFunctions
  const handleAddCoin = async () => {
    // Validate input
    if (!selectedCoin) {
      setErrorr("Please select a coin");
      return;
    }

    if (amount <= 0) {
      setErrorr("Please enter an amount greater than 0");
      return;
    }

    if (!ownerCapObjects || ownerCapObjects.length === 0) {
      setErrorr("Owner capability object not found");
      return;
    }

    if (!vaultObject.data || !vaultObject.data.data) {
      setErrorr("Vault object not found");
      return;
    }

    if (!account?.address) {
      setErrorr("Account address not found");
      return;
    }

    // Prevent double submission
    if (isProcessing) {
      return;
    }
    
    setIsProcessing(true);
    setErrorr("Processing transaction... Please wait.");

    try {
      setErrorr("Processing transaction... Please wait.");
      setIsProcessing(true);
      
      // Get the matching coins and safely extract object IDs
      const matchingCoins = await findMatchingCoins();
      console.log("Found matching coins:", matchingCoins);
      
      // Safely extract the object IDs
      const coinObjectIds = safeExtractObjectIds(matchingCoins);
      console.log("Extracted coin object IDs:", coinObjectIds);
      
      if (coinObjectIds.length === 0) {
        setErrorr("No valid coin objects found");
        setIsProcessing(false);
        return;
      }
      
      // Find the metadata for the selected coin type from our stored metadata
      const selectedCoinIndex = availableCoins.findIndex(coin => 
        coin.name === selectedCoin.name && coin.coinType === selectedCoin.coinType
      );
      const dec = coinMetadata?.[selectedCoinIndex]?.decimals || 6;
      console.log("dec", dec);
      const amountInSmallestUnit = BigInt(
        Math.floor(amount * Math.pow(10, dec))
      );
      console.log("amountInSmallestUnit", amountInSmallestUnit);
      
      // Get the correct vault object
      const vault = vaultObject.data.data;
      
      // Extract the coin type
      const finalCoinType = normalizeType(selectedCoin.coinType);
      console.log("Transaction parameters:", {
        capId: ownerCapObjects[0]?.data?.objectId,
        vaultId: vault?.objectId,
        coinIds: coinObjectIds,
        amountInSmallestUnit: amountInSmallestUnit.toString(),
        name: selectedCoin.name,
        coinType: finalCoinType
      });

      let tx;
      console.log("coinsInVault", coinsInVault);
      console.log("condition", !coinsInVault || !Array.isArray(coinsInVault) || !coinsInVault.map((coin: any) => coin[0]).includes(selectedCoin.name));
      
      if (!coinsInVault || !Array.isArray(coinsInVault) || !coinsInVault.map((coin: any) => coin[0]).includes(selectedCoin.name)) {
        tx = fuseTxFunctions(
          ownerCapObjects[0]?.data?.objectId,
          vault?.objectId, 
          coinObjectIds,
          amountInSmallestUnit,
          finalCoinType,
          finalCoinType,
          account.address
        );
      } else {
        tx = alterTx(
          ownerCapObjects[0]?.data?.objectId,
          vault?.objectId,
          coinObjectIds,
          amountInSmallestUnit,
          finalCoinType,
          finalCoinType,
          account.address
        );
      }

      if (!tx) {
        setErrorr("Transaction functions not provided");
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
          onSuccess: (result: any) => {
            console.log("Transaction executed successfully", result);
            setTransactionDigest(result.digest);
            setTransactionStatus("Success");
            setErrorr("");
        
            // Don't close modal immediately to show the transaction digest
            setTimeout(() => {
              closeModal();
              if (onTransactionSuccess) {
                onTransactionSuccess();
              }
            }, 1000);
          },
          onError: (error: any) => {
            console.error("Transaction error:", error);
            setTransactionStatus("Failed");
            setErrorr("Transaction failed: " + (error.message || "Unknown error"));
            setIsProcessing(false);
          }
        }
      );
    } catch (error: any) {
      console.error("Error preparing transaction:", error);
      setErrorr("Error preparing transaction: " + (error.message || "Unknown error"));
      setIsProcessing(false);
    }
  };

  console.log("availableCoins", availableCoins);
  console.log("coinMetadata", coinMetadata);

  return (
    <>
      {/* Button styled to match the page's design */}
      <button
        onClick={openModal}
        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
      >
        Add New Asset
      </button>

      {/* Modal Window - Hidden by default */}
      {isModalOpen && (
        <Modal isOpen={isModalOpen} onClose={closeModal}>
          <div>
            <h3 className="text-2xl font-semibold text-black mb-4">
              Add New Asset
            </h3>

            {errorr && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md">
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
                      selectedCoin && selectedCoin.name === coin.name
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400 bg-gray-50"
                    }`}
                    onClick={() => handleCoinSelect(coin)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-black">{coin.name}</div>
                        <div
                          className="ml-1 text-xs text-gray-500 overflow-hidden text-ellipsis"
                          title={coin.coinType}
                        >
                          {formatAddress(coin.coinType)}
                        </div>
                      </div>
                      <div className="text-sm text-gray-600">
                        {coinMetadata && coinMetadata[index] 
                          ? (Number(coin.balance) / Math.pow(10, coinMetadata[index]?.decimals || 0)).toLocaleString(undefined, {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: coinMetadata[index]?.decimals || 2
                            })
                          : coin.balance || 0}
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

            {/* Show transaction digest if available */}
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
        </Modal>
      )}

      {/* CSS for animations */}
      <style jsx global>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes fadeOut {
          from {
            opacity: 1;
          }
          to {
            opacity: 0;
          }
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.95);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        @keyframes scaleOut {
          from {
            transform: scale(1);
            opacity: 1;
          }
          to {
            transform: scale(0.95);
            opacity: 0;
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out forwards;
        }

        .animate-fadeOut {
          animation: fadeOut 0.3s ease-out forwards;
        }

        .animate-scaleIn {
          animation: scaleIn 0.3s ease-out forwards;
        }

        .animate-scaleOut {
          animation: scaleOut 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
};

export default CoinAdd;
