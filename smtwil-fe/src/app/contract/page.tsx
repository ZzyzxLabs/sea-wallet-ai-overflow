"use client";
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton, useSuiClient } from "@mysten/dapp-kit";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import useHeirStore from "../../store/heirStore"; // 確保正確引入 store 路徑
import { useRouter } from "next/navigation";
import useMoveStore from "../../store/moveStore"; // 確保正確引入 store 路徑
import { bcs, BcsType } from '@mysten/bcs';

// VecMap 函數，用於序列化鍵值對
function VecMap<K extends BcsType<any>, V extends BcsType<any>>(K: K, V: V) {
  return bcs.struct(
    `VecMap<${K.name}, ${V.name}>`,
    {
      keys: bcs.vector(K),
      values: bcs.vector(V),
    }
  );
}

// 將繼承人分成兩組：使用 Sui 區塊鏈地址和使用電子郵件地址的
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

// 準備繼承人資料為 VecMap 格式
function prepareHeirsForVecMap(heirs, keyField, valueField) {
  return {
    keys: heirs.map(heir => heir[keyField]),
    values: heirs.map(heir => heir[valueField])
  };
}

// 序列化繼承人資料為 VecMap
function serializeHeirsToVecMaps(heirs) {
  // 分離繼承人
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
  
  // 為了便於調試，創建原始數據版本（不序列化）
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

export default function TestingP() {
  const account = useCurrentAccount();
  const router = useRouter();
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
		execute: async ({ bytes, signature }) =>
			await client.executeTransactionBlock({
				transactionBlock: bytes,
				signature,
				options: {
					// Raw effects are required so the effects can be reported back to the wallet
					showRawEffects: true,
					// Select additional data to return
					showObjectChanges: true,
				},
			}),
	});
  
  // 用於儲存前一次繼承人數量的參考，用於動畫效果
  const prevHeirsCountRef = useRef(0);
  // 用於儲存動畫狀態的參考
  const animationInProgressRef = useRef(false);
  // 用於儲存卡片元素的參考
  const cardRef = useRef(null);
  // 新增狀態：追蹤交易階段
  const [showAdditionalTx, setShowAdditionalTx] = useState(false);
  // 儲存從交易中獲取的資料
  const [vaultID, setVaultID] = useState("");
  const [ownerCap, setOwnerCap] = useState("");
  // 跟蹤是否正在處理交易
  const [isProcessing, setIsProcessing] = useState(false);

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
  const { createVaultTx, setCreateVaultTx } = useMoveStore(); // 獲取創建交易的函數
  
  // 處理連接按鈕點擊或自動連接
  const handleConnect = () => {
    setIsConnecting(true);
  };
  
  // 自動檢查帳戶連接狀態並前進
  useEffect(() => {
    if (account && account.address && !isConnecting) {
      console.log("Account already connected:", account.address);
      // 如果帳戶已連接但未進入連接流程，自動進入
      setTimeout(() => {
        setIsConnecting(true);
      }, 100);
    }
  }, [account, isConnecting]);

  // 初始化 createVaultTx 函數
  useEffect(() => {
    // 定義新的 createVaultTx 函數，整合序列化邏輯
    const newCreateVaultTx = () => {
      // 序列化繼承人資料
      const { raw, serialized } = serializeHeirsToVecMaps(heirs);
      
      // 在控制台輸出 VecMap 數據（用於調試）
      console.log("=== 繼承人 VecMap 數據 ===");
      console.log("Sui 繼承人名稱-比例映射:", raw.suiNameRatio);
      console.log("Sui 繼承人地址-比例映射:", raw.suiAddressRatio);
      console.log("Email 繼承人名稱-比例映射:", raw.emailNameRatio);
      console.log("Email 繼承人地址-比例映射:", raw.emailAddressRatio);
      
      // 構建交易物件
      return {
        kind: "moveCall",
        data: {
          packageObjectId: "0x123...", // 需要替換為真實的合約包 ID
          module: "smartwill",
          function: "create_will", 
          typeArguments: [],
          arguments: [
            // 區塊鏈地址繼承人數據
            serialized.suiNameRatio,
            serialized.suiAddressRatio,
            
            // 電子郵件繼承人數據
            serialized.emailNameRatio,
            serialized.emailAddressRatio
          ]
        }
      };
    };
    
    // 更新 store 中的函數
    if (setCreateVaultTx) {
      setCreateVaultTx(newCreateVaultTx);
    }
  }, [heirs, setCreateVaultTx]);

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

  // 創建並執行第一個交易
  const executeTransaction = async () => {
    // 首先進行表單驗證
    if (handleVerify()) {
      try {
        setIsProcessing(true);
        
        // 在執行交易前輸出 VecMap 數據到控制台
        const { raw } = serializeHeirsToVecMaps(heirs);
        console.log("=== 執行交易時的 VecMap 數據 ===");
        console.log("Sui 繼承人:");
        console.table(raw.suiNameRatio);
        console.table(raw.suiAddressRatio);
        console.log("Email 繼承人:");
        console.table(raw.emailNameRatio);
        console.table(raw.emailAddressRatio);
        
        // 執行交易邏輯
        const transactionResult = await signAndExecuteTransaction(
          {
            transaction: createVaultTx(),
            chain: "sui:testnet",
          },
          {
            onSuccess: (result) => {
              console.log("executed transaction", result);
              // Extract vaultID and ownerCap from the transaction result
              const vaultObject = result.objectChanges.find(
                (obj) =>
                  obj.type === "created" &&
                  obj.objectType.includes("::vault::Vault")
              );

              const ownerCapObject = result.objectChanges.find(
                (obj) =>
                  obj.type === "created" &&
                  obj.objectType.includes("::vault::OwnerCap")
              );

              if (vaultObject && ownerCapObject) {
                const vaultIDFromTx = vaultObject.objectId;
                const ownerCapFromTx = ownerCapObject.objectId;

                console.log("Vault ID:", vaultIDFromTx);
                console.log("Owner Cap:", ownerCapFromTx);

                // 儲存這些值以便後續使用
                setVaultID(vaultIDFromTx);
                setOwnerCap(ownerCapFromTx);
              } else {
                console.error("Failed to retrieve Vault ID or Owner Cap from the result.");
              }
              
              // 交易成功後，顯示額外交易卡片而不是直接進入儀表板
              setTimeout(() => {
                setShowNextCard(false);
                setShowAdditionalTx(true);
                setIsProcessing(false);
              }, 100);
            },
            onError: (error) => {
              console.error("Transaction error:", error);
              // 顯示交易錯誤訊息
              showWarningMessage("交易執行失敗: " + error.message);
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

  // 創建自定義交易A - 執行某種操作
  const executeCustomTxA = async () => {
    try {
      setIsProcessing(true);
      
      // 這裡可以使用您的 vaultID 和 ownerCap 創建另一個交易
      const tx = new zkTransaction()
      
      const result = await signAndExecuteTransaction(
        {
          transaction: customTransaction,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("executed custom transaction A", result);
            // 進入儀表板
            setTimeout(() => {
              setShowAdditionalTx(false);
              setShowDashboardIndicator(true);
              setIsProcessing(false);
            }, 100);
          },
          onError: (error) => {
            console.error("Custom transaction A error:", error);
            showWarningMessage("自定義交易 A 執行失敗: " + error.message);
            setIsProcessing(false);
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error("Custom transaction A execution error:", error);
      showWarningMessage("自定義交易 A 執行錯誤: " + error.message);
      setIsProcessing(false);
    }
  };

  // 創建自定義交易B - 執行另一種操作
  const executeCustomTxB = async () => {
    try {
      setIsProcessing(true);
      
      // 這裡可以使用您的 vaultID 和 ownerCap 創建另一個交易
      const customTransaction = {
        kind: "moveCall",
        data: {
          packageObjectId: "0x123...",
          module: "smartwill",
          function: "add_different_feature", 
          typeArguments: [],
          arguments: [
            // 您可以將之前交易獲得的 ID 傳入此處
            vaultID,
            ownerCap,
            // 其他參數...
          ]
        }
      };
      
      const result = await signAndExecuteTransaction(
        {
          transaction: customTransaction,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("executed custom transaction B", result);
            // 進入儀表板
            setTimeout(() => {
              setShowAdditionalTx(false);
              setShowDashboardIndicator(true);
              setIsProcessing(false);
            }, 100);
          },
          onError: (error) => {
            console.error("Custom transaction B error:", error);
            showWarningMessage("自定義交易 B 執行失敗: " + error.message);
            setIsProcessing(false);
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error("Custom transaction B execution error:", error);
      showWarningMessage("自定義交易 B 執行錯誤: " + error.message);
      setIsProcessing(false);
    }
  };


  // 檢查地址類型
  const getAddressType = (address) => {
    if (address && address.startsWith("0x") && !address.includes("@")) {
      return "sui";
    } else if (address && address.includes("@")) {
      return "email";
    }
    return "";
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
        <p className="text-xl text-gray-700 mb-4">Let&apos;s get started.</p>
      </div>

      {/* 第三張卡片 - 設置繼承人 */}
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
          {heirs.map((heir, index) => {
            const addressType = getAddressType(heir.address);
            
            return (
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
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={handleAddHeir}
            className="p-2 bg-secondary text-slate-800 rounded hover:bg-secondary-dark transition"
          >
            Add heir
          </button>
          <button
            className={`p-2 bg-green-500 text-white rounded hover:bg-green-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onClick={executeTransaction}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                處理中...
              </>
            ) : (
              "Verify"
            )}
          </button>
        </div>

        {/* 顯示目前總比例 */}
        <div className="mt-4">
          <p className="text-gray-700">
            Current total ratio: {getTotalRatio()}%
          </p>
        </div>
        
        {/* 繼承人類型統計 */}
        <div className="mt-2 text-sm text-gray-500">
          {(() => {
            const { suiAddressHeirs, emailHeirs } = separateHeirsByAddressType(heirs);
            return (
              <>
                <span>Sui 地址繼承人: {suiAddressHeirs.length}</span>
                <span className="mx-2">|</span>
                <span>電子郵件繼承人: {emailHeirs.length}</span>
              </>
            );
          })()}
        </div>
      </div>

      {/* 新增：額外交易卡片 */}
      <div
        className={`bg-primary p-8 rounded-lg shadow-lg transition-all duration-500 ease-in-out transform absolute w-full max-w-3xl
                    ${
                      showAdditionalTx
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-20 pointer-events-none"
                    }`}
      >
        <h2 className="text-2xl font-bold mb-4">Send Capabilities to heirs.</h2>
        <p className="mb-6 text-gray-700">
          Your WiLL has been established. Now to notify and send Capability to the heirs.
        </p>
        
        {/* 交易 ID 資訊 */}
        <div className="mb-6 p-4 bg-gray-100 rounded-lg">
          <p className="text-gray-700"><strong>Vault ID:</strong> {vaultID ? formatAddress(vaultID) : "Not available"}</p>
          <p className="text-gray-700"><strong>Owner Cap:</strong> {ownerCap ? formatAddress(ownerCap) : "Not available"}</p>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
          {/* 左側按鈕 */}
          <div className="w-full md:w-1/2">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 h-full">
              <h3 className="font-bold text-lg mb-2 text-blue-800">Send Caps with Email</h3>

              <button
                onClick={executeCustomTxA}
                className={`w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    處理中...
                  </>
                ) : (
                  "Send Via zksend"
                )}
              </button>
            </div>
          </div>
          
          {/* 右側按鈕 */}
          <div className="w-full md:w-1/2">
            <div className="p-4 border border-purple-200 rounded-lg bg-purple-50 h-full">
              <h3 className="font-bold text-lg mb-2 text-purple-800">Option B</h3>
              <p className="text-gray-700 mb-4">
                Enable automatic asset distribution features for your SmartWill.
                This allows your assets to be distributed according to predefined rules.
              </p>
              <button
                onClick={executeCustomTxB}
                className={`w-full p-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className="inline-block animate-spin mr-2">⟳</span>
                    處理中...
                  </>
                ) : (
                  "Enable Auto-Distribution"
                )}
              </button>
            </div>
          </div>
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