"use client";

import React, { useCallback, useMemo, useState, useEffect } from "react";
import { 
  ConnectButton, 
  useCurrentAccount, 
  useSuiClientQuery 
} from "@mysten/dapp-kit";
import { Gift, Wallet, RefreshCw } from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Tile } from "../../components/tile";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { package_addr } from "@/utils/package";
import HeirBox from "./components/HeirBox";

// Define types to match what HeirBox expects
type HeirData = {
  data: {
    objectId: string;
    content: {
      fields: {
        capID: string;
        vaultID: string;
        withdrawn_count: number;
      };
    };
  };
};



export default function MemberWithdraw() {
  const account = useCurrentAccount();
  const [heirs, setHeirs] = useState<HeirData[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const packageName = package_addr;

  // Query wallet objects to find heir capabilities
  const walletObjects = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address || "",
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!account?.address,
      staleTime: 30000,
    }
  );

  useEffect(() => {
    if (walletObjects.data?.data) {
      console.log("walletObjects", walletObjects.data);
      
      // Filter objects to find MemberCap objects
      const filteredHeirs = walletObjects.data.data
        .filter(item => 
          item.data?.type?.includes("MemberCap") && 
          item.data?.type?.includes(packageName) &&
          item.data?.content &&
          'fields' in item.data.content
        )
        .map(item => ({
          data: {
            objectId: item.data!.objectId,
            content: item.data!.content as unknown as {
              fields: {
                capID: string;
                vaultID: string;
                withdrawn_count: number;
              };
            }
          }
        })) as HeirData[];
      
      setHeirs(filteredHeirs);
    }
  }, [packageName, walletObjects.data]);

  const availableHeirsCount = useMemo(
    () => heirs.length,
    [heirs]
  );

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      // Refetch wallet objects to get latest heir data
      walletObjects.refetch();
      await new Promise((res) => setTimeout(res, 600));
    } finally {
      setIsRefreshing(false);
    }
  }, [walletObjects]);

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(40rem_40rem_at_110%_10%,rgba(147,51,234,0.18),transparent)] bg-slate-950">
      <Navigation />

      <main className="max-w-7xl mx-auto px-6 py-12">
        <div className="mx-auto space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight">Member Withdraw</h1>
            <p className="text-slate-400">
              {account?.address
                ? "Manage your inheritance claims from connected vaults."
                : "Please connect your wallet to view your heir accounts."}
            </p>
          </div>

          <Tile
            title="Your Heir Accounts"
            description={
              account?.address
                ? `You are an heir to ${availableHeirsCount} vault(s)`
                : "Connect wallet to load heir accounts"
            }
            minHeight="min-h-[18rem]"
            headerExtra={
              <div className="flex items-center gap-2">
                {account?.address && (
                  <Badge variant="secondary" className="text-xs">
                    {heirs.length} accounts
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
            ) : heirs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Gift className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No heir accounts found.</p>
                <p className="text-xs text-slate-500 mt-1">You are not an heir of any vaults.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {heirs.map((heir, index) => (
                  <HeirBox key={heir.data.objectId} heir={heir} index={index} />
                ))}
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
                    <h4 className="font-medium mb-1">Heirs:</h4>
                    <pre className="bg-muted p-2 rounded text-xs overflow-auto max-h-40">
                      {JSON.stringify(heirs, null, 2)}
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
