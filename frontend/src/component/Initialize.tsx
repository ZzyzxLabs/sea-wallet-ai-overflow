// frontend/src/component/InitializeContract.tsx
"use client";
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton, useSuiClient } from "@mysten/dapp-kit";
import { useCurrentAccount, useSignAndExecuteTransaction } from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import useHeirStore from "../store/heirStore"; 
import { useRouter } from "next/navigation";
import useMoveStore from "../store/moveStore";
import { bcs, BcsType } from '@mysten/bcs';
import HeirCard from "./HeirCard";
import Image from "next/image";
import "../styles/InitializeContract.css"; // 引入 CSS 樣式

// VecMap 函數用於序列化鍵值對 (保持不變)
function VecMap<K extends BcsType<any>, V extends BcsType<any>>(K: K, V: V) {
  return bcs.struct(
    `VecMap<${K.name}, ${V.name}>`,
    {
      keys: bcs.vector(K),
      values: bcs.vector(V),
    }
  );
}

// 其他輔助函數保持不變
function separateHeirsByAddressType(heirs) {
  const suiAddressHeirs = [];
  const emailHeirs = [];
  
  heirs.forEach(heir => {
    if (heir.address && heir.address.startsWith("0x") && !heir.address.includes("@")) {
      suiAddressHeirs.push({...heir});
    } else {
      emailHeirs.push({...heir});
    }
  });
  
  return {
    suiAddressHeirs,
    emailHeirs
  };
}

function prepareHeirsForVecMap(heirs, keyField, valueField) {
  return {
    keys: heirs.map(heir => heir[keyField]),
    values: heirs.map(heir => heir[valueField])
  };
}

function serializeHeirsToVecMaps(heirs) {
  // 分隔繼承人
  const { suiAddressHeirs, emailHeirs } = separateHeirsByAddressType(heirs);
  
  // 準備 Sui 地址繼承人的 VecMap 數據
  const suiNameRatioMap = {
    keys: suiAddressHeirs.map(heir => heir.name),
    values: suiAddressHeirs.map(heir => heir.ratio)
  };
  
  const suiAddressRatioMap = {
    keys: suiAddressHeirs.map(heir => heir.address),
    values: suiAddressHeirs.map(heir => heir.ratio)
  };
  
  // 準備電子郵件繼承人的 VecMap 數據
  const emailNameRatioMap = {
    keys: emailHeirs.map(heir => heir.name),
    values: emailHeirs.map(heir => heir.ratio)
  };
  
  const emailAddressRatioMap = {
    keys: emailHeirs.map(heir => heir.address),
    values: emailHeirs.map(heir => heir.ratio)
  };
  
  // 為調試創建原始數據版本（未序列化）
  const rawData = {
    suiNameRatio: suiNameRatioMap,
    suiAddressRatio: suiAddressRatioMap,
    emailNameRatio: emailNameRatioMap,
    emailAddressRatio: emailAddressRatioMap
  };
  
  // 序列化數據
  const serializedData = {
    suiNameRatio: VecMap(bcs.string(), bcs.string())
      .serialize(suiNameRatioMap)
      .toBytes(),
      
    suiAddressRatio: VecMap(bcs.string(), bcs.string())
      .serialize(suiAddressRatioMap)
      .toBytes(),
      
    emailNameRatio: VecMap(bcs.string(), bcs.string())
      .serialize(emailNameRatioMap)
      .toBytes(),
      
    emailAddressRatio: VecMap(bcs.string(), bcs.string())
      .serialize(emailAddressRatioMap)
      .toBytes()
  };
  
  return {
    raw: rawData,
    serialized: serializedData
  };
}

