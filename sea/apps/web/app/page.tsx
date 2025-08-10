"use client";

import { MemberListTile } from "@/components/memberListTile";
import { VaultTile } from "@/components/vaultTile";
import { FileSystemTile } from "@/components/fileTile";
import { VaultFallback } from "@/components/VaultFallback";
import { Member } from "@/components/memberListTile";
import { FileItem} from "@/components/fileTile";
import { ConnectButton, useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
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
  
  const packageName = "0x1"; // TODO: Update with actual package ID

  // Query to get owned objects when account is connected
  const { data: ownedObjects, isPending } = useSuiClientQuery(
    'getOwnedObjects',
    { 
      owner: currentAccount?.address || "",
      options: { showType: true, showContent: true }
    },
    {
      enabled: !!currentAccount?.address, // Only run query when wallet is connected
    }
  );

  useEffect(() => {
    // If wallet is not connected, vaultExist = false
    if (!currentAccount?.address) {
      setVaultExist(false);
      return;
    }

    // If query is still pending, don't update state yet
    if (isPending) {
      return;
    }

    // Check if vault exists
    if (ownedObjects?.data) {
      const ownerCapObjects = ownedObjects.data.filter((obj) =>
        obj.data?.type?.includes(packageName + "::seaVault::OwnerCap")
      );
      
      const vaultID = (ownerCapObjects[0]?.data?.content as any)?.fields?.vaultID || null;
      const ownerCapId = ownerCapObjects[0]?.data?.objectId || null;
      
      // If vault did not exist, vaultExist = false, else true
      if (vaultID && ownerCapId) {
        setVaultExist(true);
      } else {
        setVaultExist(false);
      }
    } else {
      setVaultExist(false);
    }
  }, [currentAccount?.address, ownedObjects, isPending, packageName]);

  // Show fallback if wallet not connected or vault doesn't exist
  if (!vaultExist) {
    return <VaultFallback />;
  }

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