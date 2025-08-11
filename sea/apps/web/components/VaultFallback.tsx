"use client";

import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useState, useRef } from "react";
import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import HeirCard from "./HeirCard";
import { initVaultTX } from "@/utils/compoundTX/initVault";
import { sendEmail } from "@/utils/mailService/sendMail";

interface Heir {
  id: string;
  name: string;
  ratio: string;
  address: string;
}

interface SeparatedHeirs {
  suiAddressHeirs: Heir[];
  emailHeirs: Heir[];
}

interface VecMapData {
  keys: string[];
  values: string[];
}

// VecMap function for serializing key-value pairs
function VecMap<K, V>(K: any, V: any) {
  return bcs.struct(`VecMap<${K.name}, ${V.name}>`, {
    keys: bcs.vector(K),
    values: bcs.vector(V),
  });
}

// Helper functions from Initialize.tsx
function separateHeirsByAddressType(heirs: Heir[]): SeparatedHeirs {
  const suiAddressHeirs: Heir[] = [];
  const emailHeirs: Heir[] = [];

  heirs.forEach((heir) => {
    if (
      heir.address &&
      heir.address.startsWith("0x") &&
      !heir.address.includes("@")
    ) {
      suiAddressHeirs.push({ ...heir });
    } else {
      emailHeirs.push({ ...heir });
    }
  });

  return {
    suiAddressHeirs,
    emailHeirs,
  };
}

function prepareHeirsForVecMap(heirs: Heir[], keyField: keyof Heir, valueField: keyof Heir): VecMapData {
  return {
    keys: heirs.map((heir) => heir[keyField] as string),
    values: heirs.map((heir) => heir[valueField] as string),
  };
}

function serializeHeirsToVecMaps(heirs: Heir[]) {
  // Separate heirs
  const { suiAddressHeirs, emailHeirs } = separateHeirsByAddressType(heirs);

  // Prepare VecMap data for Sui address heirs
  const suiNameRatioMap = {
    keys: suiAddressHeirs.map((heir) => heir.name),
    values: suiAddressHeirs.map((heir) => heir.ratio),
  };

  const suiAddressRatioMap = {
    keys: suiAddressHeirs.map((heir) => heir.address),
    values: suiAddressHeirs.map((heir) => heir.ratio),
  };

  // Prepare VecMap data for email heirs
  const emailNameRatioMap = {
    keys: emailHeirs.map((heir) => heir.name),
    values: emailHeirs.map((heir) => heir.ratio),
  };

  const emailAddressRatioMap = {
    keys: emailHeirs.map((heir) => heir.address),
    values: emailHeirs.map((heir) => heir.ratio),
  };

  // Create raw data version for debugging (not serialized)
  const rawData = {
    suiNameRatio: suiNameRatioMap,
    suiAddressRatio: suiAddressRatioMap,
    emailNameRatio: emailNameRatioMap,
    emailAddressRatio: emailAddressRatioMap,
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
      .toBytes(),
  };

  return {
    raw: rawData,
    serialized: serializedData,
  };
}

