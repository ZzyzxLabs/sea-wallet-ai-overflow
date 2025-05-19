// coinStore.js
import { create } from 'zustand';

const useCoinStore = create((set, get) => ({
  // 基本狀態
  coinsInVault: [],
  coinMetadata: [],
  isLoading: true,
  
  // 設置函數
  setCoinsInVault: (coins) => set({ coinsInVault: coins }),
  setCoinMetadata: (metadata) => set({ coinMetadata: metadata }),
  setLoading: (isLoading) => set({ isLoading }),
  
  // 重置函數
  resetCoinsData: () => set({ coinsInVault: [], isLoading: true }),
  
  // 獲取簡潔格式數據的選擇器
  getSimpleCoins: () => {
    const { coinsInVault, coinMetadata } = get();
    
    if (!coinsInVault || coinsInVault.length === 0) {
      return [];
    }
    
    // 判斷數據格式並進行轉換
    const isObjectFormat = typeof coinsInVault[0] === 'object' && !Array.isArray(coinsInVault[0]);
    
    if (isObjectFormat) {
      return coinsInVault.map(coin => ({
        coin: coin.symbol || coin.name || 'Unknown',
        amount: coin.formattedAmount || 0
      }));
    } else {
      return coinsInVault.map((coin, index) => {
        const coinName = Array.isArray(coin) ? coin[0] : 'Unknown';
        const rawAmount = Array.isArray(coin) ? coin[2] : '0';
        const decimals = (coinMetadata[index]?.decimals || 9);
        const formattedAmount = Number(rawAmount) / Math.pow(10, decimals);
        
        return {
          coin: coinName,
          amount: formattedAmount
        };
      });
    }
  },
  
  // 新增: 獲取代幣資料為原始文本格式
  getCoinsAsRawText: () => {
    const simpleCoins = get().getSimpleCoins();
    
    if (simpleCoins.length === 0) {
      return "No coins in vault";
    }
    
    // 將簡化的代幣資料轉換為文本
    return simpleCoins.map(item => 
      `coin: ${item.coin}, amount: ${item.amount}`
    ).join('\n');
  }
}));

export default useCoinStore;