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
  zkTransaction: (sender: string, network: "mainnet" | "testnet", prope: string[]) => Promise<{urls: string[], tx: any}>;
  resetState: () => void;
}

const useMoveStore = create<MoveStore>((set, get) => ({
  
  // main 
  packageName: "0xbd0ae6eab8b2eeb163a7f1a0386142f5aeb2790452baef6d07100487f1310ea5",
  
  createVaultTx: () => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${get().packageName}::vault::createVault`,
      arguments: [],
    });
    return vaultTx;
  },
  alterTx:(capId, vaultId, coinIds, amount, name, coinType) => {
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
      target: `${get().packageName}::vault::organize_trust_asset`,
      arguments: [
        tx.object(capId), 
        tx.object(vaultId), 
        tx.pure.u8(name),
        goods
      ],
      typeArguments: [coinType],
    });
    
    return tx;
  }
  ,
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
  
  
  // async zkTransaction(sender, network, prope, count) {
  //   const links = [];
  //   const mock = ["0x27c1821e8cf4779c6f549cb63a47057a877ad54961a1587212b1e34020d9b56a", "0x383798bfd735b83a136a146dae07d33dad2ea1cd29b2c37283220ba671bcbb7c"]
  //   for (let i = 0; i < 2/*count*/ ; i++) {
  //     const link = new ZkSendLinkBuilder({
  //       sender: sender,
  //       network: network,
  //     });
  //     console.log(/*prope[i]*/mock);
  //     link.addClaimableObject(/*prope[i]*/mock[i]);
  //     await links.push(link);
  //   }
     
  //   const urls = links.map((link) => link.getLink());
     
  //   const tx = await ZkSendLinkBuilder.createLinks({
  //     links,
  //   });
    
  //   return { urls, tx };
  // },
  async zkTransaction(sender, network, prope) {
    const urls: string[] = [];
    const txs: any[] = [];
    for (let i = 0; i < prope.length; i++) {
      const zelda = new ZkSendLinkBuilder({
      sender: sender,
      network: network,
      });
      zelda.addClaimableObject(prope[i]);
      const url = zelda.getLink();
      const tx = await zelda.createSendTransaction();
      urls.push(url);
      txs.push(tx);

    }

    return { urls, tx: txs };
  },
  // Reset all state to initial values
  resetState: () => set({
    packageName: "0"
  })
}));

export default useMoveStore;