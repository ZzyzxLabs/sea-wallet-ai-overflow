// store.js
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useHeirStore = create(persist((set, get) => ({
  // 連接狀態
  isConnecting: false,
  showWelcome: false,
  showNextCard: false,
  showDashboardIndicator: false, // Add this line
  
  // 警告狀態
  showWarning: false,
  warningMessage: "",
  
  // 繼承人資料
  heirs: [{ id: Date.now(), email: "", ratio: "" }],
  
  setHeirs: (newHeirs) => set({ heirs: newHeirs }),


  // 設置連接狀態
  setIsConnecting: (value) => set({ isConnecting: value }),
  setShowWelcome: (value) => set({ showWelcome: value }),
  setShowNextCard: (value) => set({ showNextCard: value }),
  setShowDashboardIndicator: (value) => set({ showDashboardIndicator: value }), // Add this line
  
  // 設置警告狀態
  setShowWarning: (value) => set({ showWarning: value }),
  setWarningMessage: (message) => set({ warningMessage: message }),
  
  // 顯示警告
  showWarningMessage: (message) => {
    set({ 
      warningMessage: message,
      showWarning: true 
    });
  },
  
  // 關閉警告
  closeWarning: () => set({ showWarning: false }),
  
  // 繼承人管理
  addHeir: () => {
    const heirs = get().heirs;
    set({ heirs: [...heirs, { id: Date.now(), email: "", ratio: "" }] });
  },
  
  removeHeir: (idToRemove) => {
    const heirs = get().heirs;
    if (heirs.length > 1) {
      set({ heirs: heirs.filter(heir => heir.id !== idToRemove) });
    }
  },
  
  updateHeir: (id, field, value) => {
    // 如果是比例欄位，確保不能輸入負數
    if (field === "ratio") {
      // 移除所有非數字字符（保留小數點）
      const numericValue = value.replace(/[^\d.]/g, '');
      
      // 確保值為正數（移除負號）
      const positiveValue = numericValue.replace(/-/g, '');
      
      // 使用處理後的值
      value = positiveValue;
    }
    
    const heirs = get().heirs;
    const updatedHeirs = heirs.map(heir => {
      if (heir.id === id) {
        return { ...heir, [field]: value };
      }
      return heir;
    });
    
    set({ heirs: updatedHeirs });
  },
  
  // 計算總比例
  getTotalRatio: () => {
    const heirs = get().heirs;
    return heirs.reduce((sum, heir) => sum + (parseFloat(heir.ratio) || 0), 0);
  },
  
  // 驗證表單
  validateForm: () => {
    const { heirs, showWarningMessage } = get();
    
    // 檢查所有欄位是否都已填寫
    const isAnyFieldEmpty = heirs.some(heir => !heir.email || !heir.ratio);
    if (isAnyFieldEmpty) {
      showWarningMessage("請填寫所有繼承人的電子郵件和比例欄位。");
      return false;
    }

    // 檢查電子郵件格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isAnyEmailInvalid = heirs.some(heir => !emailRegex.test(heir.email));
    if (isAnyEmailInvalid) {
      showWarningMessage("請確保所有電子郵件地址格式正確。");
      return false;
    }

    // 檢查比例是否為有效的正數
    const isAnyRatioInvalid = heirs.some(heir => {
      const value = parseFloat(heir.ratio);
      return isNaN(value) || value <= 0;
    });
    
    if (isAnyRatioInvalid) {
      showWarningMessage("請確保所有比例欄位均為有效的正數。");
      return false;
    }

    // 計算總比例
    const totalRatio = get().getTotalRatio();
    
    // 檢查總比例是否等於100%
    if (Math.abs(totalRatio - 100) > 0.01) { // 使用小誤差範圍來處理浮點數精度問題
      showWarningMessage(`繼承人總比例必須等於100%，當前總比例為${totalRatio}%。`);
      return false;
    }

    return true;
  },
  
  // 處理驗證
  handleVerify: () => {
    const { validateForm, closeWarning } = get();
    
    // 關閉任何已開啟的警告
    closeWarning();
    
    // 驗證表單
    if (validateForm()) {
      // 表單驗證通過，顯示儀表板指示器並準備重定向
      console.log("Validated heirs:", get().heirs.map(heir => ({
        email: heir.email,
        ratio: heir.ratio + "%"
      })));
      
      // 隱藏當前卡片，顯示指示器
      set({ 
        showNextCard: false,
        showDashboardIndicator: true
      });
      
      // 延遲後重定向到儀表板
      setTimeout(() => {
        // window.location.href = '/dashboard';
      }, 3000);
      
      return true;
    }
    
    return false;
  }
})));

export default useHeirStore;