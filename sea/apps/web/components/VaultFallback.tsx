"use client";

import { ConnectButton, useCurrentAccount } from "@mysten/dapp-kit";
import { useState } from "react";
import HeirCard from "./HeirCard";

interface Heir {
  id: string;
  name: string;
  ratio: string;
  address: string;
}

export function VaultFallback() {
  const currentAccount = useCurrentAccount();
  const [heirs, setHeirs] = useState<Heir[]>([
    { id: "1", name: "", ratio: "", address: "" }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

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
        const isSuiAddress = heir.address.startsWith("0x") && heir.address.length >= 42;
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
      // Mock API call - simulate vault creation
      console.log("Creating vault with heirs:", heirs);
      console.log("Connected wallet:", currentAccount?.address);
      
      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock success response
      const mockVaultData = {
        vaultId: `vault_${Date.now()}`,
        owner: currentAccount?.address,
        heirs: heirs.map(heir => ({
          ...heir,
          ratio: parseFloat(heir.ratio)
        })),
        createdAt: new Date().toISOString(),
        status: "active"
      };
      
      console.log("Vault created successfully:", mockVaultData);
      
      // Show success message
      alert(`🎉 Vault created successfully!\n\nVault ID: ${mockVaultData.vaultId}\nHeirs configured: ${heirs.length}\nTotal allocation: ${getTotalRatio()}%`);
      
      // In a real app, you would redirect to the vault dashboard
      // For now, we'll just reset the form
      setHeirs([{ id: "1", name: "", ratio: "", address: "" }]);
      
    } catch (error) {
      console.error("Error creating vault:", error);
      alert("Failed to create vault. Please try again.");
    } finally {
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
