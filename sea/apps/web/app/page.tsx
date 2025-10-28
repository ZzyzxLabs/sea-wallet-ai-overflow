"use client";

import { MemberListTile } from "@/components/memberListTile";
import { VaultTile } from "@/components/vaultTile";
import { FileSystemTile } from "@/components/fileTile";
import { VaultFallback } from "@/components/VaultFallback";
import { FileItem } from "@/components/fileTile";
import { ConnectButton, useCurrentAccount, useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import { package_addr } from "@/utils/package";
import { getVaultField, getVaultAndOwnerCap } from "@/utils/queryer";
import { parseCapPercentage } from "../../web/utils/parseCapPercentage";

const filesSeed: FileItem[] = [
  { id: 1, name: "kyc.csv", size: "12.4 KB", tag: "Sensitive" },
  { id: 2, name: "treasury-policy.pdf", size: "248 KB", tag: "Policy" },
  { id: 3, name: "quarterly-report.xlsx", size: "1.2 MB", tag: "Report" },
  { id: 4, name: "logo.svg", size: "8.2 KB", tag: "Asset" },
];

export default function Page() {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageName = package_addr;

  const [vaultExist, setVaultExist] = useState(false);
  const [capPercent, setCapPercent] = useState<Map<number | string, number> | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 只要有錢包就抓 cap_percentage，並存入 state
  useEffect(() => {
    if (!currentAccount?.address) {
      setCapPercent(null);
      return;
    }
    let active = true;

    (async () => {
      try {
        const { vaultID } = await getVaultAndOwnerCap({
          suiClient,
          accountAddress: currentAccount.address,
          packageName,
        });
        if (!vaultID) {
          if (active) setCapPercent(null);
          return;
        }
        const data = await getVaultField({ suiClient, vaultID });
        const capRaw = (data?.content as any)?.fields?.cap_percentage;
        const parsed = parseCapPercentage(capRaw); // Map<number, number>
        if (active) setCapPercent(parsed);
        console.log("Parsed cap percentage:", parsed);
      } catch (e) {
        console.error(e);
        if (active) setCapPercent(null);
      }
    })();

    return () => { active = false; };
  }, [currentAccount?.address, packageName, suiClient]);

  // ...（底下維持你的 vault 存在檢查邏輯不變）
  const { data: ownedObjects, isPending, refetch } = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: currentAccount?.address || "",
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!currentAccount?.address,
      refetchOnWindowFocus: false,
      refetchInterval: false,
    }
  );

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!currentAccount?.address) {
      setVaultExist(false);
      return;
    }
    const checkVaultExistence = () => {
      if (isPending) return;
      if (ownedObjects?.data) {
        const ownerCapObjects = ownedObjects.data.filter((obj) =>
          obj.data?.type?.includes(packageName + "::sea_vault::OwnerCap")
        );
        if (ownerCapObjects.length > 0) {
          const vaultID = (ownerCapObjects[0]?.data?.content as any)?.fields?.vaultID || null;
          const ownerCapId = ownerCapObjects[0]?.data?.objectId || null;
          if (vaultID && ownerCapId) {
            setVaultExist(true);
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            return;
          }
        }
        setVaultExist(false);
      } else {
        setVaultExist(false);
      }
    };
    checkVaultExistence();
    if (!vaultExist) {
      intervalRef.current = setInterval(() => {
        refetch();
        setTimeout(checkVaultExistence, 100);
      }, 1000);
    }
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentAccount?.address, ownedObjects, isPending, packageName, vaultExist, refetch]);

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
                <a href="/memberWithdraw" className="px-3 py-2 rounded-lg hover:bg-white/10 transition">Member Withdraw</a>
              <ConnectButton />
            </nav>
          </div>
          <div />
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-6 order-2 lg:order-1">
          {/* 若還沒抓到資料就給空 Map，元件會顯示 "—" */}
          <MemberListTile capPercent={capPercent ?? new Map()} />
          <FileSystemTile files={filesSeed} onUpload={() => {}} />
        </div>
        <div className="lg:col-span-2 order-1 lg:order-2">
          <VaultTile />
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 pb-10 text-xs text-slate-400">      </footer>
    </div>
  );
}
