"use client";
import "@mysten/dapp-kit/dist/index.css";
import { ConnectButton, useSuiClient } from "@mysten/dapp-kit";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useState, useEffect, useRef } from "react";
import useHeirStore from "../../store/heirStore"; 
import { useRouter } from "next/navigation";
import useMoveStore from "../../store/moveStore";
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
          showRawEffects: true,
          showObjectChanges: true,
        },
      }),
  });
  
  // 用於儲存前一次繼承人數量和動畫狀態的參考
  const prevHeirsCountRef = useRef(0);
  const animationInProgressRef = useRef(false);
  const cardRef = useRef(null);
  
  // 狀態管理
  const [showAdditionalTx, setShowAdditionalTx] = useState(false);
  const [vaultID, setVaultID] = useState("");
  const [ownerCap, setOwnerCap] = useState("");
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
  
  const { createVaultTx, zkTransaction, mintCap } = useMoveStore();
  
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
    // 監控帳戶狀態變化，控制動畫順序
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
    if (heirs.length !== prevHeirsCountRef.current && !animationInProgressRef.current) {
      animationInProgressRef.current = true;
      
      requestAnimationFrame(() => {
        if (heirs.length > prevHeirsCountRef.current) {
          if (cardRef.current) {
            // 卡片擴展動畫
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight + 80}px`;
            
            // 找到最新添加的繼承人欄位
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
                newHeirElement.style.transition = 'opacity 0.35s ease-out, transform 0.35s ease-out';
                newHeirElement.style.opacity = '1';
                newHeirElement.style.transform = 'translateY(0)';
              }, 50);
            }
            
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 400);
          }
        } else {
          // 刪除繼承人的收縮動畫
          if (cardRef.current) {
            cardRef.current.style.transition = 'max-height 0.3s ease-out';
            cardRef.current.style.maxHeight = `${cardRef.current.scrollHeight}px`;
            
            setTimeout(() => {
              animationInProgressRef.current = false;
            }, 350);
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
        console.log("=== 執行交易時的 VecMap 數據 ===");
        console.log("Sui 繼承人:");
        console.table(raw.suiNameRatio);
        console.table(raw.suiAddressRatio);
        console.log("Email 繼承人:");
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

                // 儲存值以便後續使用
                setVaultID(vaultIDFromTx);
                setOwnerCap(ownerCapFromTx);
              } else {
                console.error("Failed to retrieve Vault ID or Owner Cap from the result.");
              }
              
              // 交易成功後，顯示額外交易卡片
              setTimeout(() => {
                setShowNextCard(false);
                setShowAdditionalTx(true);
                setIsProcessing(false);
              }, 100);
            },
            onError: (error) => {
              console.error("Transaction error:", error);
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

  // 創建自定義交易A - 發送能力給繼承人
  const executeCustomTxA = async () => {
    try {
      setIsProcessing(true);
      console.log("Current account address:", account.address);
      
      const { tx, urls } = await zkTransaction(
        account.address, 
        "testnet", 
        "0x0bfe782ef43671d52cb51303e1cc63b7eac6de46e46eb346defa168822f9c8ea", 
        1
      );
      
      console.log("Generated URLs:", urls);
      console.log("Transaction object:", tx);
      
      // 使用轉換後的交易對象執行交易
      const result = signAndExecuteTransaction(
        {
          transaction:tx ,  // 現在 tx 是一個 TransactionBlock 實例
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("執行自定義交易 A 成功:", result);
            
            // 顯示成功訊息
            showWarningMessage("交易成功完成！");
            
            // 延遲轉換到下一步
            setTimeout(() => {
              setShowAdditionalTx(false);
              setShowDashboardIndicator(true);
              setIsProcessing(false);
            }, 100);
          },
          onError: (error) => {
            console.error("自定義交易 A 錯誤:", error);
            showWarningMessage("自定義交易 A 執行失敗: " + error.message);
            setIsProcessing(false);
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error("自定義交易 A 執行錯誤:", error);
      showWarningMessage("自定義交易 A 執行錯誤: " + (error.message || String(error)));
      setIsProcessing(false);
    }
  };

  // 創建自定義交易B - 啟用自動分配功能
  const executeCustomTxB = async () => {
    try {
      setIsProcessing(true);
      
      const customTransaction = {
        kind: "moveCall",
        data: {
          packageObjectId: "0x123...", // 需替換為實際合約包ID
          module: "smartwill",
          function: "add_different_feature", 
          typeArguments: [],
          arguments: [
            vaultID,
            ownerCap,
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

  // 鑄造能力 (Mint Caps) 函數
  const mintCaps = async () => {
    try {
      setIsProcessing(true);
      
      // 正確分類繼承人並準備 VecMap 數據格式
      const { suiAddressHeirs, emailHeirs } = separateHeirsByAddressType(heirs);
      
      // 準備 Sui 地址繼承人的 VecMap (按照建議的格式)
      const suiVecMap = {
        keys: suiAddressHeirs.map(heir => heir.address),
        values: suiAddressHeirs.map(heir => parseInt(heir.ratio))
      };
      
      // 準備電子郵件繼承人的 VecMap (按照建議的格式)
      const emailVecMap = {
        keys: emailHeirs.map(heir => heir.address),
        values: emailHeirs.map(heir => parseInt(heir.ratio))
      };
      
      // 輸出格式化後的 VecMap 數據用於調試
      console.log("鑄造能力交易使用的 VecMap 數據:");
      console.log("Sui 地址 VecMap:", suiVecMap);
      console.log("Email 地址 VecMap:", emailVecMap);
      
      // 使用 SUI SDK 的 Transaction Builder 格式
      const tx = await mintCap(ownerCap, vaultID, suiVecMap, emailVecMap);
      const result = await signAndExecuteTransaction(
        {
          transaction: tx,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("成功鑄造能力並初始化成員", result);
            showWarningMessage("成功鑄造繼承人權限！");
            setIsProcessing(false);
          },
          onError: (error) => {
            console.error("鑄造能力錯誤:", error);
            showWarningMessage("鑄造繼承人權限失敗: " + error.message);
            setIsProcessing(false);
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error("鑄造能力處理錯誤:", error);
      showWarningMessage("鑄造繼承人權限錯誤: " + error.message);
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

      {/* 額外交易卡片 */}
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
        <div className="mb-6 p-4 bg-gray-100 rounded-lg flex flex-row justify-between items-center">
          <div>
            <p className="text-gray-700"><strong>Vault ID:</strong> {vaultID ? formatAddress(vaultID) : "Not available"}</p>
            <p className="text-gray-700"><strong>Owner Cap:</strong> {ownerCap ? formatAddress(ownerCap) : "Not available"}</p>
          </div>
          <button 
            onClick={mintCaps}
            className={`p-2 bg-green-500 text-white rounded hover:bg-green-600 transition ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <span className="inline-block animate-spin mr-2">⟳</span>
                處理中...
              </>
            ) : (
              "Mint Caps"
            )}
          </button>
        </div>
        
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0 md:space-x-4">
          {/* 左側按鈕 */}
          <div className="w-full md:w-1/2">
            <div className="p-4 border border-blue-200 rounded-lg bg-blue-50 h-full">
              <h3 className="font-bold text-lg mb-2 text-blue-800">Send Caps with Email</h3>
              <p className="text-gray-700 mb-4">
                透過加密郵件將繼承人權限安全發送到對應的電子郵件地址。
              </p>
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
              <h3 className="font-bold text-lg mb-2 text-purple-800">啟用自動分配</h3>
              <p className="text-gray-700 mb-4">
                為您的智能遺囑啟用自動資產分配功能。
                這將允許您的資產根據預定義規則自動分配。
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
                  "啟用自動分配"
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
            <h3 className="text-xl font-bold text-red-600 mb-4">警告</h3>
            <p className="text-gray-800 mb-6">{warningMessage}</p>
            <div className="flex justify-end">
              <button
                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
                onClick={closeWarning}
              >
                關閉
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}