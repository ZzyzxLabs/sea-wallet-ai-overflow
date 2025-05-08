import { Transaction } from "@mysten/sui/transactions";
import { create } from "zustand";
import { ZkSendLinkBuilder } from "@mysten/zksend";
import { BcsType, fromHex, toHex } from "@mysten/bcs";
import { bcs } from "@mysten/sui/bcs";
function VecMap<K extends BcsType<any>, V extends BcsType<any>>(K: K, V: V) {
  return bcs.struct(`VecMap<${K.name}, ${V.name}>`, {
    keys: bcs.vector(K),
    values: bcs.vector(V),
  });
}
function stringToUint8Array(str) {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}
// Define a TypeScript interface for your store state
interface MoveStore {
  packageName: string;
  createVaultTx: () => Transaction;
  fuseTxFunctions: (
    capId: string,
    vaultId: string,
    coinIds: string[],
    amount: number,
    name: number,
    coinType: string
  ) => Transaction;
  // coinSpTester: () => Transaction;
  mintCap: (
    cap: string,
    vault: string,
    sui: { keys: string[]; values: number[] },
    email: { keys: string[]; values: number[] }
  ) => Promise<Transaction>;
  zkTransaction: (
    sender: string,
    network: "mainnet" | "testnet",
    prope: string[]
  ) => Promise<{ urls: string[]; tx: any }>;
  resetState: () => void;
}

const useMoveStore = create<MoveStore>((set, get) => ({
  // main
  packageName:
    "0xfa7f043a4fb3399ba9668d311bdbb0fe728d6f0ed6c53675a66170a0f801b7da",
  createVaultTx: () => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${get().packageName}::vault::createVault`,
      arguments: [],
    });
    return vaultTx;
  },

  alterTx: (capId, vaultId, coinIds, amount, name, coinType) => {
    const tx = new Transaction();
    // Basic validation
    if (!Array.isArray(coinIds) || coinIds.length === 0) {
      throw new Error("coinIds must be a non-empty array of object IDs");
    }

    // CRITICAL FIX: Create proper object references for all IDs
    const coinObjects = coinIds.map((id) => tx.object(id));
    console.log("coinObjects", coinObjects);

    // Step 1: merge coins if needed
    if (coinIds.length > 1) {
      tx.mergeCoins(coinObjects[0], coinObjects.slice(1));
    }
    // Step 2: Split coins - USING OBJECT REFERENCE, NOT STRING
    const [goods] = tx.splitCoins(coinObjects[0], [amount]);

    if(coinType === "0x2::sui::SUI"){
    }
    // const nameBC = bcs.vector(bcs.U8).serialize(stringToUint8Array(name.toString()));
    const nameBC = stringToUint8Array(name.toString());
    // Step 3: use goods as asset input into addToVault
    tx.moveCall({
      target: `${get().packageName}::vault::organize_trust_asset`,
      arguments: [tx.object(capId), tx.object(vaultId), tx.pure(nameBC), goods],
      typeArguments: [coinType],
    });

    return tx;
  },

  fuseTxFunctions: (capId, vaultId, coinIds, amount, name, coinType) => {
    const tx = new Transaction();

    // Basic validation
    if (!Array.isArray(coinIds) || coinIds.length === 0) {
      throw new Error("coinIds must be a non-empty array of object IDs");
    }

    // CRITICAL FIX: Create proper object references for all IDs
    const coinObjects = coinIds.map((id) => tx.object(id));
    console.log("coinObjects", coinObjects);

    // Step 1: merge coins if needed
    if (coinIds.length > 1) {
      tx.mergeCoins(coinObjects[0], coinObjects.slice(1));
    }

    // Step 2: Split coins - USING OBJECT REFERENCE, NOT STRING
    const [goods] = tx.splitCoins(coinObjects[0], [amount]);
    const nameBC = bcs
      .vector(bcs.U8)
      .serialize(stringToUint8Array(name.toString()));
    // Step 3: use goods as asset input into addToVault
    tx.moveCall({
      target: `${get().packageName}::vault::add_trust_asset_coin`,
      arguments: [tx.object(capId), tx.object(vaultId), goods, tx.pure(nameBC)],
      typeArguments: [coinType || "unknown_coin_type"],
    });

    return tx;
  },

  async mintCapTest(cap, vault, sui, email) {},
  async mintCap(cap, vault, sui, email) {
    // testing config
    // email = {
    //   keys: ["x.com", "y.com"],
    //   values: [25, 25],
    // };
    // sui = {
    //   keys: [
    //     "0x08b782844f1900e033607d33d353ef3c8e181abfe044e8b921a102ee67f18c37",
    //     "0x08b782844f1900e033607d33d353ef3c8e181abfe044e8b921a102ee67f18c37",
    //   ],
    //   values: [25, 25],
    // };
    const addressList = bcs.vector(bcs.Address).serialize(sui.keys).toBytes();
    const addressPer = bcs.vector(bcs.u8()).serialize(sui.values).toBytes();
    const emailList = bcs.vector(bcs.String).serialize(email.keys).toBytes();
    const emailPer = bcs.vector(bcs.u8()).serialize(email.values).toBytes();
    // console.log("addressList", addressList);
    // console.log("addressPer", addressPer);
    // console.log("emailList", emailList);
    // console.log("emailPer", emailPer);
    const tx = new Transaction();

    // handle addresses
    tx.moveCall({
      target: `${get().packageName}::vault::addMemberByAddresses`,
      arguments: [
        tx.object(cap),
        tx.object(vault),
        tx.pure(addressList),
        tx.pure(addressPer),
      ],
    });

    // handle emails
    const links = [];
    for (let i = 0; i < email.keys.length; i++) {
      const link = new ZkSendLinkBuilder({
        sender:
          "0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac",
        network: "testnet",
      });

      let emailCap = tx.moveCall({
        target: `${get().packageName}::vault::addMemberByEmail`,
        arguments: [
          tx.object(cap),
          tx.object(vault),
          tx.pure.string(email.keys[i]),
          tx.pure.u8(email.values[i]),
        ],
      });

      link.addClaimableObjectRef(
        emailCap,
        `${get().packageName}::vault::MemberCap`
      );
      await link.createSendTransaction({
        transaction: tx,
      });
      links.push(link);
    }
    const urls = links.map((link) => link.getLink());
    console.log("Your fucking urls", urls);
    for(let i = 0; i < urls.length; i++) {
    this.sendEmail(email.keys[i], urls[i]);
  }
    return tx;
  },

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
  async sendEmail(to: string, url: any) {
    try {
      const response = await fetch('/api/maillService', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, url }),
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('發送請求失敗:', error);
      throw error;
    }
  },

  // Reset all state to initial values
  resetState: () =>
    set({
      packageName: "0",
    }),
}));

export default useMoveStore;
