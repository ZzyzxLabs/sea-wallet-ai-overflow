"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { ConnectButton, useCurrentAccount, useSuiClient, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { Transaction } from "@mysten/sui/transactions";
import { Gift, Wallet, RefreshCw, ShieldCheck, Download } from "lucide-react";
import { Tile } from "../../components/tile"; // adjust the import path if needed
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { package_addr } from "@/utils/package";

type ClaimStatus = "claimable" | "claiming" | "claimed" | "failed";

type ClaimableItem = {
  id: string;
  vaultId: string;
  decedent: string;
  method: "email" | "suiAddress";
  recipientHint: string; // masked email or shortened address
  coinType: string;
  symbol: string;
  decimals: number;
  amountRaw: string; // raw balance (smallest unit)
  note?: string;
  status: ClaimStatus;
  txDigest?: string;
};

const HARDCODED_ITEMS: ClaimableItem[] = [
  {
    id: "itm-001",
    vaultId: "0x8a4d2c0f...e1f92a73",
    decedent: "Alice Chen",
    method: "email",
    recipientHint: "a***@mail.com",
    coinType: "0x2::sui::SUI",
    symbol: "SUI",
    decimals: 9,
    amountRaw: "1250000000", // 1.25 SUI
    note: "Primary bequest",
    status: "claimable",
  },
  {
    id: "itm-002",
    vaultId: "0x9f1c30bb...45ae0b11",
    decedent: "Alice Chen",
    method: "suiAddress",
    recipientHint: "0x1234...beef1",
    coinType: "0x0000000000000000000000000000000000000002::test::USDC",
    symbol: "USDC",
    decimals: 6,
    amountRaw: "25000000", // 25 USDC
    note: "Secondary bequest",
    status: "claimable",
  },
  {
    id: "itm-003",
    vaultId: "0x3ac83a24...9a8f1133",
    decedent: "Bob Wu",
    method: "email",
    recipientHint: "z***@inbox.com",
    coinType: "0x2::sui::SUI",
    symbol: "SUI",
    decimals: 9,
    amountRaw: "987654321", // 0.987654321 SUI
    note: "Residual",
    status: "claimable",
  },
];

function formatAmount(raw: string, decimals: number): string {
  const n = BigInt(raw);
  const base = BigInt(10) ** BigInt(decimals);
  const whole = n / base;
  const frac = n % base;
  const fracStr = frac.toString().padStart(decimals, "0").replace(/0+$/, "");
  return fracStr.length > 0 ? `${whole.toString()}.${fracStr}` : whole.toString();
}

function shortenType(fullType: string): string {
  const match = fullType.match(/^0x[a-fA-F0-9]+/);
  if (!match) return fullType;
  const addr = match[0];
  const prefix = addr.slice(0, 7);
  const suffix = addr.slice(-5);
  return fullType.replace(addr, `${prefix}...${suffix}`);
}

