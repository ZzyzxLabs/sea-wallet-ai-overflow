import { Transaction } from '@mysten/sui/transactions';
import { create } from 'zustand';
import { ZkSendLinkBuilder } from "@mysten/zksend"
import { bcs, BcsType } from "@mysten/bcs";
function VecMap(K, V) {
  return bcs.struct(
    `VecMap<${K.name}, ${V.name}>`,
    {
      keys: bcs.vector(K),
      values: bcs.vector(V),
    }
  );
}
const useMoveStore = create((set, get) => ({
  
  packageName: "0xbb4e6631f81e79d76c47d4acc6193c4fee55c48fc0854e4fd15f5564ca4a3584", // 替換為你的 package name
  
  createVaultTx: () => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${get().packageName}::vault::createVault`,
      arguments: [],
    });
    return vaultTx;
  },
    // capId, vaultId, coinIds (array of objectIds), amount, name, coinType
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
  
  coinSpTester() {
    const tx = new Transaction();
    const [coin] = tx.splitCoins(
      tx.object("0xdb48537af69fb165da9576ad65e55c80fc65034343fc1f737d44f2083f5db1fb"),
      [100000]
    );
    return tx;
  },
  sendHeirTx(sui,email,cap,vault){
    const tx = new Transaction()
    tx.moveCall({
      target: `${get().packageName}::vault::initmember`,
      arguments: [
        sui,
        email,
        tx.object(cap), 
        tx.object(vault), 

      ],
    })
  },
  mintCap(cap, vault, sui, email){
    const suiAddressVecMap = VecMap(bcs.string(), bcs.u8()).serialize(sui)
  
    // 序列化 Email VecMap
    const emailVecMap = VecMap(bcs.string(), bcs.u8()).serialize(email)
    const tx = new Transaction()
    tx.moveCall({
      target: `${get().packageName}::vault::initMember`,
      arguments: [
        tx.object(cap), 
        tx.object(vault),
        suiAddressVecMap,
        emailVecMap,
      ],

    })
    return tx;
  }
  ,
  zkTransaction(sender, network, prope, count){
    const links = [];
 
	for (let i = 0; i < count; i++) {
		const link = new ZkSendLinkBuilder({
			sender: sender,
			network: network,
		});
	 
		link.addClaimableObject(prope[i])
		links.push(link);
	}
	 
	const urls = links.map((link) => link.getLink());
	 
	const tx = ZkSendLinkBuilder.createLinks({
		links,
	});
	
	return { urls, tx };
  },
  // 重置所有狀態到初始值
  resetState: () => set({
    packageName: "0"
  })
}));
  
export default useMoveStore;