export function VaultFallback() {
  const currentAccount = useCurrentAccount();
  const client = useSuiClient();
  
  // Package name for the smart contract
  const packageName = "0x996fa349767a48a9d211a3deb9ae4055a03e443a85118df9ca312cd29591b30f";
  
  // Transaction hook
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
  
  const [heirs, setHeirs] = useState<Heir[]>([
    { id: "1", name: "", ratio: "", address: "" }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [vaultID, setVaultID] = useState("");
  const [ownerCap, setOwnerCap] = useState("");

  // Create vault transaction
  const createVaultTx = () => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${packageName}::seaVault::create_vault`,
      arguments: [],
    });
    return vaultTx;
  };

  // Format address display
  const formatAddress = (address: string | undefined): string => {
    if (!address) return " ";
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  // Heir management functions
  const addHeir = () => {
    const newId = (heirs.length + 1).toString();
    setHeirs([...heirs, { id: newId, name: "", ratio: "", address: "" }]);
  };

  const removeHeir = (id: string) => {
    if (heirs.length > 1) {
      setHeirs(heirs.filter(heir => heir.id !== id));
    }
  };

  const updateHeir = (id: string, field: keyof Heir, value: string) => {
    setHeirs(heirs.map(heir => 
      heir.id === id ? { ...heir, [field]: value } : heir
    ));
  };

  const getTotalRatio = (): number => {
    return heirs.reduce((total, heir) => {
      const ratio = parseFloat(heir.ratio) || 0;
      return total + ratio;
    }, 0);
  };

  const validateHeirs = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];
    
    // Check if all heirs have required fields
    heirs.forEach((heir, index) => {
      if (!heir.name.trim()) {
        errors.push(`Heir ${index + 1}: Name is required`);
      }
      if (!heir.ratio.trim()) {
        errors.push(`Heir ${index + 1}: Share percentage is required`);
      } else {
        const ratio = parseFloat(heir.ratio);
        if (isNaN(ratio) || ratio <= 0 || ratio > 100) {
          errors.push(`Heir ${index + 1}: Share percentage must be between 0 and 100`);
        }
      }
      if (!heir.address.trim()) {
        errors.push(`Heir ${index + 1}: Address/Email is required`);
      } else {
        // Basic validation for address/email
        const isEmail = heir.address.includes("@");
        const isSuiAddress = heir.address.startsWith("0x");
        if (!isEmail && !isSuiAddress) {
          errors.push(`Heir ${index + 1}: Please enter a valid email or Sui address`);
        }
      }
    });

    // Check total ratio
    const totalRatio = getTotalRatio();
    if (totalRatio !== 100) {
      errors.push(`Total share must equal 100% (currently ${totalRatio}%)`);
    }

    return { isValid: errors.length === 0, errors };
  };

  const handleVerify = async () => {
    const validation = validateHeirs();
    
    if (!validation.isValid) {
      alert(`Please fix the following issues:\n\n${validation.errors.join('\n')}`);
      return;
    }

    setIsProcessing(true);
    
    try {
      // Output data to console for debugging
      const { raw } = serializeHeirsToVecMaps(heirs);
      console.log("=== VecMap data at transaction execution ===");
      console.log("Sui heirs:");
      console.table(raw.suiNameRatio);
      console.table(raw.suiAddressRatio);
      console.log("Email heirs:");
      console.table(raw.emailNameRatio);
      console.table(raw.emailAddressRatio);

      // Convert key-value pairs to proper Maps
      const suiAddressMap = new Map<string, number>();
      const emailAddressMap = new Map<string, number>();
      
      raw.suiAddressRatio.keys.forEach((key, index) => {
        suiAddressMap.set(key, parseFloat(raw.suiAddressRatio.values[index]));
      });
      
      raw.emailAddressRatio.keys.forEach((key, index) => {
        emailAddressMap.set(key, parseFloat(raw.emailAddressRatio.values[index]));
      });
      console.log("Sui Address Map:", suiAddressMap);
      console.log("Email Address Map:", emailAddressMap);
      // Execute transaction
      const { tx, invitations } = await initVaultTX(
        suiAddressMap,
        emailAddressMap,
        currentAccount?.address as string
      );
      const transactionResult = signAndExecuteTransaction(
        {
          transaction: tx,
          chain: "sui:testnet",
        },
        {
        onSuccess: async (result: any) => {
          console.log("executed transaction", result);

          const vaultObject = result.objectChanges.find(
            (obj: any) =>
              obj.type === "created" &&
              obj.objectType.includes("::seaVault::SeaVault")
          );
          const ownerCapObject = result.objectChanges.find(
            (obj: any) =>
              obj.type === "created" &&
              obj.objectType.includes("::seaVault::OwnerCap")
          );

          if (vaultObject && ownerCapObject) {
            const vaultIDFromTx = (vaultObject as any).objectId;
            const ownerCapFromTx = (ownerCapObject as any).objectId;

            console.log("Vault ID:", vaultIDFromTx);
            console.log("Owner Cap:", ownerCapFromTx);

            setVaultID(vaultIDFromTx);
            setOwnerCap(ownerCapFromTx);
            localStorage.setItem("vaultID", vaultIDFromTx);
            localStorage.setItem("ownerCap", ownerCapFromTx);

            alert(
              `🎉 Vault created successfully!\n\nVault ID: ${formatAddress(
                vaultIDFromTx
              )}\nOwner Cap: ${formatAddress(
                ownerCapFromTx
              )}\nHeirs configured: ${heirs.length}\nTotal allocation: ${getTotalRatio()}%`
            );

            setHeirs([{ id: "1", name: "", ratio: "", address: "" }]);
          } else {
            console.error("Failed to retrieve Vault ID or Owner Cap from the result.");
            alert("Unable to retrieve vault information from transaction result.");
          }

          // === Send emails AFTER on-chain success ===
          try {
            await Promise.allSettled(
              invitations.map(({ email, link }) => sendEmail(email, link))
            );
          } catch (e) {
            // Promise.allSettled 不會丟錯，這裡保險 log 一下
            console.error("sendEmail unexpected error:", e);
          }

          setIsProcessing(false);
        },
        onError: (error: any) => {
          console.error("Transaction error:", error);
          alert("Transaction failed: " + error.message);
          setIsProcessing(false);
        },
      }
    );

      return transactionResult;
    } catch (error: any) {
      console.error("Transaction execution error:", error);
      alert("Transaction execution error: " + error.message);
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(40rem_40rem_at_110%_10%,rgba(147,51,234,0.18),transparent)] bg-slate-950">
      <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="font-bold tracking-tight">Vault Console</div>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <ConnectButton />
            </nav>
          </div>
          <div />
        </div>
      </header>

      <main className="max-w-screen mx-auto px-6 py-16">
        <div className="mx-auto text-center space-y-8">
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">
              {!currentAccount?.address ? "Connect Your Wallet" : "Create Your Vault"}
            </h1>
            <p className="text-xl text-slate-400">
              {!currentAccount?.address 
                ? "Please connect your wallet to access the Vault Console"
                : "You don't have a vault yet. Create one to get started"
              }
            </p>
          </div>

          {!currentAccount?.address ? (
            <div className="flex justify-center">
              <ConnectButton />
            </div>
          ) : (
            <div className="space-y-6">
              <HeirCard
                heirs={heirs}
                addHeir={addHeir}
                removeHeir={removeHeir}
                updateHeir={updateHeir}
                getTotalRatio={getTotalRatio}
                handleVerify={handleVerify}
                isProcessing={isProcessing}
              />
              
              <div className="text-sm text-slate-500 text-center">
                Already have a vault? Make sure you're connected with the correct wallet address.
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 pb-10 text-xs text-slate-400 text-center">
        Sea Vault Console - Secure Digital Asset Management
      </footer>
    </div>
  );
}
