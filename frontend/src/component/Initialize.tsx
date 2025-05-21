// frontend/src/component/InitializeContract.tsx
"use client";
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton, useSuiClient } from "@mysten/dapp-kit";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import useHeirStore from "../store/heirStore"; 
import { useRouter } from "next/navigation";
import useMoveStore from "../store/moveStore";
import { bcs, BcsType } from '@mysten/bcs';
import HeirCard from "./HeirCard";
import Image from "next/image";
import "../styles/InitializeContract.css"; // Import CSS styles

// VecMap function for serializing key-value pairs (remains unchanged)
function VecMap<K extends BcsType<any>, V extends BcsType<any>>(K: K, V: V) {
  return bcs.struct(
    `VecMap<${K.name}, ${V.name}>`,
    {
      keys: bcs.vector(K),
      values: bcs.vector(V),
    }
  );
}

// Other helper functions remain unchanged
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

function prepareHeirsForVecMap(heirs, keyField, valueField) {
  return {
    keys: heirs.map(heir => heir[keyField]),
    values: heirs.map(heir => heir[valueField])
  };
}

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
  
  // Create raw data version for debugging (not serialized)
  const rawData = {
    suiNameRatio: suiNameRatioMap,
    suiAddressRatio: suiAddressRatioMap,
    emailNameRatio: emailNameRatioMap,
    emailAddressRatio: emailAddressRatioMap
  };
  
  // Serialize data
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

