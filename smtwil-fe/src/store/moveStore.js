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
  
  // 重置所有狀態到初始值
  resetState: () => set({
    packageName: "0"
  })
}));

export default useMoveStore;