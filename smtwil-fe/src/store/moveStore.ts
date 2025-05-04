import { Transaction } from '@mysten/sui/transactions';
import { create } from 'zustand';
import { ZkSendLinkBuilder } from "@mysten/zksend";
import { BcsType, fromHex, toHex } from "@mysten/bcs";
import { bcs } from '@mysten/sui/bcs';
function VecMap<K extends BcsType<any>, V extends BcsType<any>>(K: K, V: V) {

    return bcs.struct(
        `VecMap<${K.name}, ${V.name}>`,
        {
            keys: bcs.vector(K),
            values: bcs.vector(V),
        }
    )
}

// Define a TypeScript interface for your store state
interface MoveStore {
  packageName: string;
  createVaultTx: () => Transaction;
  fuseTxFunctions: (capId: string, vaultId: string, coinIds: string[], amount: number, name: number, coinType: string) => Transaction;
  // coinSpTester: () => Transaction;
  mintCap: (cap: string, vault: string, sui: {keys: string[], values: number[]}, email: {keys: string[], values: number[]}) => Promise<Transaction>;
  zkTransaction: (sender: string, network: "mainnet" | "testnet", prope: string, count: number) => Promise<{urls: string[], tx: any}>;
  resetState: () => void;
}

const useMoveStore = create<MoveStore>((set, get) => ({
  
  // main 
  packageName: "0x9622fd64681280dc61eecf7fbc2e756bb7614cf5662f220044f573758f922c71",
  
  createVaultTx: () => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${get().packageName}::vault::createVault`,
      arguments: [],
    });
    return vaultTx;
  },
  
  fuseTxFunctions: (capId, vaultId, coinIds, amount, name, coinType) => {
    const tx = new Transaction();
    
    // Basic validation
    if (!Array.isArray(coinIds) || coinIds.length === 0) {
      throw new Error("coinIds must be a non-empty array of object IDs");
    }
    
    // CRITICAL FIX: Create proper object references for all IDs
    const coinObjects = coinIds.map(id => tx.object(id));
    console.log("coinObjects", coinObjects);
    // Step 1: merge coins if needed
    if (coinIds.length > 1) {
      tx.mergeCoins(coinObjects[0], coinObjects.slice(1));
    }
    
    // Step 2: Split coins - USING OBJECT REFERENCE, NOT STRING
    const [goods] = tx.splitCoins(coinObjects[0], [amount]);
    
    // Step 3: use goods as asset input into addToVault
    tx.moveCall({
      target: `${get().packageName}::vault::add_trust_asset_coin`,
      arguments: [
        tx.object(capId), 
        tx.object(vaultId), 
        goods, 
        tx.pure.u8(name)
      ],
      typeArguments: [coinType || 'unknown_coin_type'],
    });
    
    return tx;
  },
  
  // coinSpTester() {
  //   const tx = new Transaction();
  //   const [coin] = tx.splitCoins(
  //     tx.object("0xdb48537af69fb165da9576ad65e55c80fc65034343fc1f737d44f2083f5db1fb"),
  //     [100000]
  //   );
  //   return tx;
  // },
  async mintCap(cap, vault, sui, email) {
    const Address = bcs.Address.transform({
      // To change the input type, you need to provide a type definition for the input
      input: (val: string) => fromHex(val),
      output: (val) => toHex(val),
    })
    const suiRework = {
      keys: sui.keys.map(key => Address.serialize(key).toBytes()),
      values: sui.values
    };
    const suiMap = VecMap(bcs.Address, bcs.U8).serialize({
      keys: sui.keys,      // array of hex strings, e.g. ["0x123...", "0x456..."]
      values: sui.values,  // array of numbers (u8)
  });

  // Prepare VecMap<string, u8>
  const emailMap = VecMap(bcs.String, bcs.U8).serialize({
      keys: email.keys,    // array of strings, e.g. ["alice@example.com", ...]
      values: email.values // array of numbers (u8)
  });
    const tx = new Transaction();
    tx.moveCall({
      target: `${get().packageName}::vault::initMember`,
      arguments: [
        tx.object(cap),
        tx.object(vault),
        tx.pure(suiMap),
        tx.pure(emailMap)
      ]
    });
    console.log("tx", tx);
    return tx;
  },
  
  
  async zkTransaction(sender, network, prope, count) {
    const links = [];
 
    for (let i = 0; i < count; i++) {
      const link = new ZkSendLinkBuilder({
        sender: sender,
        network: network,
      });
     
      link.addClaimableObject(prope);
      links.push(link);
    }
     
    const urls = links.map((link) => link.getLink());
     
    const tx = await ZkSendLinkBuilder.createLinks({
      links,
    });
    
    return { urls, tx };
  },
  
  // Reset all state to initial values
  resetState: () => set({
    packageName: "0"
  })
}));

export default useMoveStore;