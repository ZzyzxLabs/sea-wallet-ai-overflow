"use client";
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton } from "@mysten/dapp-kit";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import useHeirStore from "../../store/heirStore"; // 確保正確引入 store 路徑
import { useRouter } from "next/navigation";
import useMoveStore from "../../store/moveStore"; // 確保正確引入 store 路徑

export default function TestingP() {
  const account = useCurrentAccount();
  const router = useRouter();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction();
  
  // 用於儲存前一次繼承人數量的參考，用於動畫效果
  const prevHeirsCountRef = useRef(0);
  // 用於儲存動畫狀態的參考
  const animationInProgressRef = useRef(false);
  // 用於儲存卡片元素的參考
  const cardRef = useRef(null);

  // 從 Zustand store 獲取狀態和方法
  const {
    isConnecting,
    showWelcome,
    showNextCard,
    showDashboardIndicator,
    showWarning,
    warningMessage,
    heirs,

    setIsConnecting,
    setShowWelcome,
    setShowNextCard,
    setShowDashboardIndicator,
    closeWarning,

    addHeir,
    removeHeir,
    updateHeir,
    getTotalRatio,
    handleVerify,
    showWarningMessage,
  } = useHeirStore();
  const { createVaultTx } = useMoveStore(); // 獲取創建交易的函數
  
  // 處理連接按鈕點擊
  const handleConnect = () => {
    setIsConnecting(true);
  };

  // 監控帳戶狀態變化，控制動畫順序
  useEffect(() => {
    // 如果帳戶存在且正在連接狀態，顯示歡迎卡片
    if (account && isConnecting) {
      // 延遲顯示歡迎卡片，等待第一個卡片完成隱藏動畫
      const timerShowWelcome = setTimeout(() => {
        setShowWelcome(true);

        // 歡迎卡片顯示3秒後，切換到下一張卡片
        const timerNextCard = setTimeout(() => {
          setShowWelcome(false);

          // 確保歡迎卡片消失動畫完成後再顯示下一張
          setTimeout(() => {
            setShowNextCard(true);
          }, 500);
        }, 3000);

        return () => clearTimeout(timerNextCard);
      }, 500); // 與第一個卡片消失動畫持續時間相匹配

      return () => clearTimeout(timerShowWelcome);
    }
  }, [account, isConnecting, setShowWelcome, setShowNextCard]);

  // 處理儀表板重定向
  useEffect(() => {
    if (showDashboardIndicator) {
      const timer = setTimeout(() => {
        router.push("/dashboard");
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [showDashboardIndicator, router]);

  // 監控繼承人數量變化，控制卡片動畫
  useEffect(() => {
    // 檢查繼承人數量是否發生變化
    if (heirs.length !== prevHeirsCountRef.current && !animationInProgressRef.current) {
      // 標記動畫正在進行中
      animationInProgressRef.current = true;
      
      // 使用 requestAnimationFrame 確保在下一幀動畫同步執行
      requestAnimationFrame(() => {
        // 如果是增加繼承人（添加動畫）
        if (heirs.length > prevHeirsCountRef.current) {
          if (cardRef.current) {
            // 同時執行卡片擴展和新元素出現的動畫
            
            // 1. 卡片擴展
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight + 80}px`;
            
            // 2. 立即找到最新添加的繼承人欄位
            const newHeirElements = document.querySelectorAll('[data-heir-id]');
            const newHeirElement = newHeirElements[newHeirElements.length - 1];
            
            if (newHeirElement) {
              // 設置初始狀態
              newHeirElement.style.opacity = '0';
              newHeirElement.style.transform = 'translateY(15px)';
              
              // 強制瀏覽器重繪
              void newHeirElement.offsetWidth;
              
              // 延遲很短的時間後開始元素動畫（比卡片擴展稍晚一點，但幾乎同時）
              setTimeout(() => {
                newHeirElement.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
                newHeirElement.style.opacity = '1';
                newHeirElement.style.transform = 'translateY(0)';
              }, 50);
            }
            
            // 動畫結束後重置標記
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 400);
          }
        } else {
          // 如果是刪除繼承人（收縮動畫）
          if (cardRef.current) {
            // 平滑收縮卡片
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight}px`;
            
            // 動畫結束後重置標記
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 350);
          } else {
            animationInProgressRef.current = false;
          }
        }
        
        // 更新前一次繼承人數量
        prevHeirsCountRef.current = heirs.length;
      });
    }
  }, [heirs.length]);

  // 處理添加繼承人的點擊，封裝原有邏輯並添加動畫預備
  const handleAddHeir = () => {
    // 如果有動畫正在進行中，則不執行
    if (animationInProgressRef.current) return;
    
    // 執行原始的添加繼承人函數
    addHeir();
  };

  // 格式化地址顯示
  const formatAddress = (address) => {
    if (!address) return "User";
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  // 執行交易並驗證
  const executeTransaction = async () => {
    // 首先進行表單驗證
    if (handleVerify()) {
      try {
        // 先執行交易邏輯
        const transactionResult = await signAndExecuteTransaction(
          {
            transaction: createVaultTx(),
            chain: "sui:testnet",
          },
          {
            onSuccess: (result) => {
              console.log("executed transaction", result);
              // 交易成功後，再改變界面狀態
              setTimeout(() => {
                setShowNextCard(false);
                setShowDashboardIndicator(true);
              }, 100);
            },
            onError: (error) => {
              console.error("Transaction error:", error);
              // 顯示交易錯誤訊息
              showWarningMessage("交易執行失敗: " + error.message);
              // Debug: 交易失敗後，仍然改變界面狀態
              setTimeout(() => {
                setShowNextCard(false);
                setShowDashboardIndicator(true);
              }, 100);
            }
          }
        );
        
        // 成功完成交易才進行UI轉換
        return transactionResult;
      } catch (error) {
        console.error("Transaction execution error:", error);
        showWarningMessage("交易執行錯誤: " + error.message);
      }
    } else {
      // 驗證失敗時，不做卡片切換
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 overflow-hidden relative">
      {/* 連接卡片 - 未連接狀態 */}
      <div
        className={`bg-primary p-8 rounded-lg shadow-none hover:shadow-lg transition-all duration-500 ease-in-out transform absolute
                    ${
                      isConnecting
                        ? "opacity-0 -translate-y-20 pointer-events-none"
                        : "opacity-100 translate-y-0"
                    }`}
      >
        <h1 className="text-4xl text-black font-bold mb-8">
          Establish your SmartWill.
        </h1>
        <p className="text-xl text-gray-700 mb-4">First, let us</p>
        <div onClick={handleConnect}>
          <ConnectButton />
        </div>
      </div>

      {/* 歡迎卡片 - 已連接狀態 */}
      <div
        className={`bg-primary p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out transform absolute
                    ${
                      account && showWelcome
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-20 pointer-events-none"
                    }`}
      >
        <h1 className="text-4xl text-black font-bold mb-8">
          Welcome, {formatAddress(account?.address)}
        </h1>
        <p className="text-xl text-gray-700 mb-4">Let's get started.</p>
      </div>

      {/* 第三張卡片 - 下一步 */}
      <div
        ref={cardRef}
        className={`bg-primary p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out transform absolute w-full max-w-3xl overflow-hidden
                    ${
                      showNextCard
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-20 pointer-events-none"
                    }`}
        style={{ maxHeight: '2000px' }} // 初始設置一個較大的最大高度
      >
        <h2 className="text-2xl font-bold mb-4">Tell us about your plan</h2>

        <div className="space-y-4">
          {heirs.map((heir, index) => (
            <div 
              key={heir.id} 
              className="grid grid-cols-3 gap-4 items-center"
              data-heir-id={heir.id}
              style={{
                opacity: index < prevHeirsCountRef.current ? 1 : 0,
                transform: index < prevHeirsCountRef.current ? 'translateY(0)' : 'translateY(15px)',
                transition: 'opacity 0.35s ease-out, transform 0.35s ease-out'
              }}
            >
              <input
                type="text"
                className="p-2 border rounded required"
                placeholder="Heir Name"
                value={heir.name}
                onChange={(e) => updateHeir(heir.id, "name", e.target.value)}
              />
              <div className="flex items-center space-x-2">
                <div className="mr-2 transition-all duration-300">
                  <img
                    src={
                      heir.address && heir.address.startsWith("0x") && !heir.address.includes("@") 
                        ? "./sui.svg"
                        : "./mail-142.svg"
                    }
                    alt={
                      heir.address && heir.address.startsWith("0x") && !heir.address.includes("@")
                        ? "Sui Address"
                        : "Email Address"
                    }
                    className="w-4 h-4 transition-opacity duration-300"
                  />
                </div>
                <input
                  type="text"
                  className="p-2 border rounded required transition-colors duration-300"
                  placeholder="Address"
                  value={heir.address}
                  onChange={(e) =>
                    updateHeir(heir.id, "address", e.target.value)
                  }
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  className="p-2 border rounded flex-grow required"
                  placeholder="Property Ratio"
                  value={heir.ratio}
                  onChange={(e) => updateHeir(heir.id, "ratio", e.target.value)}
                  onKeyDown={(e) => {
                    // 防止輸入負號
                    if (e.key === "-") {
                      e.preventDefault();
                    }
                  }}
                />
                <button
                  onClick={() => removeHeir(heir.id)}
                  className="p-2 text-red-500"
                  disabled={heirs.length <= 1}
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleAddHeir}
            className="p-2 bg-secondary text-slate-800 rounded hover:bg-secondary-dark transition"
          >
            Add heir
          </button>
          <button
            className="p-2 bg-green-500 text-white rounded hover:bg-green-600 transition"
            onClick={executeTransaction}
          >
            Verify
          </button>
        </div>

        {/* 顯示目前總比例 */}
        <div className="mt-4">
          <p className="text-gray-700">
            Current total ratio: {getTotalRatio()}%
          </p>
        </div>
      </div>

      {/* 下一頁指示器 - 在驗證成功後顯示 */}
      <div
        className={`bg-primary p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out transform absolute
                                    ${
                                      showDashboardIndicator
                                        ? "opacity-100 translate-y-0"
                                        : "opacity-0 translate-y-20 pointer-events-none"
                                    }`}
      >
        <h1 className="text-4xl text-black font-bold mb-8">
          Your Will has been established.
        </h1>
        <p className="text-xl text-gray-700 mb-4">Launching Dashboard.</p>
        {/* 進度指示器 */}
        <div className="flex justify-center mt-6">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </div>

      {/* 警告視窗 */}
      {showWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-xl font-bold text-red-600 mb-4">Warning</h3>
            <p className="text-gray-800 mb-6">{warningMessage}</p>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                onClick={closeWarning}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}