export default function InitializeContract() {
  const account = useCurrentAccount();
  const router = useRouter();
  const client = useSuiClient();
  const setAddress = useMoveStore((s) => s.setAddress);
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
  
  // Store previous heirs count and animation state refs
  const prevHeirsCountRef = useRef(0);
  const animationInProgressRef = useRef(false);
  const cardRef = useRef(null);
  
  // State management
  const [vaultID, setVaultID] = useState("");
  const [ownerCap, setOwnerCap] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [wavesPosition, setWavesPosition] = useState(0);

  // Get states and methods from Zustand store
  const {
    isConnecting,
    showWelcome,
    showNextCard,
    showWarning,
    warningMessage,
    heirs,
    setIsConnecting,
    setShowWelcome,
    setShowNextCard,
    closeWarning,
    addHeir,
    removeHeir,
    updateHeir,
    getTotalRatio,
    handleVerify,
    showWarningMessage,
  } = useHeirStore();
  
  const { createVaultTx } = useMoveStore();
  
  // Handle connect button click
  const handleConnect = () => {
    setIsConnecting(true);
  };
  
  // Automatically check account connection status
  useEffect(() => {
    if (account && account.address && !isConnecting) {
      console.log("Account already connected:", account.address);
      setTimeout(() => {
        setIsConnecting(true);
      }, 100);
    }
  }, [account, isConnecting, setIsConnecting]);

  useEffect(() => {
    if (account) {
      setAddress(account.address); 
    }
  }, [account, setAddress]);

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

  // Wave background animation
  useEffect(() => {
    const waveAnimation = setInterval(() => {
      setWavesPosition(prev => (prev + 1) % 100);
    }, 50);
    
    return () => clearInterval(waveAnimation);
  }, []);

  // Monitor changes in heirs count, control card animation
  useEffect(() => {
    if (heirs.length !== prevHeirsCountRef.current && !animationInProgressRef.current) {
      animationInProgressRef.current = true;
      
      requestAnimationFrame(() => {
        if (heirs.length > prevHeirsCountRef.current) {
          if (cardRef.current) {
            // Card expansion animation
            cardRef.current.style.transition = 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight + 80}px`;
            
            // Find newly added heir fields
            const newHeirElements = document.querySelectorAll('[data-heir-id]');
            const newHeirElement = newHeirElements[newHeirElements.length - 1] as HTMLElement;
            
            if (newHeirElement) {
              // Set initial animation state
              newHeirElement.style.opacity = '0';
              newHeirElement.style.transform = 'translateY(15px)';
              
              // Force browser repaint
              void newHeirElement.offsetWidth;
              
              // Start element animation
              setTimeout(() => {
                newHeirElement.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                newHeirElement.style.opacity = '1';
                newHeirElement.style.transform = 'translateY(0)';
              }, 50);
            }
            
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 500);
          }
        } else {
          // Shrink animation when removing heirs
          if (cardRef.current) {
            cardRef.current.style.transition = 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight}px`;
            
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 500);
          } else {
            animationInProgressRef.current = false;
          }
        }
        
        // Update heirs count
        prevHeirsCountRef.current = heirs.length;
      });
    }
  }, [heirs.length]);

  // Handle adding heir
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
                  obj.objectType.includes("::seaVault::SeaVault")
              );
              const ownerCapObject = result.objectChanges.find(
                (obj) =>
                  obj.type === "created" &&
                  obj.objectType.includes("::seaVault::OwnerCap")
              );

              if (vaultObject && ownerCapObject) {
                // Type assertion to access the objectId property
                const vaultIDFromTx = (vaultObject as any).objectId;
                const ownerCapFromTx = (ownerCapObject as any).objectId;

                console.log("Vault ID:", vaultIDFromTx);
                console.log("Owner Cap:", ownerCapFromTx);

                // Save values for later use
                setVaultID(vaultIDFromTx);
                setOwnerCap(ownerCapFromTx);
                
                // Store vaultID and ownerCap in localStorage for use on other pages
                localStorage.setItem('vaultID', vaultIDFromTx);
                localStorage.setItem('ownerCap', ownerCapFromTx);
                
                // Display success message and animation
                showSuccessMessage();
                
                // Redirect to dashboard page after delay
                setTimeout(() => {
                  router.push(`/dashboard/settings`);
                }, 2000);
              } else {
                console.error("Failed to retrieve Vault ID or Owner Cap from the result.");
                showWarningMessage("Unable to retrieve vault information from transaction result.");
              }
              
              setIsProcessing(false);
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

  // Display success message
  const showSuccessMessage = () => {
    showWarningMessage("Vault created successfully! Navigating to dashboard...");
  };

  const CustomConnectButton = () => (
    <div className="connect-button">
      <ConnectButton />
    </div>
  );

  return (
    <div className="container">
      {/* Ocean background elements */}
      <div className="ocean-background">
        <div className="bubble bubble1"></div>
        <div className="bubble bubble2"></div>
        <div className="bubble bubble3"></div>
        <div className="waves">
          <div className="wave1"></div>
          <div className="wave2"></div>
        </div>
      </div>

      {/* Main title */}
      <div className="header">
        <h1 className="title">
          <Image src="/RMBGlogo.png" width={36} height={36} alt="Anchor" className="title-logo" />
          <span className="title-text">SeaVault</span>
        </h1>
        <p className="subtitle">Protect your digital assets, guard your journey</p>
      </div>

      {/* Connect card */}
      <div className={`connect-card ${isConnecting ? 'hidden' : ''}`}>
        <div className="icon">
          <Image src="/RMBGlogo.png" width={24} height={24} alt="Wallet" />
        </div>
        <h1>Establish Your Digital Legacy</h1>
        <p>Connect your wallet to start planning your digital asset inheritance</p>
        <div className="connect-button" onClick={handleConnect}>
          <CustomConnectButton />
        </div>
      </div>

      {/* Welcome card */}
      <div className={`welcome-card ${account && showWelcome ? '' : 'hidden'}`}>
        <div className="icon">
          <Image src="/RMBGlogo.png" width={24} height={24} alt="Welcome" />
        </div>
        <h1>Welcome, {formatAddress(account?.address)}</h1>
        <div className="status">
          <div>Wallet Connected</div>
        </div>
        <p>Ready to begin your digital legacy planning journey</p>
        <div className="progress">
          <div className="progress-bar">
            <div className="fill">
              <div className="pulse"></div>
            </div>
          </div>
        </div>
        <div className="progress-text">Loading data...</div>
      </div>

      {/* Set heirs card */}
      {showNextCard && (
        <div className="heir-card">
          <div className="container">
            <div className="icon">
              <Image src="/RMBGlogo.png" width={24} height={24} alt="Heirs" />
            </div>
            <HeirCard
              heirs={heirs}
              addHeir={addHeir}
              removeHeir={removeHeir}
              updateHeir={updateHeir}
              getTotalRatio={getTotalRatio}
              handleVerify={executeTransaction}
              isProcessing={isProcessing}
            />
          </div>
        </div>
      )}

      {/* Warning dialog */}
      {showWarning && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          System Warning
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">{warningMessage}</p>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-700 flex justify-end">
              <button 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={closeWarning}
              >
          Confire
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="footer">
        <p>© 2025 SeaVault. Protecting your digital seas. Sail with trust.</p>
      </div>
    </div>
  );
}