import { Transaction } from "@mysten/sui/transactions";
import { create } from "zustand";
import { ZkSendLinkBuilder } from "@mysten/zksend";
import { bcs } from "@mysten/sui/bcs";
import { coinWithBalance } from "@mysten/sui/transactions";
import { package_addr } from "./package";
// Type definitions
interface SuiData {
  keys: string[];
  values: number[];
}

interface EmailData {
  keys: string[];
  values: number[];
}

interface MoveStoreState {
  packageName: string;
  walletOwner: string;
  setAddress: (address: string) => void;
  createVaultTx: () => Transaction;
  alterTx: (
    capId: string,
    vaultId: string,
    coinIds: string[],
    amount: bigint,
    name: string,
    coinType: string,
    senderAddress: string
  ) => Transaction;
  fuseTxFunctions: (
    capId: string,
    vaultId: string,
    coinIds: string[],
    amount: bigint,
    name: string,
    coinType: string,
    senderAddress: string
  ) => Transaction;
  takeCoinTx: (
    capId: string,
    vaultId: string,
    assetName: string,
    amount: bigint,
    coinType: string
  ) => Transaction;
  mintCap: (
    cap: string,
    vault: string,
    sui: SuiData,
    email: EmailData,
    senderAddress: string
  ) => Promise<Transaction>;
  zkTransaction: (
    sender: string,
    network: string,
    prope: any[]
  ) => Promise<{ urls: string[]; tx: Transaction[] }>;
  sendEmail: (to: string, url: string) => Promise<any>;
  sendcoinLol: (coin: string[], amt: bigint, destination: string) => Transaction;
  resetState: () => void;
  memberWithdrawTx: (
    capId: string,
    vaultId: string,
    assetNames: string[],
    coinTypes: string[]
  ) => Transaction;
}

const useMoveStore = create<MoveStoreState>((set, get) => ({
  // main
  packageName: package_addr,
  walletOwner: "",
  
  setAddress: (address: string) => {
    set({ walletOwner: address });
  },
  
  createVaultTx: (): Transaction => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${get().packageName}::sea_vault::create_vault`,
      arguments: [],
    });
    return vaultTx;
  },

  alterTx: (
    capId: string,
    vaultId: string,
    coinIds: string[],
    amount: bigint,
    name: string,
    coinType: string,
    senderAddress: string
  ): Transaction => {
    const tx = new Transaction();
    console.log("senderAddress", senderAddress);
    
    // when coinType is SUI, we need to set sender
    if (coinType === "0x2::sui::SUI") {
      tx.setSender(senderAddress);
      // construct a new SUI Coin, balance is in MIST (1 SUI = 10^9 MIST)
      const suiCoinInput = coinWithBalance({
        balance: amount,
        useGasCoin: true, // keep the original gas coin for fee
      });
      const nameBC = bcs.string().serialize(name).toBytes();
      tx.moveCall({
        target: `${get().packageName}::sea_vault::organize_coin`,
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
        target: `${get().packageName}::sea_vault::organize_coin`,
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
    amount: bigint,
    name: string,
    coinType: string,
    senderAddress: string
  ): Transaction => {
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
        useGasCoin: true, // keep the gas coin purely for fees
      });

      // Call the Move function to add this coin into your vault
      tx.moveCall({
        target: `${get().packageName}::sea_vault::add_coin`,
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
        target: `${get().packageName}::sea_vault::add_coin`,
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
    amount: bigint,
    coinType: string
  ): Transaction => {
    const tx = new Transaction();

    // BCS-serialize the asset name string
    const nameBC = bcs.string().serialize(assetName).toBytes();

    // Call the Move function to take coin from vault
    tx.moveCall({
      target: `${get().packageName}::sea_vault::take_coin`,
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

  mintCap: async (
    cap: string,
    vault: string,
    sui: SuiData,
    email: EmailData,
    senderAddress: string
  ): Promise<Transaction> => {
    const addressList = bcs.vector(bcs.Address).serialize(sui.keys).toBytes();
    const addressPer = bcs.vector(bcs.u8()).serialize(sui.values).toBytes();
    const emailList = bcs.vector(bcs.String).serialize(email.keys).toBytes();
    const emailPer = bcs.vector(bcs.u8()).serialize(email.values).toBytes();
    
    const tx = new Transaction();
    tx.setSender(senderAddress);
    console.log(email);
    
    // handle addresses
    tx.moveCall({
      target: `${get().packageName}::sea_vault::add_member_by_addresses`,
      arguments: [
        tx.object(cap),
        tx.object(vault),
        tx.pure(addressList),
        tx.pure(addressPer),
      ],
    });

    // handle emails
    const links: ZkSendLinkBuilder[] = [];
    for (let i = 0; i < email.keys.length; i++) {
      const link = new ZkSendLinkBuilder({
        sender: get().walletOwner,
        network: "testnet",
      });
      let emailCap = tx.moveCall({
        target: `${get().packageName}::sea_vault::add_member_by_email`,
        arguments: [
          tx.object(cap),
          tx.object(vault),
          tx.pure.string(email.keys[i]),
          tx.pure.u8(email.values[i]),
        ],
      });

      link.addClaimableObjectRef(
        emailCap,
        `${get().packageName}::sea_vault::MemberCap`
      );
      await link.createSendTransaction({
        transaction: tx,
      });
      links.push(link);
    }
    
    const urls = links.map((link) => link.getLink());
    const sendEmail = get().sendEmail;
    for (let i = 0; i < urls.length; i++) {
      await sendEmail(email.keys[i], urls[i]);
    }
    return tx;
  },

  zkTransaction: async (
    sender: string,
    network: string,
    prope: any[]
  ): Promise<{ urls: string[]; tx: Transaction[] }> => {
    const urls: string[] = [];
    const txs: Transaction[] = [];
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

  sendEmail: async (to: string, url: string): Promise<any> => {
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

  sendcoinLol: (coin: string[], amt: bigint, destination: string): Transaction => {
    const tx = new Transaction();
    const coinObjects = coin.map((id) => tx.object(id));

    // If there are multiple coins, merge them into one
    if (coinObjects.length > 1) {
      tx.mergeCoins(coinObjects[0], coinObjects.slice(1));
    }
    // Split out exactly `amount` from the merged coin
    const [goods] = tx.splitCoins(coinObjects[0], [amt]);
    tx.transferObjects([goods], destination);
    return tx;
  },

  // Reset all state to initial values
  resetState: () =>
    set({
      packageName: package_addr,
    }),

  // Add memberWithdrawTx implementation
  memberWithdrawTx: (
    capId: string,
    vaultId: string,
    assetNames: string[],
    coinTypes: string[]
  ): Transaction => {
    // Verify arrays have same length
    if (assetNames.length !== coinTypes.length) {
      throw new Error(
        "Asset names and coin types arrays must have the same length"
      );
    }

    const tx = new Transaction();

    // Get system clock object ID
    const clockObjectId = "0x6";

    // Process each asset withdrawal
    for (let i = 0; i < assetNames.length; i++) {
      // BCS-serialize the asset name string
      const nameBC = bcs.string().serialize(assetNames[i]).toBytes();

      // Call the Move function to withdraw coins as an heir
      tx.moveCall({
        target: `${get().packageName}::sea_vault::member_withdraw`,
        arguments: [
          tx.object(capId),
          tx.object(vaultId),
          tx.object(clockObjectId),
          tx.pure(nameBC),
        ],
        typeArguments: [coinTypes[i]],
      });
    }

    return tx;
  },
}));

export default useMoveStore;
