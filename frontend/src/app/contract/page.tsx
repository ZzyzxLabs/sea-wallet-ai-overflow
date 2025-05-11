"use client";
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton, useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import useHeirStore from "../../store/heirStore"; 
import { useRouter } from "next/navigation";
import useMoveStore from "../../store/moveStore";
import { bcs, BcsType } from '@mysten/bcs';
import HeirCard from "../../component/HeirCard";
import axios from 'axios';

// VecMap function for serializing key-value pairs
function VecMap<K extends BcsType<any>, V extends BcsType<any>>(K: K, V: V) {
  return bcs.struct(
    `VecMap<${K.name}, ${V.name}>`,
    {
      keys: bcs.vector(K),
      values: bcs.vector(V),
    }
  );
}
const sendWillNotification = async (recipientEmail, secureLink) => {
  try {
    const response = await axios.post('/api/mailService', {
      to: recipientEmail,
      url: secureLink
    });
    
    console.log('Email sent successfully:', response.data);
    return response.data;
  } catch (error) {
    console.error('Failed to send email:', error);
    throw error;
  }
};
// Separate heirs into two groups: those using Sui blockchain addresses and those using email addresses
function separateHeirsByAddressType(heirs) {
  const suiAddressHeirs = [];
  const emailHeirs = [];
  
  heirs.forEach(heir => {
    if (heir.address && heir.address.startsWith("0x") && !heir.address.includes("@")) {
      suiAddressHeirs.push({...heir});
    } else {
      emailHeirs.push({...heir});
    }
  });
  
  return {
    suiAddressHeirs,
    emailHeirs
  };
}

// Prepare heirs data for VecMap format
function prepareHeirsForVecMap(heirs, keyField, valueField) {
  return {
    keys: heirs.map(heir => heir[keyField]),
    values: heirs.map(heir => heir[valueField])
  };
}

// Serialize heirs data into VecMap
function serializeHeirsToVecMaps(heirs) {
  // Separate heirs
  const { suiAddressHeirs, emailHeirs } = separateHeirsByAddressType(heirs);
  
  // Prepare VecMap data for Sui address heirs
  const suiNameRatioMap = {
    keys: suiAddressHeirs.map(heir => heir.name),
    values: suiAddressHeirs.map(heir => heir.ratio)
  };
  
  const suiAddressRatioMap = {
    keys: suiAddressHeirs.map(heir => heir.address),
    values: suiAddressHeirs.map(heir => heir.ratio)
  };
  
  // Prepare VecMap data for email heirs
  const emailNameRatioMap = {
    keys: emailHeirs.map(heir => heir.name),
    values: emailHeirs.map(heir => heir.ratio)
  };
  
  const emailAddressRatioMap = {
    keys: emailHeirs.map(heir => heir.address),
    values: emailHeirs.map(heir => heir.ratio)
  };
  
  // For debugging, create a raw data version (not serialized)
  const rawData = {
    suiNameRatio: suiNameRatioMap,
    suiAddressRatio: suiAddressRatioMap,
    emailNameRatio: emailNameRatioMap,
    emailAddressRatio: emailAddressRatioMap
  };
  
  // Serialized data
  const serializedData = {
    suiNameRatio: VecMap(bcs.string(), bcs.string())
      .serialize(suiNameRatioMap)
      .toBytes(),
      
    suiAddressRatio: VecMap(bcs.string(), bcs.string())
      .serialize(suiAddressRatioMap)
      .toBytes(),
      
    emailNameRatio: VecMap(bcs.string(), bcs.string())
      .serialize(emailNameRatioMap)
      .toBytes(),
      
    emailAddressRatio: VecMap(bcs.string(), bcs.string())
      .serialize(emailAddressRatioMap)
      .toBytes()
  };
  
  return {
    raw: rawData,
    serialized: serializedData
  };
}

