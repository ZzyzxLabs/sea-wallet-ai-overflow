// coinStore.ts
import { create } from 'zustand';

// 定義代幣資料的介面
interface Coin {
  symbol?: string;
  name?: string;
  formattedAmount?: number;
  [key: string]: any; // 允許其他屬性
}

// 定義簡化格式的介面
interface SimpleCoin {
  coin: string;
  amount: number;
}

// 定義元數據的介面
interface CoinMetadata {
  decimals?: number;
  name?: string;
  symbol?: string;
  [key: string]: any; // 允許其他屬性
}

// 定義 Store 的狀態介面
interface CoinState {
  // 狀態
  coinsInVault: any[]; // 可以是對象數組或嵌套數組
  coinMetadata: CoinMetadata[];
  isLoading: boolean;
  
  // 設置函數
  setCoinsInVault: (coins: any[]) => void;
  setCoinMetadata: (metadata: CoinMetadata[]) => void;
  setLoading: (isLoading: boolean) => void;
  
  // 重置函數
  resetCoinsData: () => void;
  
  // 選擇器
  getSimpleCoins: () => SimpleCoin[];
}

// 創建 store
const useCoinStore = create<CoinState>((set, get) => ({
  // 初始狀態
  coinsInVault: [],
  coinMetadata: [],
  isLoading: true,
  
  // 設置函數
  setCoinsInVault: (coins) => set({ coinsInVault: coins }),
  setCoinMetadata: (metadata) => set({ coinMetadata: metadata }),
  setLoading: (isLoading) => set({ isLoading }),
  
  // 重置函數
  resetCoinsData: () => set({ coinsInVault: [], isLoading: true }),
  
  // 選擇器 - 獲取簡化格式的代幣資料
  getSimpleCoins: () => {
    const { coinsInVault, coinMetadata } = get();
    
    if (!coinsInVault || coinsInVault.length === 0) {
      return [];
    }
    
    // 判斷資料格式並轉換
    const isObjectFormat = typeof coinsInVault[0] === 'object' && !Array.isArray(coinsInVault[0]);
    
    if (isObjectFormat) {
      return coinsInVault.map((coin: Coin) => ({
        coin: coin.symbol || coin.name || 'Unknown',
        amount: coin.formattedAmount || 0
      }));
    } else {
      return coinsInVault.map((coin: any[], index: number) => {
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
  }
}));

export default useCoinStore;