export default function InitializeContract() {
  const account = useCurrentAccount();
  const router = useRouter();
  const client = useSuiClient();
  const setAddress = useMoveStore((s) => s.setAddress);
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showObjectChanges: true,
        },
      }),
  });
  
  // 存儲先前繼承人數量和動畫狀態的 ref
  const prevHeirsCountRef = useRef(0);
  const animationInProgressRef = useRef(false);
  const cardRef = useRef(null);
  
  // 狀態管理
  const [vaultID, setVaultID] = useState("");
  const [ownerCap, setOwnerCap] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [wavesPosition, setWavesPosition] = useState(0);

  // 從 Zustand store 獲取狀態和方法
  const {
    isConnecting,
    showWelcome,
    showNextCard,
    showWarning,
    warningMessage,
    heirs,
    setIsConnecting,
    setShowWelcome,
    setShowNextCard,
    closeWarning,
    addHeir,
    removeHeir,
    updateHeir,
    getTotalRatio,
    handleVerify,
    showWarningMessage,
  } = useHeirStore();
  
  const { createVaultTx } = useMoveStore();
  
  // 處理連接按鈕點擊
  const handleConnect = () => {
    setIsConnecting(true);
  };
  
  // 自動檢查帳戶連接狀態
  useEffect(() => {
    if (account && account.address && !isConnecting) {
      console.log("Account already connected:", account.address);
      setTimeout(() => {
        setIsConnecting(true);
      }, 100);
    }
  }, [account, isConnecting]);

  useEffect(() => {
    if (account) {
      setAddress(account.address); 
    }
  }, [account, setAddress]);

  // 監控帳戶狀態變化，控制動畫序列
  useEffect(() => {
    if (account && isConnecting) {
      const timerShowWelcome = setTimeout(() => {
        setShowWelcome(true);

        const timerNextCard = setTimeout(() => {
          setShowWelcome(false);

          setTimeout(() => {
            setShowNextCard(true);
          }, 500);
        }, 3000);

        return () => clearTimeout(timerNextCard);
      }, 500);

      return () => clearTimeout(timerShowWelcome);
    }
  }, [account, isConnecting, setShowWelcome, setShowNextCard]);

  // 波浪背景動畫
  useEffect(() => {
    const waveAnimation = setInterval(() => {
      setWavesPosition(prev => (prev + 1) % 100);
    }, 50);
    
    return () => clearInterval(waveAnimation);
  }, []);

  // 監控繼承人數量變化，控制卡片動畫
  useEffect(() => {
    if (heirs.length !== prevHeirsCountRef.current && !animationInProgressRef.current) {
      animationInProgressRef.current = true;
      
      requestAnimationFrame(() => {
        if (heirs.length > prevHeirsCountRef.current) {
          if (cardRef.current) {
            // 卡片展開動畫
            cardRef.current.style.transition = 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight + 80}px`;
            
            // 尋找新添加的繼承人字段
            const newHeirElements = document.querySelectorAll('[data-heir-id]');
            const newHeirElement = newHeirElements[newHeirElements.length - 1];
            
            if (newHeirElement) {
              // 設置動畫初始狀態
              newHeirElement.style.opacity = '0';
              newHeirElement.style.transform = 'translateY(15px)';
              
              // 強制瀏覽器重繪
              void newHeirElement.offsetWidth;
              
              // 開始元素動畫
              setTimeout(() => {
                newHeirElement.style.transition = 'opacity 0.5s cubic-bezier(0.4, 0, 0.2, 1), transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
                newHeirElement.style.opacity = '1';
                newHeirElement.style.transform = 'translateY(0)';
              }, 50);
            }
            
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 500);
          }
        } else {
          // 移除繼承人時縮小動畫
          if (cardRef.current) {
            cardRef.current.style.transition = 'max-height 0.5s cubic-bezier(0.4, 0, 0.2, 1)';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight}px`;
            
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 500);
          } else {
            animationInProgressRef.current = false;
          }
        }
        
        // 更新繼承人數量
        prevHeirsCountRef.current = heirs.length;
      });
    }
  }, [heirs.length]);

  // 處理添加繼承人
  const handleAddHeir = () => {
    if (animationInProgressRef.current) return;
    addHeir();
  };

  // 格式化地址顯示
  const formatAddress = (address) => {
    if (!address) return "User";
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  // 創建並執行第一個交易
  const executeTransaction = async () => {
    // 表單驗證
    if (handleVerify()) {
      try {
        setIsProcessing(true);
        
        // 輸出數據到控制台
        const { raw } = serializeHeirsToVecMaps(heirs);
        console.log("=== VecMap data at transaction execution ===");
        console.log("Sui heirs:");
        console.table(raw.suiNameRatio);
        console.table(raw.suiAddressRatio);
        console.log("Email heirs:");
        console.table(raw.emailNameRatio);
        console.table(raw.emailAddressRatio);
        
        // 執行交易
        const transactionResult = await signAndExecuteTransaction(
          {
            transaction: createVaultTx(),
            chain: "sui:testnet",
          },
          {
            onSuccess: (result) => {
              console.log("executed transaction", result);
              // 從交易結果中提取 vaultID 和 ownerCap
              const vaultObject = result.objectChanges.find(
                (obj) =>
                  obj.type === "created" &&
                  obj.objectType.includes("::seaVault::SeaVault")
              );
              const ownerCapObject = result.objectChanges.find(
                (obj) =>
                  obj.type === "created" &&
                  obj.objectType.includes("::seaVault::OwnerCap")
              );

              if (vaultObject && ownerCapObject) {
                const vaultIDFromTx = vaultObject.objectId;
                const ownerCapFromTx = ownerCapObject.objectId;

                console.log("Vault ID:", vaultIDFromTx);
                console.log("Owner Cap:", ownerCapFromTx);

                // 保存值以供後續使用
                setVaultID(vaultIDFromTx);
                setOwnerCap(ownerCapFromTx);
                
                // 將 vaultID 和 ownerCap 存儲到 localStorage，以便在其他頁面使用
                localStorage.setItem('vaultID', vaultIDFromTx);
                localStorage.setItem('ownerCap', ownerCapFromTx);
                
                // 顯示成功訊息和動畫
                showSuccessMessage();
                
                // 延遲後重定向到儀表板頁面
                setTimeout(() => {
                  router.push(`/dashboard?vault=${vaultIDFromTx}&owner=${ownerCapFromTx}`);
                }, 2000);
              } else {
                console.error("Failed to retrieve Vault ID or Owner Cap from the result.");
                showWarningMessage("無法從交易結果中獲取金庫信息。");
              }
              
              setIsProcessing(false);
            },
            onError: (error) => {
              console.error("Transaction error:", error);
              showWarningMessage("交易失敗: " + error.message);
              setIsProcessing(false);
            }
          }
        );
        
        return transactionResult;
      } catch (error) {
        console.error("Transaction execution error:", error);
        showWarningMessage("交易執行錯誤: " + error.message);
        setIsProcessing(false);
      }
    }
  };

  // 顯示成功訊息
  const showSuccessMessage = () => {
    showWarningMessage("金庫創建成功！正在為您導航到儀表板...");
  };

  const CustomConnectButton = () => (
    <div className="connect-button">
      <ConnectButton />
    </div>
  );

  return (
    <div className="container">
      {/* 海洋背景元素 */}
      <div className="ocean-background">
        <div className="bubble bubble1"></div>
        <div className="bubble bubble2"></div>
        <div className="bubble bubble3"></div>
        <div className="waves">
          <div className="wave1"></div>
          <div className="wave2"></div>
        </div>
      </div>

      {/* 主標題 */}
      <div className="header">
        <h1 className="title">
          <Image src="/RMBGlogo.png" width={36} height={36} alt="Anchor" className="title-logo" />
          <span className="title-text">SeaVault</span>
        </h1>
        <p className="subtitle">保護您的數字資產，守護您的航程</p>
      </div>

      {/* 連接卡片 */}
      <div className={`connect-card ${isConnecting ? 'hidden' : ''}`}>
        <div className="icon">
          <Image src="/RMBGlogo.png" width={24} height={24} alt="Wallet" />
        </div>
        <h1>建立您的數字遺產</h1>
        <p>連接您的錢包，開始規劃您的數字資產傳承</p>
        <div className="connect-button" onClick={handleConnect}>
          <CustomConnectButton />
        </div>
      </div>

      {/* 歡迎卡片 */}
      <div className={`welcome-card ${account && showWelcome ? '' : 'hidden'}`}>
        <div className="icon">
          <Image src="/RMBGlogo.png" width={24} height={24} alt="Welcome" />
        </div>
        <h1>歡迎，{formatAddress(account?.address)}</h1>
        <div className="status">
          <div>錢包已連接</div>
        </div>
        <p>準備開始您的數字遺產規劃之旅</p>
        <div className="progress">
          <div className="progress-bar">
            <div className="fill">
              <div className="pulse"></div>
            </div>
          </div>
        </div>
        <div className="progress-text">資料正在加載中...</div>
      </div>

      {/* 設置繼承人卡片 */}
      {showNextCard && (
        <div className="heir-card">
          <div className="container">
            <div className="icon">
              <Image src="/RMBGlogo.png" width={24} height={24} alt="Heirs" />
            </div>
            <HeirCard
              heirs={heirs}
              addHeir={addHeir}
              removeHeir={removeHeir}
              updateHeir={updateHeir}
              getTotalRatio={getTotalRatio}
              handleVerify={executeTransaction}
              isProcessing={isProcessing}
              theme={{
                cardClassName: "card",
                buttonClassName: "button",
                inputClassName: "input",
                heirItemClassName: "heir-item",
                removeButtonClassName: "remove-button",
                titleClassName: "title"
              }}
            />
          </div>
        </div>
      )}

      {/* 警告對話框 */}
      {showWarning && (
        <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden transform transition-all">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          系統消息
              </h3>
            </div>
            <div className="px-6 py-4">
              <p className="text-sm text-gray-700 dark:text-gray-300">{warningMessage}</p>
            </div>
            <div className="px-6 py-3 bg-gray-50 dark:bg-slate-700 flex justify-end">
              <button 
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          onClick={closeWarning}
              >
          確定
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 頁腳 */}
      <div className="footer">
        <p>© 2025 SeaVault. 守護您的數字海域。帶著信任航行。</p>
      </div>
    </div>
  );
}