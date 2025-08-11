"use client";

import { MemberListTile } from "@/components/memberListTile";
import { VaultTile } from "@/components/vaultTile";
import { FileSystemTile } from "@/components/fileTile";
import { VaultFallback } from "@/components/VaultFallback";
import { Member } from "@/components/memberListTile";
import { FileItem} from "@/components/fileTile";
import { ConnectButton, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import { package_addr } from "@/utils/package";
const membersSeed: Member[] = [
  { id: 1, name: "Alice", role: "Admin", address: "0x12a4...9fC1" },
  { id: 2, name: "Bob", role: "Member", address: "0x77bc...5A90" },
  { id: 3, name: "Charlie", role: "Auditor", address: "0x3e1d...0BD3" },
  { id: 4, name: "Diana", role: "Member", address: "0x9c0a...33E2" },
];

const filesSeed: FileItem[] = [
  { id: 1, name: "kyc.csv", size: "12.4 KB", tag: "Sensitive" },
  { id: 2, name: "treasury-policy.pdf", size: "248 KB", tag: "Policy" },
  { id: 3, name: "quarterly-report.xlsx", size: "1.2 MB", tag: "Report" },
  { id: 4, name: "logo.svg", size: "8.2 KB", tag: "Asset" },
];

export default function Page() {
  const currentAccount = useCurrentAccount();
  const [vaultExist, setVaultExist] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const packageName = package_addr; // Use package address from utils

  // Add a separate useEffect to monitor vaultExist state changes
  useEffect(() => {
    console.log("🔄 vaultExist state changed:", vaultExist);
  }, [vaultExist]);

  // Query to get owned objects when account is connected
  // Disable automatic refetching as we'll handle it manually
  const { data: ownedObjects, isPending, refetch } = useSuiClientQuery(
    'getOwnedObjects',
    { 
      owner: currentAccount?.address || "",
      options: { showType: true, showContent: true }
    },
    {
      enabled: !!currentAccount?.address, // Only run query when wallet is connected
      refetchOnWindowFocus: false,
      refetchInterval: false,
    }
  );

  useEffect(() => {
    console.log("🔍 Vault check useEffect triggered", {
      hasAccount: !!currentAccount?.address,
      accountAddress: currentAccount?.address,
      isPending,
      vaultExist,
      packageName,
      ownedObjectsCount: ownedObjects?.data?.length || 0
    });

    // Clear any existing interval
    if (intervalRef.current) {
      console.log("🧹 Clearing existing interval");
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // If wallet is not connected, vaultExist = false
    if (!currentAccount?.address) {
      console.log("❌ No wallet connected, setting vaultExist to false");
      setVaultExist(false);
      return;
    }

    // Function to check vault existence
    const checkVaultExistence = () => {
      console.log("🔎 Checking vault existence...", {
        isPending,
        hasOwnedObjects: !!ownedObjects?.data,
        ownedObjectsCount: ownedObjects?.data?.length || 0
      });

      if (isPending) {
        console.log("⏳ Query is pending, skipping check");
        return; // Don't check while query is pending
      }

      // Check if vault exists
      if (ownedObjects?.data) {
        console.log("📦 Processing owned objects:", ownedObjects.data.length);
        
        // Log all OwnerCap objects found (for debugging)
        const allOwnerCaps = ownedObjects.data.filter((obj) =>
          obj.data?.type?.includes("::seaVault::OwnerCap")
        );
        console.log("🔍 All OwnerCap objects found:", allOwnerCaps.map(obj => ({
          type: obj.data?.type,
          objectId: obj.data?.objectId,
          packageAddr: obj.data?.type?.split("::")[0]
        })));
        
        // Log all object types for debugging
        ownedObjects.data.forEach((obj, index) => {
          console.log(`Object ${index}:`, {
            type: obj.data?.type,
            objectId: obj.data?.objectId
          });
        });

        // Filter for OwnerCap objects that match our package address
        const ownerCapObjects = ownedObjects.data.filter((obj) =>
          obj.data?.type?.includes(packageName + "::seaVault::OwnerCap")
        );
        
        console.log("🎯 Found OwnerCap objects:", {
          count: ownerCapObjects.length,
          packageName,
          searchPattern: packageName + "::seaVault::OwnerCap"
        });

        // If we found any OwnerCap objects for our package, vault exists
        if (ownerCapObjects.length > 0) {
          const vaultID = (ownerCapObjects[0]?.data?.content as any)?.fields?.vaultID || null;
          const ownerCapId = ownerCapObjects[0]?.data?.objectId || null;
          
          console.log("✅ OwnerCap found:", {
            vaultID,
            ownerCapId,
            content: ownerCapObjects[0]?.data?.content
          });
          
          // Both vaultID and ownerCapId should exist for a valid vault
          if (vaultID && ownerCapId) {
            console.log("🎉 VAULT EXISTS! Setting vaultExist to true");
            setVaultExist(true);
            // Clear interval once vault is found
            if (intervalRef.current) {
              console.log("🛑 Clearing interval - vault found");
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          } else {
            console.log("❌ OwnerCap found but missing vaultID or ownerCapId");
          }
        } else {
          console.log("❌ No OwnerCap objects found for package:", packageName);
        }
        
        // Vault not found, keep it false
        console.log("❌ Setting vaultExist to false");
        setVaultExist(false);
      } else {
        console.log("❌ No owned objects data available");
        setVaultExist(false);
      }
    };

    // Initial check
    console.log("🚀 Performing initial vault check");
    checkVaultExistence();

    // If vault doesn't exist, start polling every second
    if (!vaultExist) {
      console.log("🔄 Starting 1-second polling for vault detection");
      intervalRef.current = setInterval(() => {
        console.log("⏰ Interval tick - refetching data");
        refetch(); // Refetch data
        setTimeout(() => {
          console.log("🔄 Running scheduled vault check");
          checkVaultExistence();
        }, 100); // Check after a small delay to ensure data is updated
      }, 1000);
    } else {
      console.log("✅ Vault already exists, no polling needed");
    }

    // Cleanup interval on unmount or dependency change
    return () => {
      if (intervalRef.current) {
        console.log("🧹 Cleanup: clearing interval");
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentAccount?.address, ownedObjects, isPending, packageName, vaultExist, refetch]);

  // Log render decisions
  console.log("🎨 Component render decision:", {
    vaultExist,
    hasAccount: !!currentAccount?.address,
    willShowFallback: !vaultExist,
    willShowDashboard: vaultExist
  });

  // Show fallback if wallet not connected or vault doesn't exist
  if (!vaultExist) {
    console.log("🚪 Rendering VaultFallback component");
    return <VaultFallback />;
  }

  console.log("🏠 Rendering main dashboard");
  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(40rem_40rem_at_110%_10%,rgba(147,51,234,0.18),transparent)] bg-slate-950">
        <header className="sticky top-0 z-20 backdrop-blur supports-[backdrop-filter]:bg-slate-900/50 border-b border-white/10">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-8">
              <div className="font-bold tracking-tight">Vault Console</div>
            <nav className="hidden sm:flex items-center gap-1 text-sm">
              <a className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/15 transition">Dashboard</a>
              <a className="px-3 py-2 rounded-lg hover:bg-white/10 transition">Member Withdraw</a>
              <ConnectButton />
            </nav>
          </div>
          <div />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 order-2 lg:order-1">
          <MemberListTile members={membersSeed} />
          <FileSystemTile files={filesSeed} onUpload={() => { /* wire upload here */ }} />
        </div>
        <div className="lg:col-span-2 order-1 lg:order-2">
          <VaultTile />
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 pb-10 text-xs text-slate-400">
        Text-only interface. Icons and wallet button removed.
      </footer>
    </div>
  );
}