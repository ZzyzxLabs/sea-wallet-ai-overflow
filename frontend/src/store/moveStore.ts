import { Transaction } from "@mysten/sui/transactions";
import { create } from "zustand";
import { ZkSendLinkBuilder } from "@mysten/zksend";
import { BcsType, fromHex, toHex } from "@mysten/bcs";
import { bcs } from "@mysten/sui/bcs";
import { coinWithBalance } from "@mysten/sui/transactions";
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
  walletOnwer: string;
  createVaultTx: () => Transaction;
  fuseTxFunctions: (
    capId: string,
    vaultId: string,
    coinIds: string[],
    amount: number,
    name: string,
    coinType: string,
    senderAddress: string
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
  sendEmail: (to: string, url: any) => Promise<any>;
  takeCoinTx: (
    capId: string,
    vaultId: string,
    assetName: string,
    amount: number,
    coinType: string
  ) => Transaction;
}

const useMoveStore = create<MoveStore>((set, get) => ({
  // main
  packageName:
    "0x025fcbe4c2d5566fd28677e4d31f4e8bc51ff16d4cf4a740cad5f6014df02de6",
  walletOnwer:
    "0x9fcc44605f6b702244d32ff43852eb1a13938f9afbc5f5329e87709c52cfbf75",
  createVaultTx: () => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${get().packageName}::seaVault::createVault`,
      arguments: [],
    });
    return vaultTx;
  },

  alterTx: (
    capId: string,
    vaultId: string,
    coinIds: string[],
    amount: number,
    name: string,
    coinType: string,
    senderAddress: string
  ) => {
    const tx = new Transaction();
    console.log("senderAddress", senderAddress);
    // when coinType is SUI, we need to set sender
    if (coinType === "0x2::sui::SUI") {
      tx.setSender(senderAddress);
      // construct a new SUI Coin, balance is in MIST (1 SUI = 10^9 MIST)
      const suiCoinInput = coinWithBalance({
        balance: amount,
        useGasCoin: false, // keep the original gas coin for fee
      });
      const nameBC = bcs.string().serialize(name).toBytes();
      tx.moveCall({
        target: `${get().packageName}::seaVault::organize_coin`,
        arguments: [
          tx.object(capId),
          tx.object(vaultId),
          tx.pure(nameBC),
          suiCoinInput,
        ],
        typeArguments: [coinType],
      });
    } else {
      // for non-SUI coin, use merge + split logic
      if (!Array.isArray(coinIds) || coinIds.length === 0) {
        throw new Error("coinIds must be a non-empty array of object IDs");
      }
      const coinObjs = coinIds.map((id) => tx.object(id));
      if (coinObjs.length > 1) {
        tx.mergeCoins(coinObjs[0], coinObjs.slice(1));
      }
      const [goods] = tx.splitCoins(coinObjs[0], [amount]);
      const nameBC = bcs.string().serialize(name).toBytes();
      tx.moveCall({
        target: `${get().packageName}::seaVault::organize_coin`,
        arguments: [
          tx.object(capId),
          tx.object(vaultId),
          tx.pure(nameBC),
          goods,
        ],
        typeArguments: [coinType],
      });
    }

    return tx;
  },

  fuseTxFunctions: (
    capId: string,
    vaultId: string,
    coinIds: string[],
    amount: number,
    name: string,
    coinType: string,
    senderAddress: string // required for coinWithBalance on SUI
  ) => {
    // Initialize a new transaction
    const tx = new Transaction();

    // If dealing with native SUI, use coinWithBalance to isolate the exact amount
    if (coinType === "0x2::sui::SUI") {
      // Specify which address is sending (so the SDK can pick coins)
      tx.setSender(senderAddress);

      // Prepare the name as a BCS-encoded byte vector
      const nameBC = bcs.string().serialize(name).toBytes();

      // Create a "virtual" coin input of exactly `amount`, leaving gas coin intact
      const suiInput = coinWithBalance({
        balance: amount, // amount in MIST (1 SUI = 10^9 MIST)
        useGasCoin: false, // keep the gas coin purely for fees
      });

      // Call the Move function to add this coin into your vault
      tx.moveCall({
        target: `${get().packageName}::seaVault::add_coin`,
        arguments: [
          tx.object(capId),
          tx.object(vaultId),
          tx.pure(nameBC),
          suiInput,
        ],
        typeArguments: [coinType],
      });
    } else {
      // ---- Non-SUI assets: manual merge & split workflow ----

      // Validate input
      if (!Array.isArray(coinIds) || coinIds.length === 0) {
        throw new Error("coinIds must be a non-empty array of object IDs");
      }

      // Turn each ID string into an object reference
      const coinObjects = coinIds.map((id) => tx.object(id));

      // If there are multiple coins, merge them into one
      if (coinObjects.length > 1) {
        tx.mergeCoins(coinObjects[0], coinObjects.slice(1));
      }

      // Split out exactly `amount` from the merged coin
      const [goods] = tx.splitCoins(coinObjects[0], [amount]);

      // BCS-serialize the `name` argument
      const nameBC = bcs.string().serialize(name).toBytes();

      // Call the Move function to add this asset into your vault
      tx.moveCall({
        target: `${get().packageName}::seaVault::add_coin`,
        arguments: [
          tx.object(capId),
          tx.object(vaultId),
          tx.pure(nameBC),
          goods,
        ],
        typeArguments: [coinType || "unknown_coin_type"],
      });
    }

    return tx;
  },
  takeCoinTx: (
    capId: string,
    vaultId: string,
    assetName: string,
    amount: number,
    coinType: string
  ) => {
    const tx = new Transaction();

    // BCS-serialize the asset name string
    const nameBC = bcs.string().serialize(assetName).toBytes();

    // Call the Move function to take coin from vault
    tx.moveCall({
      target: `${get().packageName}::seaVault::take_coin`,
      arguments: [
        tx.object(capId),
        tx.object(vaultId),
        tx.pure(nameBC),
        tx.pure.u64(amount),
      ],
      typeArguments: [coinType],
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
      target: `${get().packageName}::seaVault::addMemberByAddresses`,
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
        sender: get().walletOnwer,
        network: "testnet",
      });

      let emailCap = tx.moveCall({
        target: `${get().packageName}::seaVault::addMemberByEmail`,
        arguments: [
          tx.object(cap),
          tx.object(vault),
          tx.pure.string(email.keys[i]),
          tx.pure.u8(email.values[i]),
        ],
      });

      link.addClaimableObjectRef(
        emailCapRef,
        `${get().packageName}::seaVault::MemberCap`
      );
      await link.createSendTransaction({
        transaction: tx,
      });
      links.push(link);
    }
    const urls = links.map((link) => link.getLink());
    console.log("Your fucking urls", urls);
    const sendEmail = get().sendEmail;
    for (let i = 0; i < urls.length; i++) {
      await sendEmail(email.keys[i], urls[i]);
      console.log("sendEmail", email.keys[i], urls[i]);
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
  async sendEmail(to: string, url: string): Promise<any> {
    try {
      const response = await fetch("../api/mailService", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, url }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("發送請求失敗:", error);
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
