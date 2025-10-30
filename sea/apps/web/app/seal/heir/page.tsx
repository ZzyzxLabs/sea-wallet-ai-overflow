"use client";
import "@mysten/dapp-kit/dist/index.css";
import {
  useAutoConnectWallet,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Navigation } from "@/components/Navigation";
import HeirBox from "./_components/HeirBox";
import useMoveStore from "@/utils/moveStore";

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

export default function Dashboard() {
  const account = useCurrentAccount();
  const router = useRouter();
  const packageName = useMoveStore((state) => state.packageName);
  const [heirs, setHeirs] = useState<HeirData[]>([]);
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
    // 僅在客戶端渲染時檢查
    if (typeof window !== "undefined") {

    }
  }, []);  useEffect(() => {
    if (walletObjects.data?.data) {
      console.log("walletObjects",walletObjects.data)
      // current detect all the membercap which generate by whatever contract we deploy 
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

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(40rem_40rem_at_110%_10%,rgba(147,51,234,0.18),transparent)] bg-slate-950">
      <Navigation />
      
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="mb-8 text-center">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Your Heir Accounts
          </h1>
          <p className="text-slate-400 text-lg">
            Manage and monitor your inherited vault memberships
          </p>
        </div>
        
        {heirs.length === 0 ? (
          <div className="text-center p-12 border-2 border-dashed border-white/10 rounded-2xl text-xl font-medium bg-slate-900/30 backdrop-blur-sm shadow-lg">
            <div className="flex flex-col items-center gap-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-24 w-24 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <div>
                <p className="text-slate-300 mb-2">No heir accounts found</p>
                <p className="text-slate-500 text-base">You are not currently an heir of any vaults</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col space-y-6 w-full">
            {heirs.map((heir, index) => (
              <HeirBox key={index} heir={heir} index={index}/>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