export default function MemberWithdraw() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  const [items, setItems] = useState<ClaimableItem[]>(HARDCODED_ITEMS);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const packageName = package_addr;

  const claimableCount = useMemo(
    () => items.filter((i) => i.status === "claimable").length,
    [items]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // In real life: re-fetch claimable list from chain/backend.
      // Here we just simulate a light refresh.
      await new Promise((res) => setTimeout(res, 600));
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const markStatus = useCallback((id: string, next: Partial<ClaimableItem>) => {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...next } : it)));
  }, []);

  const handleClaim = useCallback(
    async (item: ClaimableItem) => {
      if (!account?.address) {
        alert("Please connect your wallet first.");
        return;
      }
      if (item.status !== "claimable") return;

      markStatus(item.id, { status: "claiming", txDigest: undefined });

      try {
        // Build transaction (placeholder). Replace with your real Move call.
        // Example:
        // tx.moveCall({
        //   target: `${packageName}::sea_vault::member_claim`,
        //   arguments: [
        //     tx.object(vaultId),
        //     tx.pure(item.coinType),
        //     tx.pure(item.amountRaw),
        //   ],
        // });

        const tx = new Transaction();
        // Simulate: you can attach a dev-inspection-only moveCall if needed.

        await new Promise((res) => setTimeout(res, 800)); // simulate build

        signAndExecuteTransaction(
          {
            transaction: tx,
            chain: "sui:testnet",
          },
          {
            onSuccess: async (result: any) => {
              const digest =
                result?.digest ||
                result?.effectsDigest ||
                (typeof result === "string" ? result : undefined);

              markStatus(item.id, { status: "claimed", txDigest: digest });
              alert(
                `✅ Claimed ${formatAmount(item.amountRaw, item.decimals)} ${item.symbol}`
              );
            },
            onError: (err: any) => {
              console.error("Claim failed:", err);
              markStatus(item.id, { status: "failed" });
              alert("Claim failed: " + (err?.message || "Unknown error"));
            },
          }
        );
      } catch (e: any) {
        console.error("Claim exception:", e);
        markStatus(item.id, { status: "failed" });
        alert("Claim error: " + (e?.message || "Unknown error"));
      }
    },
    [account?.address, signAndExecuteTransaction, markStatus, packageName]
  );

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

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mx-auto space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Member Withdraw</h1>
            <p className="text-slate-400">
              {account?.address
                ? "Claim your entitled inheritances below."
                : "Please connect your wallet to view claimable items."}
            </p>
          </div>

          <Tile
            title="Claimable Inheritances"
            description={
              account?.address
                ? `You have ${claimableCount} claimable item(s)`
                : "Connect wallet to load"
            }
            minHeight="min-h-[18rem]"
            headerExtra={
              <div className="flex items-center gap-2">
                {account?.address && (
                  <Badge variant="secondary" className="text-xs">
                    {items.length} items
                  </Badge>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="h-8"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? "animate-spin" : ""}`} />
                </Button>
              </div>
            }
          >
            {!account?.address ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Wallet className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No wallet connected.</p>
                <div className="mt-3">
                  <ConnectButton />
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                No claimable items.
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it) => {
                  const displayAmt = formatAmount(it.amountRaw, it.decimals);
                  const typeShort = shortenType(it.coinType);
                  const isProcessing = it.status === "claiming";
                  const isDone = it.status === "claimed";

                  return (
                    <div
                      key={it.id}
                      className="p-4 border rounded-lg bg-card/50 flex items-start justify-between gap-4"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <Gift className="h-4 w-4 text-primary" />
                          <span className="font-medium">{it.symbol}</span>
                          <Badge variant="outline" className="text-xs">
                            {displayAmt}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {it.method === "email" ? "Email" : "Sui Address"}
                          </Badge>
                          {isDone && (
                            <span className="inline-flex items-center text-xs text-emerald-400 gap-1">
                              <ShieldCheck className="h-3 w-3" /> Claimed
                            </span>
                          )}
                          {it.status === "failed" && (
                            <span className="inline-flex items-center text-xs text-red-400 gap-1">
                              Failed
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground font-mono truncate">
                          {typeShort}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          From: <span className="font-semibold">{it.decedent}</span> · Recipient:{" "}
                          <span className="font-mono">{it.recipientHint}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Vault:{" "}
                          <span className="font-mono">
                            {it.vaultId.slice(0, 8)}...{it.vaultId.slice(-8)}
                          </span>
                        </div>
                        {it.note && (
                          <div className="text-xs text-muted-foreground mt-1">Note: {it.note}</div>
                        )}
                        {it.txDigest && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Tx: <span className="font-mono">{it.txDigest}</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleClaim(it)}
                          disabled={isProcessing || isDone}
                          className="h-8 text-xs"
                        >
                          {isProcessing ? "Claiming..." : isDone ? "Claimed" : "Claim"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {process.env.NODE_ENV === "development" && (
              <details className="mt-6">
                <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                  Debug Information
                </summary>
                <div className="mt-2 space-y-2">
                  <div className="text-xs">
                    <h4 className="font-medium mb-1">Account:</h4>
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-32">
                      {JSON.stringify({ address: account?.address }, null, 2)}
                    </pre>
                  </div>
                  <div className="text-xs">
                    <h4 className="font-medium mb-1">Items:</h4>
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(items, null, 2)}
                    </pre>
                  </div>
                </div>
              </details>
            )}
          </Tile>
        </div>
      </main>

      <footer className="max-w-7xl mx-auto px-6 pb-10 text-xs text-slate-400 text-center">
        Sea Vault Console - Secure Digital Asset Management
      </footer>
    </div>
  );
}
