"use client";
import React, { useState, useEffect, useMemo } from "react";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
  useSuiClientQuery,
  useAutoConnectWallet,
  useSuiClient,
  useSuiClientQueries,
} from "@mysten/dapp-kit";
import useMoveStore from "../store/moveStore"; // Ensure correct path to your store
import useHeirStore from '../store/heirStore'
// Format address function to prevent overflow
const formatAddress = (address) => {
  if (!address) return "";
  if(address.length <= 14) return address;
  return `${address.slice(0, 8)}...${address.slice(-19)}`; 
};

const coinAdd = ({coinsInVault, onTransactionSuccess}) => {
  const account = useCurrentAccount();
  const autoConnectionStatus = useAutoConnectWallet();
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
  });  // Get fuseTxFunctions from store
  const fuseTxFunctions = useMoveStore((state) => state.fuseTxFunctions);
  const alterTx = useMoveStore((state) => state.alterTx);
  const VaultNames = useHeirStore((state) => state.VaultName);
  const packageName = useMoveStore((state) => state.packageName);
  // Get the Sui client for advanced transaction options
  const suiClient = useSuiClient();
  const [showModal, setShowModal] = useState(false);
  const [selectedCoin, setSelectedCoin] = useState(null);
  const [amount, setAmount] = useState(0);
  const [errorr, setErrorr] = useState("");
  const [modalAnimation, setModalAnimation] = useState("");
  const [availableCoins, setAvailableCoins] = useState([]);
  const [coinMetadata, setCoinMetadata] = useState([]);
  const [transactionDigest, setTransactionDigest] = useState("");
  const [transactionStatus, setTransactionStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Get all balances for current account
  const AllBLN = useSuiClientQuery(
    "getAllBalances",
    {
      owner: account?.address,
    },
    {
      enabled: !!account,
    }
  );

  function normalizeType(typeStr) {
    return typeStr.replace(/^0x0+/, "0x");
  }

  // Update available coins when balances are fetched
  useEffect(() => {
    if (AllBLN.data) {
      // Extract user's coins from data
      const userCoins = AllBLN.data.map((coin) => {
        // Extract coin name from the coinType path
        const coinPath = coin.coinType.split("::");
        const coinName = coinPath.length > 2 ? coinPath[2] : coinPath[1];

        // Format balance for display (convert from smallest units)

        return [coinName, coin.coinType, parseInt(coin.totalBalance)];
      });

      // Set available coins to user's coins only
      setAvailableCoins(userCoins);
    }
  }, [AllBLN.data]);

  // Get the metadata for the selected coin
  // Query metadata for all available coins at once
  const coinMetadataQueries = useSuiClientQueries({
    queries: availableCoins.map(coin => ({
      method: "getCoinMetadata",
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
    enabled: availableCoins.length > 0 && !!account,
  });
  useEffect(() => {
    if (coinMetadataQueries.data) {
      setCoinMetadata(coinMetadataQueries.data);
    }
  }, [coinMetadataQueries.data]);

  // Get vault and owner cap objects
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

  // Extract owner cap and find vault ID
  const { ownerCapObjects, vaultID } = React.useMemo(() => {
    let ownerCapObjects = null;
    let vaultID = null;
    if (vaultAndCap.data) {
      console.log("Vault and Cap Data:", vaultAndCap.data.data);
      console.log(packageName + "::seaVault::OwnerCap")
      // Search for smart will owner cap in the data
      ownerCapObjects = vaultAndCap.data.data.filter((obj) =>
        obj.data?.type?.includes(packageName + "::seaVault::OwnerCap")
      );
      vaultID = ownerCapObjects[0]?.data?.content?.fields?.vaultID;
    }
    // console.log("Owner Cap Objects:", ownerCapObjects, vaultID);
    return { ownerCapObjects, vaultID };
  }, [vaultAndCap.data]);

  // Query for the vault object separately
  const vaultObject = useSuiClientQuery(
    "getObject",
    {
      id: vaultID,
      options: { showContent: true },
    },
    {
      enabled: !!vaultID,
    }
  );

  // Function to handle coin selection
  const handleCoinSelect = (coin) => {
    setSelectedCoin(coin);
    setErrorr(""); // Clear any previous errors
  };

  // Modal functions
  const openModal = () => {
    setShowModal(true);
    // Apply fade-in animation
    setModalAnimation("animate-fadeIn");
  };

  const closeModal = () => {
    // Apply fade-out animation
    setModalAnimation("animate-fadeOut");
    // Wait for animation to finish before hiding modal
    setTimeout(() => {
      setShowModal(false);
      setErrorr("");
      setSelectedCoin(null);
      setAmount(0);
      setIsProcessing(false);
    }, 300);
  };

  // Safely extract object IDs from coins
  const safeExtractObjectIds = (coins) => {
    if (!coins) {
      console.log("No coins provided");
      return [];
    }
    
    if (!Array.isArray(coins)) {
      console.log("Coins is not an array:", typeof coins);
      return [];
    }
    
    return coins
      .filter(coin => coin && coin.data && coin.data.objectId)
      .map(coin => coin.data.objectId);
  };
  
  // Function to find matching coins for the selected coin type
  const findMatchingCoins = () => {
    if (!selectedCoin) return [];

    // Get the full coin type path
    const coinType = normalizeType(selectedCoin[1]);
    console.log(`Searching for coin type: ${coinType}`);

    // Find coins that match the coin type within a Coin<Type> structure
    const coinss =
      vaultAndCap.data?.data.filter((obj) => {
        const objType = obj.data?.type;
        if (!objType) return false;

        // Extract coin type from within <>
        const match = objType.match(/<([^>]+)>/);
        if (match && match[1]) {
          const extractedCoinType = match[1];
          console.log(
            `Matching: extracted coin type = ${extractedCoinType}, target = ${normalizeType(selectedCoin[1])}`
          );

          return extractedCoinType === normalizeType(selectedCoin[1]);
        }
        return false;
      }) || [];

    console.log(`Found ${coinss.length} matching coins`, coinss, coinType);

    return coinss;
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
      const matchingCoins = findMatchingCoins();
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
        coin[0] === selectedCoin[0] && coin[1] === selectedCoin[1]
      );
      const dec = coinMetadata?.[selectedCoinIndex]?.decimals;
      console.log("dec", dec)
      const amountInSmallestUnit = BigInt(
        Math.floor(amount * Math.pow(10, dec))
      );
      console.log("amountInSmallestUnit", amountInSmallestUnit)
      
      // Get the correct vault object
      const vault = vaultObject.data.data;
      
      // Extract the coin type
      const finalCoinType = normalizeType(selectedCoin[1]);
        console.log("Transaction parameters:", {
        capId: ownerCapObjects[0].data.objectId,
        vaultId: vault.objectId,
        coinIds: coinObjectIds,
        amountInSmallestUnit: amountInSmallestUnit.toString(),
        name: selectedCoin[0], // Using the coin name (first element in selectedCoin array)
        coinType: finalCoinType
      });
      let tx
      console.log("coinsInVault",coinsInVault)
      console.log("condition",!coinsInVault || !Array.isArray(coinsInVault) || !coinsInVault.map(coin => coin[0]).includes(selectedCoin[0]))
      if(!coinsInVault || !Array.isArray(coinsInVault) || !coinsInVault.map(coin => coin[0]).includes(selectedCoin[0])){
        tx = fuseTxFunctions(
          ownerCapObjects[0].data.objectId,
          vault.objectId, 
          coinObjectIds,
          amountInSmallestUnit,
          finalCoinType, // Using the coin name (first element in selectedCoin array)
          finalCoinType,
          account?.address
        );
      }else{
        tx = alterTx(
          ownerCapObjects[0].data.objectId,
          vault.objectId,
          coinObjectIds,
          amountInSmallestUnit,
          finalCoinType, // Using the coin name (first element in selectedCoin array)
          finalCoinType,
          account?.address
        )
      }


      // Create transaction without gas handling

      
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
        
            
            // Don't close modal immediately to show the transaction digest
            setTimeout(() => {
              closeModal();
              onTransactionSuccess();
            }, 1000); // Show transaction result for 5 seconds before closing
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
      setErrorr("Error preparing transaction: " + (error.message || "Unknown error"));
      setIsProcessing(false);
    }
  };
  console.log("availableCoins", availableCoins)
  console.log("coinMetadataQueries", coinMetadataQueries.data)

  return (
    <>
      {/* Button styled to match the page's design */}
      <button
        onClick={openModal}
        className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
      >
        Add New Asset
      </button>

      {/* Modal Window - Hidden by default */}
      {showModal && (
        <div
          className={`fixed inset-0 bg-black/50 flex items-center justify-center z-50 ${modalAnimation}`}
          onClick={closeModal}
        >
          <div
            className={`bg-white rounded-lg shadow-md p-6 w-96 max-w-full ${modalAnimation === "animate-fadeIn" ? "animate-scaleIn" : "animate-scaleOut"}`}
          >
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
                      selectedCoin && selectedCoin[0] === coin[0]
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-300 hover:border-gray-400 bg-gray-50"
                    }`}
                    onClick={() => handleCoinSelect(coin)}
                    disabled={isProcessing}
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
        </div>
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

export default coinAdd;