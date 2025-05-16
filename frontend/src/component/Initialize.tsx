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

  // 自定義連接按鈕樣式
  const CustomConnectButton = () => (
    <div className="relative group">
      <ConnectButton className="relative z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-cyan-300 to-teal-400 rounded-md blur opacity-75 group-hover:opacity-100 transition-opacity duration-300"></div>
    </div>
  );

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-b from-blue-800 to-blue-900 overflow-hidden relative">
      {/* 海洋背景元素 */}
      <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none">
        {/* 浮動泡泡 */}
        <div className="absolute h-20 w-20 rounded-full bg-white opacity-5 blur-lg animate-float-slow" style={{top: '15%', left: '10%'}}></div>
        <div className="absolute h-14 w-14 rounded-full bg-white opacity-5 blur-lg animate-float-medium" style={{top: '45%', left: '20%'}}></div>
        <div className="absolute h-10 w-10 rounded-full bg-white opacity-5 blur-lg animate-float-fast" style={{top: '70%', left: '15%'}}></div>
        <div className="absolute h-16 w-16 rounded-full bg-white opacity-5 blur-lg animate-float-medium" style={{top: '20%', right: '15%'}}></div>
        <div className="absolute h-12 w-12 rounded-full bg-white opacity-5 blur-lg animate-float-slow" style={{top: '60%', right: '12%'}}></div>
        
        {/* 波浪效果 */}
        <div className="absolute bottom-0 left-0 right-0 h-64">
          <div 
            className="absolute inset-0 bg-[url('/images/wave-1.svg')] bg-repeat-x h-24" 
            style={{backgroundPosition: `${wavesPosition}% bottom`, backgroundSize: '100px 100%'}}
          ></div>
          <div 
            className="absolute inset-0 bg-[url('/images/wave-2.svg')] bg-repeat-x h-32 mt-4" 
            style={{backgroundPosition: `${100 - wavesPosition}% bottom`, backgroundSize: '120px 100%'}}
          ></div>
        </div>
      </div>

      {/* 主標題 */}
      <div className="absolute top-10 left-0 right-0 text-center pointer-events-none">
        <h1 className="text-5xl font-bold text-white mb-2 tracking-wide">
          <span className="inline-block mr-2">
            <Image src="/RMBGlogo.png" width={40} height={40} alt="Anchor" className="inline-block" />
          </span>
          SeaVault
        </h1>
        <p className="text-blue-200 text-xl">保護您的數字資產，守護您的航程</p>
      </div>

      {/* 連接卡片 - 未連接狀態 */}
      <div
        className={`bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md p-10 rounded-2xl shadow-[0_10px_50px_rgba(8,107,181,0.5)] transition-all duration-700 ease-in-out transform relative z-10
                    ${
                      isConnecting
                        ? "opacity-0 -translate-y-20 pointer-events-none"
                        : "opacity-100 translate-y-0"
                    }`}
      >
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-cyan-500 to-blue-500 p-3 rounded-full shadow-lg">
          <div className="w-10 h-10 flex items-center justify-center">
            <Image src="/RMBGlogo.png" width={24} height={24} alt="Wallet" />
          </div>
        </div>
        
        <h1 className="text-4xl text-gray-800 font-bold mb-6 text-center mt-4">
          建立您的數字遺產
        </h1>
        <p className="text-xl text-gray-600 mb-8 text-center">連接您的錢包，開始規劃您的數字資產傳承</p>
        <div className="flex justify-center mt-2" onClick={handleConnect}>
          <CustomConnectButton />
        </div>
        
        <div className="mt-8 flex justify-center items-center">
          <div className="flex space-x-3 text-sm text-gray-500">
            <div className="flex items-center">
              <div className="w-5 h-5 mr-2 flex items-center justify-center">
                <Image src="/RMBGlogo.png" width={16} height={16} alt="Security" />
              </div>
              <span>安全加密</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 mr-2 flex items-center justify-center">
                <Image src="/RMBGlogo.png" width={16} height={16} alt="Privacy" />
              </div>
              <span>私密保護</span>
            </div>
            <div className="flex items-center">
              <div className="w-5 h-5 mr-2 flex items-center justify-center">
                <Image src="/RMBGlogo.png" width={16} height={16} alt="Blockchain" />
              </div>
              <span>區塊鏈技術</span>
            </div>
          </div>
        </div>
      </div>

      {/* 歡迎卡片 - 已連接狀態 */}
      <div
        className={`bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md p-10 rounded-2xl shadow-[0_10px_50px_rgba(8,107,181,0.5)] transition-all duration-700 ease-in-out transform relative z-10
                    ${
                      account && showWelcome
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-20 pointer-events-none"
                    }`}
      >
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-teal-500 to-cyan-500 p-3 rounded-full shadow-lg">
          <div className="w-10 h-10 flex items-center justify-center">
            <Image src="/RMBGlogo.png" width={24} height={24} alt="Welcome" />
          </div>
        </div>
        
        <h1 className="text-4xl text-gray-800 font-bold mb-6 text-center mt-4">
          歡迎，{formatAddress(account?.address)}
        </h1>
        <div className="text-center mb-4">
          <div className="inline-block p-2 px-4 bg-blue-100 rounded-full text-blue-800 text-sm font-medium">
            錢包已連接
          </div>
        </div>
        <p className="text-xl text-gray-600 text-center">準備開始您的數字遺產規劃之旅</p>

        {/* 進度指示器 */}
        <div className="mt-8 flex justify-center">
          <div className="relative w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div className="absolute left-0 top-0 h-full w-1/3 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent to-white/30 animate-pulse"></div>
            </div>
          </div>
        </div>
        <div className="mt-2 text-xs text-center text-gray-500">
          資料正在加載中...
        </div>
      </div>

      {/* 第三張卡片 - 設置繼承人 */}
      {showNextCard && (
        <div className="w-full max-w-2xl px-4">
          <div className="relative transform transition-all duration-500 ease-in-out z-10">
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-cyan-600 p-3 rounded-full shadow-lg">
              <div className="w-10 h-10 flex items-center justify-center">
                <Image src="/RMBGlogo.png" width={24} height={24} alt="Heirs" />
              </div>
            </div>
            
            <HeirCard
              heirs={heirs}
              addHeir={addHeir}
              removeHeir={removeHeir}
              updateHeir={updateHeir}
              getTotalRatio={getTotalRatio}
              handleVerify={executeTransaction}
              isProcessing={isProcessing}
              // 傳遞額外屬性以支持新的海洋主題樣式
              theme={{
                cardClassName: "bg-gradient-to-br from-white/90 to-white/80 backdrop-blur-md p-8 rounded-2xl shadow-[0_10px_50px_rgba(8,107,181,0.5)]",
                buttonClassName: "bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-medium py-2 px-6 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg",
                inputClassName: "w-full px-4 py-3 border border-blue-200 focus:border-blue-500 rounded-lg bg-white/90 backdrop-blur-sm focus:ring-2 focus:ring-blue-200 transition-all duration-300",
                heirItemClassName: "bg-gradient-to-r from-white/60 to-white/40 backdrop-blur-sm rounded-xl p-5 mb-4 border border-blue-100 shadow-sm hover:shadow-md transition-all duration-300",
                removeButtonClassName: "text-red-500 hover:text-red-700 transition-colors duration-300",
                titleClassName: "text-3xl text-gray-800 font-bold text-center mb-8 mt-4"
              }}
            />
          </div>
        </div>
      )}

      {/* 改進後的警告/消息對話框 */}
      {showWarning && (
        <div className="fixed inset-0 bg-blue-900/70 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-0 overflow-hidden transform animate-scaleIn">
            <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-4">
              <h3 className="text-xl font-bold text-white">系統消息</h3>
            </div>
            <div className="p-6">
              <p className="text-gray-700 mb-6">{warningMessage}</p>
              <div className="flex justify-end">
                <button
                  className="px-6 py-2 bg-gradient-to-r from-blue-600 to-cyan-600 text-white rounded-lg hover:from-blue-700 hover:to-cyan-700 transition-all duration-300 shadow-md hover:shadow-lg"
                  onClick={closeWarning}
                >
                  確定
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 頁腳 */}
      <div className="absolute bottom-4 left-0 right-0 text-center text-blue-200 text-xs">
        <p>© 2025 SeaVault. 守護您的數字海域。 帶著信任航行。</p>
      </div>
    </div>
  );
}