export default function TestingP() {
  const account = useCurrentAccount();
  const router = useRouter();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
        },
      }),
  });
  
  // For storing previous heirs count and animation state
  const prevHeirsCountRef = useRef(0);
  const animationInProgressRef = useRef(false);
  const cardRef = useRef(null);
  
  // State management
  const [showAdditionalTx, setShowAdditionalTx] = useState(false);
  const [vaultID, setVaultID] = useState("");
  const [ownerCap, setOwnerCap] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Get state and methods from Zustand store
  const {
    isConnecting,
    showWelcome,
    showNextCard,
    showDashboardIndicator,
    showWarning,
    warningMessage,
    heirs,
    setIsConnecting,
    setShowWelcome,
    setShowNextCard,
    setShowDashboardIndicator,
    closeWarning,
    addHeir,
    removeHeir,
    updateHeir,
    getTotalRatio,
    handleVerify,
    showWarningMessage,
  } = useHeirStore();
  
  const { createVaultTx, zkTransaction, mintCap } = useMoveStore();
  
  // Handle connect button click
  const handleConnect = () => {
    setIsConnecting(true);
  };
  
  // Auto check account connection status
  useEffect(() => {
    if (account && account.address && !isConnecting) {
      console.log("Account already connected:", account.address);
      setTimeout(() => {
        setIsConnecting(true);
      }, 100);
    }
  }, [account, isConnecting]);
    // Monitor account status changes, control animation sequence
  useEffect(() => {
    if (account && isConnecting) {
      const timerShowWelcome = setTimeout(() => {
        setShowWelcome(true);

        const timerNextCard = setTimeout(() => {
          setShowWelcome(false);

          setTimeout(() => {
            setShowNextCard(true);
          }, 500);
        }, 3000);

        return () => clearTimeout(timerNextCard);
      }, 500);

      return () => clearTimeout(timerShowWelcome);
    }
  }, [account, isConnecting, setShowWelcome, setShowNextCard]);

  // Handle dashboard redirect
  useEffect(() => {
    if (showDashboardIndicator) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showDashboardIndicator, router]);

  // Monitor heirs count change, control card animation
  useEffect(() => {
    if (heirs.length !== prevHeirsCountRef.current && !animationInProgressRef.current) {
      animationInProgressRef.current = true;
      
      requestAnimationFrame(() => {
        if (heirs.length > prevHeirsCountRef.current) {
          if (cardRef.current) {
            // Card expand animation
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight + 80}px`;
            
            // Find the newly added heir field
            const newHeirElements = document.querySelectorAll('[data-heir-id]');
            const newHeirElement = newHeirElements[newHeirElements.length - 1];
            
            if (newHeirElement) {
              // Set animation initial state
              newHeirElement.style.opacity = '0';
              newHeirElement.style.transform = 'translateY(15px)';
              
              // Force browser reflow
              void newHeirElement.offsetWidth;
              
              // Start element animation
              setTimeout(() => {
                newHeirElement.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
                newHeirElement.style.opacity = '1';
                newHeirElement.style.transform = 'translateY(0)';
              }, 50);
            }
            
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 400);
          }
        } else {
          // Shrink animation for removing heir
          if (cardRef.current) {
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight}px`;
            
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 350);
          } else {
            animationInProgressRef.current = false;
          }
        }
        
        // Update heirs count
        prevHeirsCountRef.current = heirs.length;
      });
    }
  }, [heirs.length]);

  // Handle add heir
  const handleAddHeir = () => {
    if (animationInProgressRef.current) return;
    addHeir();
  };

  // Format address display
  const formatAddress = (address) => {
    if (!address) return "User";
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  // Create and execute the first transaction
  const executeTransaction = async () => {
    // Form validation
    if (handleVerify()) {
      try {
        setIsProcessing(true);
        
        // Output data to console
        const { raw } = serializeHeirsToVecMaps(heirs);
        console.log("=== VecMap data at transaction execution ===");
        console.log("Sui heirs:");
        console.table(raw.suiNameRatio);
        console.table(raw.suiAddressRatio);
        console.log("Email heirs:");
        console.table(raw.emailNameRatio);
        console.table(raw.emailAddressRatio);
        
        // Execute transaction
        const transactionResult = await signAndExecuteTransaction(
          {
            transaction: createVaultTx(),
            chain: "sui:testnet",
          },
          {
            onSuccess: (result) => {
              console.log("executed transaction", result);
              
              // Extract vaultID and ownerCap from transaction result
              const vaultObject = result.objectChanges.find(
                (obj) =>
                  obj.type === "created" &&
                  obj.objectType.includes("::vault::Vault")
              );

              const ownerCapObject = result.objectChanges.find(
                (obj) =>
                  obj.type === "created" &&
                  obj.objectType.includes("::vault::OwnerCap")
              );

              if (vaultObject && ownerCapObject) {
                const vaultIDFromTx = vaultObject.objectId;
                const ownerCapFromTx = ownerCapObject.objectId;

                console.log("Vault ID:", vaultIDFromTx);
                console.log("Owner Cap:", ownerCapFromTx);

                // Save values for later use
                setVaultID(vaultIDFromTx);
                setOwnerCap(ownerCapFromTx);
              } else {
                console.error("Failed to retrieve Vault ID or Owner Cap from the result.");
              }
              
              // After transaction success, show additional transaction card
              setTimeout(() => {
                setShowNextCard(false);
                setShowAdditionalTx(true);
                setIsProcessing(false);
              }, 100);
            },
            onError: (error) => {
              console.error("Transaction error:", error);
              showWarningMessage("Transaction failed: " + error.message);
              setIsProcessing(false);
            }
          }
        );
        
        return transactionResult;
      } catch (error) {
        console.error("Transaction execution error:", error);
        showWarningMessage("Transaction execution error: " + error.message);
        setIsProcessing(false);
      }
    }
  };

  // Call useSuiClientQuery at the top of the component and pass the result to needed functions
  const ownedObjectsQuery = useSuiClientQuery('getOwnedObjects', {
    owner: account?.address,
    filter: {
      StructType: '0x9622fd64681280dc61eecf7fbc2e756bb7614cf5662f220044f573758f922c71::vault::OwnerCap',
    },
    options:{
      showType: true,
    },
  });
  if(!ownedObjectsQuery.isPending) {console.log("Owned objects query result:", ownedObjectsQuery.data);}
  // Put all OwnerCap objectIds into a list
  let ownerCapObjectIds: string[] = [];
  if (!ownedObjectsQuery.isPending && ownedObjectsQuery.data && Array.isArray(ownedObjectsQuery.data.data)) {
    ownerCapObjectIds = ownedObjectsQuery.data.data.map((item) => item.data.objectId);
    console.log("OwnerCap object IDs:", ownerCapObjectIds);
  }
  // Create custom transaction A - send capability to heirs
  const executeCustomTxA = async () => {
    try {
      setIsProcessing(true);
      console.log("Current account address:", account.address);
      
      // 在此獲取郵件繼承人列表
      const { emailHeirs } = separateHeirsByAddressType(heirs);
      
      const { tx, urls } = await zkTransaction(
        account.address, 
        "testnet", 
        ownerCapObjectIds,
      );
      
      console.log("Generated URLs:", urls);
      console.log("Transaction object:", tx);
      
      // 檢查tx是否為陣列
      if (Array.isArray(tx)) {
        console.log(`Need to process ${tx.length} transactions`);
        
        // 完成交易的計數器
        let completedTxCount = 0;
        
        // 向用戶顯示進度信息
        showWarningMessage(`Starting to process ${tx.length} transactions...`);
        
        // 按順序處理每個交易
        for (let i = 0; i < tx.length; i++) {
          const currentTx = tx[i];
          
          try {
            // 更新處理狀態消息
            showWarningMessage(`Processing transaction ${i + 1}/${tx.length}...`);
            
            // 執行當前交易
            await signAndExecuteTransaction(
              {
                transaction: currentTx,
                chain: "sui:testnet",
              },
              {
                onSuccess: (result) => {
                  console.log(`Transaction ${i + 1}/${tx.length} executed successfully:`, result);
                  
                  // 增加已完成交易數量
                  completedTxCount++;
                  
                  // 如果所有交易都完成，進入下一步
                  if (completedTxCount === tx.length) {
                    // 顯示成功消息
                    showWarningMessage("All transactions completed successfully!");
                    
                    // 向郵件繼承人發送通知
                    emailHeirs.forEach(async (heir) => {
                      try {
                        const result = await sendWillNotification(heir.address, `https://yourdomain.com/claim/vault/${vaultID}`);
                        console.log(`Email notification sent to ${heir.address}`);
                      } catch (err) {
                        console.error(`Failed to notify heir ${heir.address}:`, err);
                      }
                    });
                    
                    // 延遲過渡到下一步
                    setTimeout(() => {
                      setShowAdditionalTx(false);
                      setShowDashboardIndicator(true);
                      setIsProcessing(false);
                    }, 100);
                  }
                },
                onError: (error) => {
                  console.error(`Transaction ${i + 1}/${tx.length} execution error:`, error);
                  showWarningMessage(`Transaction ${i + 1}/${tx.length} failed: ${error.message}`);
                  setIsProcessing(false);
                  // 失敗時停止進一步交易
                  return;
                }
              }
            );
          } catch (error) {
            console.error(`Transaction ${i + 1}/${tx.length} processing error:`, error);
            showWarningMessage(`Transaction ${i + 1}/${tx.length} processing error: ${error.message || String(error)}`);
            setIsProcessing(false);
            break; // 失敗時停止循環
          }
        }
      } else {
        // 如果tx不是陣列，視為單個交易
        await signAndExecuteTransaction(
          {
            transaction: tx,
            chain: "sui:testnet",
          },
          {
            onSuccess: (result) => {
              console.log("Custom transaction executed successfully:", result);
              
              // 顯示成功消息
              showWarningMessage("Transaction completed successfully!");
              
              // 向郵件繼承人發送通知
              emailHeirs.forEach(async (heir) => {
                try {
                  const result = await sendWillNotification(heir.address, `https://yourdomain.com/claim/vault/${vaultID}`);
                  console.log(`Email notification sent to ${heir.address}`);
                } catch (err) {
                  console.error(`Failed to notify heir ${heir.address}:`, err);
                }
              });
              
              // 延遲過渡到下一步
              setTimeout(() => {
                setShowAdditionalTx(false);
                setShowDashboardIndicator(true);
                setIsProcessing(false);
              }, 100);
            },
            onError: (error) => {
              console.error("Custom transaction error:", error);
              showWarningMessage("Custom transaction failed: " + error.message);
              setIsProcessing(false);
            }
          }
        );
      }
    } catch (error) {
      console.error("Custom transaction execution error:", error);
      showWarningMessage("Custom transaction execution error: " + (error.message || String(error)));
      setIsProcessing(false);
    }
  };

  // Create custom transaction B - enable auto distribution feature
  const executeCustomTxB = async () => {
    try {
      setIsProcessing(true);
      
      const customTransaction = {
        kind: "moveCall",
        data: {
          packageObjectId: "0x123...", // Replace with actual contract package ID
          module: "smartwill",
          function: "add_different_feature", 
          typeArguments: [],
          arguments: [
            vaultID,
            ownerCap,
          ]
        }
      };
      
      const result = await signAndExecuteTransaction(
        {
          transaction: customTransaction,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("executed custom transaction B", result);
            setTimeout(() => {
              setShowAdditionalTx(false);
              setShowDashboardIndicator(true);
              setIsProcessing(false);
            }, 100);
          },
          onError: (error) => {
            console.error("Custom transaction B error:", error);
            showWarningMessage("Custom transaction B failed: " + error.message);
            setIsProcessing(false);
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error("Custom transaction B execution error:", error);
      showWarningMessage("Custom transaction B execution error: " + error.message);
      setIsProcessing(false);
    }
  };

  // Mint Capabilities (Mint Caps) function
  const mintCaps = async () => {
    try {
      setIsProcessing(true);
      
      // Correctly classify heirs and prepare VecMap data format
      const { suiAddressHeirs, emailHeirs } = separateHeirsByAddressType(heirs);
      
      // Prepare VecMap for Sui address heirs (as suggested format)
      const suiVecMap = {
        keys: suiAddressHeirs.map(heir => heir.address),
        values: suiAddressHeirs.map(heir => parseInt(heir.ratio))
      };
      
      // Prepare VecMap for email heirs (as suggested format)
      const emailVecMap = {
        keys: emailHeirs.map(heir => heir.address),
        values: emailHeirs.map(heir => parseInt(heir.ratio))
      };
      
      // Output formatted VecMap data for debugging
      console.log("VecMap data used for minting caps:");
      console.log("Sui address VecMap:", suiVecMap);
      console.log("Email address VecMap:", emailVecMap);
      
      // Use SUI SDK's Transaction Builder format
      const tx = await mintCap(ownerCap, vaultID, suiVecMap, emailVecMap);
      const result = await signAndExecuteTransaction(
        {
          transaction: tx,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("Successfully minted capabilities and initialized members", result);
            showWarningMessage("Successfully minted heir capabilities!");
            setIsProcessing(false);
          },
          onError: (error) => {
            console.error("Minting capabilities error:", error);
            showWarningMessage("Minting heir capabilities failed: " + error.message);
            setIsProcessing(false);
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error("Minting capabilities processing error:", error);
      showWarningMessage("Minting heir capabilities error: " + error.message);
      setIsProcessing(false);
    }
  };

  // Check address type
  const getAddressType = (address) => {
    if (address && address.startsWith("0x") && !address.includes("@")) {
      return "sui";
    } else if (address && address.includes("@")) {
      return "email";
    }
    return "";
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 overflow-hidden relative">
      {/* Connect card - not connected state */}
      <div
        className={`bg-primary p-8 rounded-lg shadow-none hover:shadow-lg transition-all duration-500 ease-in-out transform absolute
                    ${
                      isConnecting
                        ? "opacity-0 -translate-y-20 pointer-events-none"
                        : "opacity-100 translate-y-0"
                    }`}
      >
        <h1 className="text-4xl text-black font-bold mb-8">
          Establish your SmartWill.
        </h1>
        <p className="text-xl text-gray-700 mb-4">First, let us</p>
        <div onClick={handleConnect}>
          <ConnectButton />
        </div>
      </div>

      {/* Welcome card - connected state */}
      <div
        className={`bg-primary p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out transform absolute
                    ${
                      account && showWelcome
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-20 pointer-events-none"
                    }`}
      >
        <h1 className="text-4xl text-black font-bold mb-8">
          Welcome, {formatAddress(account?.address)}
        </h1>
        <p className="text-xl text-gray-700 mb-4">Let's get started.</p>
      </div>

      {/* Third card - set heirs */}
      {showNextCard && (
  <HeirCard
    heirs={heirs}
    addHeir={addHeir}
    removeHeir={removeHeir}
    updateHeir={updateHeir}
    getTotalRatio={getTotalRatio}
    handleVerify={executeTransaction}
    isProcessing={isProcessing}
  />
)}

      {/* Additional transaction card */}
      <div
        className={`bg-primary p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out transform absolute w-full max-w-3xl
                    ${
                      showAdditionalTx
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-20 pointer-events-none"
                    }`}
      >
        <h2 className="text-2xl font-bold mb-4">Send Capabilities to heirs.</h2>
        <p className="mb-6 text-gray-700">
          Your Will has been established. Now to notify and send Capability to the heirs.
        </p>
        
        {/* Transaction ID info */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg flex flex-row justify-between items-center">
          <div>
            <p className="text-gray-700"><strong>Vault ID:</strong> {vaultID ? formatAddress(vaultID) : "Not available"}</p>
            <p className="text-gray-700"><strong>Owner Cap:</strong> {ownerCap ? formatAddress(ownerCap) : "Not available"}</p>
          </div>
          <button 
            onClick={mintCaps}
            className={`p-2 bg-green-500 text-white rounded hover:bg-green-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                Processing...
              </>
            ) : (
              "Mint Caps"
            )}
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
          {/* Left button */}
          <div className="w-full md:w-1/2">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 h-full">
              <h3 className="font-bold text-lg mb-2 text-blue-800">Send Caps with Email</h3>
              <p className="text-gray-700 mb-4">
                Securely send heir capabilities to the corresponding email addresses via encrypted email.
              </p>
              <button
                onClick={executeCustomTxA}
                className={`w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Processing...
                  </>
                ) : (
                  "Send Via zksend"
                )}
              </button>
            </div>
          </div>
          
          {/* Right button */}
          <div className="w-full md:w-1/2">
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50 h-full">
              <h3 className="font-bold text-lg mb-2 text-purple-800">Enable Auto Distribution</h3>
              <p className="text-gray-700 mb-4">
                Enable automatic asset distribution for your smart will.
                This will allow your assets to be distributed automatically according to predefined rules.
              </p>
              <button
                onClick={executeCustomTxB}
                className={`w-full p-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    Processing...
                  </>
                ) : (
                  "Enable Auto Distribution"
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Next page indicator - shown after successful verification */}
      <div
        className={`bg-primary p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out transform absolute
                    ${
                      showDashboardIndicator
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-20 pointer-events-none"
                    }`}
      >
        <h1 className="text-4xl text-black font-bold mb-8">
          Your Will has been established.
        </h1>
        <p className="text-xl text-gray-700 mb-4">Launching Dashboard.</p>
        {/* Progress indicator */}
        <div className="flex justify-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>
      {/* Warning/message dialog - updated to neutral style */}
{showWarning && (
  <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
    <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
      <h3 className="text-xl font-bold text-gray-800 mb-4">Message</h3>
      <p className="text-gray-700 mb-6">{warningMessage}</p>
      <div className="flex justify-end">
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
          onClick={closeWarning}
        >
          OK
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}
