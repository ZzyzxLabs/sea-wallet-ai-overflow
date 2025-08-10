"use client";

import { Tile } from "./tile";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useEffect, useState } from "react";
import { getVaultAndOwnerCap, getVaultDynamicFields } from "../hooks/queryHook";
import { SuiObjectResponse, DynamicFieldInfo } from "@mysten/sui/client";

type VaultTileProps = {
  note?: string;
  minHeight?: string;
  className?: string;
};

export function VaultTile({ note = "Reserved space (empty)", minHeight = "min-h-[22rem]", className }: VaultTileProps) {
  const currentAccount = useCurrentAccount();
  const [vaultData, setVaultData] = useState<{
    ownerCapObjects: SuiObjectResponse[] | null;
    vaultID: string | null;
    ownerCapId: string | null;
  } | null>(null);
  const [dynamicFields, setDynamicFields] = useState<DynamicFieldInfo[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchVaultData = async () => {
      if (!currentAccount?.address) return;
      
      setLoading(true);
      try {
        // Query vault and owner cap - replace with your actual package name
        const packageName = "0x1"; // TODO: Update with actual package ID
        const vaultResult = await getVaultAndOwnerCap({
          accountAddress: currentAccount.address,
          packageName: packageName
        });
        
        console.log("Vault and OwnerCap data:", vaultResult);
        setVaultData(vaultResult || null);

        // If we have a vault ID, get dynamic fields
        if (vaultResult?.vaultID) {
          const dynamicFieldsResult = await getVaultDynamicFields({
            vaultID: vaultResult.vaultID
          });
          
          console.log("Vault dynamic fields:", dynamicFieldsResult);
          setDynamicFields(dynamicFieldsResult || null);
        }
      } catch (error) {
        console.error("Error fetching vault data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchVaultData();
  }, [currentAccount?.address]);

  const displayNote = loading 
    ? "Loading vault data..." 
    : vaultData?.vaultID 
      ? `Vault ID: ${vaultData.vaultID.slice(0, 8)}...${vaultData.vaultID.slice(-8)}` 
      : note;

  return (
    <Tile title="Vault" description={displayNote} minHeight={minHeight} className={className}>
      <div className="mt-4 space-y-4">
        {vaultData && (
          <div className="text-xs">
            <h4 className="font-bold mb-2">Vault Data (Raw JSON):</h4>
            <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40 text-xs">
              {JSON.stringify(vaultData, null, 2)}
            </pre>
          </div>
        )}
        
        {dynamicFields && (
          <div className="text-xs">
            <h4 className="font-bold mb-2">Dynamic Fields (Raw JSON):</h4>
            <pre className="bg-gray-100 p-2 rounded overflow-auto max-h-40 text-xs">
              {JSON.stringify(dynamicFields, null, 2)}
            </pre>
          </div>
        )}
        
        {!vaultData && !loading && (
          <div className="text-sm text-gray-500">No vault data found</div>
        )}
      </div>
    </Tile>
  );
}