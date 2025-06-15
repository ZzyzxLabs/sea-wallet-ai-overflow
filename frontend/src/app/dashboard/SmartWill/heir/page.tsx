"use client";
import "@mysten/dapp-kit/dist/index.css";
import {
  ConnectButton,
  useAutoConnectWallet,
  useSuiClientQuery,
} from "@mysten/dapp-kit";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import useHeirStore from "@/store/heirStore";
import { useRouter } from "next/navigation";
import { AllWilllist } from "@/component/willComponent/willmain";
import HeirBox from "./_components/HeirBox";
import useMoveStore from "@/store/moveStore";
import { SuiObjectResponse } from "@mysten/sui/client";

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

  
  console.log("heirs",heirs)
  return (
    <div className="flex-1 px-8 py-8 bg-white">
      <h1 className="text-4xl font-bold mb-8 text-blue-800">Your Heir Accounts</h1>
      
      {heirs.length === 0 ? (
        <div className="text-gray-600 p-6 border-2 rounded-lg text-xl font-medium bg-gray-50">
          No heir accounts found. You are not an heir of any vaults.
        </div>
      ) : (
        <div className="flex flex-col space-y-4 w-full">
          {heirs.map((heir, index) => (
            <HeirBox key={index} heir={heir} index={index}/>
          ))}
        </div>
      )}
    </div>
  );
}
