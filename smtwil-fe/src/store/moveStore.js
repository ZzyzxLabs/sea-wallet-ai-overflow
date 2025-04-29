import { Transaction } from '@mysten/sui/transactions';
import { create } from 'zustand';

const useMoveStore = create((set, get) => ({
  packageName: "0", // 替換為你的 package name
  
  createVaultTx: () => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${get().packageName}::smartwill::vault`,
      arguments: [],
    });
    return vaultTx;
  },
  //asset is an object,name is costumized
  addToVaultTx: (cap,vault,asset,name) => {
    const vaultTx = new Transaction();
    vaultTx.moveCall({
      target: `${get().packageName}::smartwill::add_trust_asset_coin`,
      arguments: [cap, vault, asset, name],
      //put in coinType here.
      typeArguments: [asset.coinType],
    });
    return vaultTx;
  },
  coinEmittion:(ori,snd) => {
    const organizeTx = new Transaction();
    // Merge every other element into ori[0]
    if (ori && ori.length > 1) {
      for (let i = 1; i < ori.length; i += 2) {
      organizeTx.mergeCoins(ori[0], [ori[i]]);
      }
    }
    organizeTx.splitCoins(ori[0], [snd]);
    return organizeTx;
  },

  // 重置所有狀態到初始值
  resetState: () => set({
    packageName: "0"
  })
}));

export default useMoveStore;