// frontend/src/app/dashboard/page.tsx
"use client";
import { useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useMoveStore from "../../../store/moveStore";
import useHeirStore from "../../../store/heirStore";
import axios from "axios";

// 分隔繼承人函數
function separateHeirsByAddressType(heirs) {
  const suiAddressHeirs = [];
  const emailHeirs = [];

  heirs.forEach((heir) => {
    if (
      heir.address &&
      heir.address.startsWith("0x") &&
      !heir.address.includes("@")
    ) {
      suiAddressHeirs.push({ ...heir });
    } else {
      emailHeirs.push({ ...heir });
    }
  });

  return {
    suiAddressHeirs,
    emailHeirs,
  };
}

// 發送遺囑通知函數
const sendWillNotification = async (recipientEmail, secureLink) => {
  try {
    const response = await axios.post("/api/mailService", {
      to: recipientEmail,
      url: secureLink,
    });

    console.log("Email sent successfully:", response.data);
    return response.data;
  } catch (error) {
    console.error("Failed to send email:", error);
    throw error;
  }
};

export default function Dashboard() {
  const account = useCurrentAccount();
  const router = useRouter();
  const searchParams = useSearchParams();
  const client = useSuiClient();

  // 從 URL 參數獲取 vaultID 和 ownerCap，如果沒有則從 localStorage 獲取
  const [vaultID, setVaultID] = useState(
    searchParams.get("vault") || localStorage.getItem("vaultID") || ""
  );
  const [ownerCap, setOwnerCap] = useState(
    searchParams.get("owner") || localStorage.getItem("ownerCap") || ""
  );

  const [isProcessing, setIsProcessing] = useState(false);
  const [showAdditionalTx, setShowAdditionalTx] = useState(true);

  // 從 Zustand store 獲取方法和狀態
  const {
    showWarning,
    warningMessage,
    heirs,
    closeWarning,
    showWarningMessage,
  } = useHeirStore();
  const { packageName, zkTransaction, mintCap } = useMoveStore();

  // 如果沒有 vaultID 或 ownerCap，則重定向回合約頁面
  useEffect(() => {
    if (!vaultID || !ownerCap) {
      showWarningMessage("無法獲取保險庫信息，正在重定向到初始化頁面...");
      setTimeout(() => {
        router.push("/contract");
      }, 3000);
    }
  }, [vaultID, ownerCap, router, showWarningMessage]);

  // 如果用戶未連接錢包，則顯示警告
  useEffect(() => {
    if (!account) {
      showWarningMessage("請先連接您的錢包");
    }
  }, [account, showWarningMessage]);

  // 使用 useSuiClientQuery 查詢用戶擁有的對象
  const ownedObjectsQuery = useSuiClientQuery("getOwnedObjects", {
    owner: account?.address,
    filter: {
      StructType: `${packageName}::seaVault::OwnerCap`,
    },
    options: {
      showType: true,
    },
  });

  if (!ownedObjectsQuery.isPending) {
    console.log("Owned objects query result:", ownedObjectsQuery.data);
  }

  // 將所有 OwnerCap objectIds 放入列表
  let ownerCapObjectIds: string[] = [];
  if (
    !ownedObjectsQuery.isPending &&
    ownedObjectsQuery.data &&
    Array.isArray(ownedObjectsQuery.data.data)
  ) {
    ownerCapObjectIds = ownedObjectsQuery.data.data.map(
      (item) => item.data.objectId
    );
    console.log("OwnerCap object IDs:", ownerCapObjectIds);
  }

  // 交易執行功能
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

  // Mint Capabilities (Mint Caps) 函數
  const mintCaps = async () => {
    try {
      setIsProcessing(true);

      // 正確分類繼承人並準備 VecMap 數據格式
      const { suiAddressHeirs, emailHeirs } = separateHeirsByAddressType(heirs);

      // 準備 Sui 地址繼承人的 VecMap（按建議格式）
      const suiVecMap = {
        keys: suiAddressHeirs.map((heir) => heir.address),
        values: suiAddressHeirs.map((heir) => parseInt(heir.ratio)),
      };

      // 準備電子郵件繼承人的 VecMap（按建議格式）
      const emailVecMap = {
        keys: emailHeirs.map((heir) => heir.address),
        values: emailHeirs.map((heir) => parseInt(heir.ratio)),
      };

      // 輸出格式化的 VecMap 數據用於調試
      console.log("VecMap data used for minting caps:");
      console.log("Sui address VecMap:", suiVecMap);
      console.log("Email address VecMap:", emailVecMap);

      // 使用 SUI SDK 的 Transaction Builder 格式
      const tx = await mintCap(
        ownerCap,
        vaultID,
        suiVecMap,
        emailVecMap,
        account.address
      );
      const result = await signAndExecuteTransaction(
        {
          transaction: tx,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log(
              "Successfully minted capabilities and initialized members",
              result
            );
            showWarningMessage("Successfully minted heir capabilities!");
            setIsProcessing(false);
            // Redirect to dashboard page after successful transaction
            router.push('/dashboard');
          },
          onError: (error) => {
            console.error("Minting capabilities error:", error);
            showWarningMessage(
              "Minting heir capabilities failed: " + error.message
            );
            setIsProcessing(false);
          },
        }
      );

      return result;
    } catch (error) {
      console.error("Minting capabilities processing error:", error);
      showWarningMessage("Minting heir capabilities error: " + error.message);
      setIsProcessing(false);
    }
  };

  // 執行自定義交易 A - 發送能力給繼承人
  const executeCustomTxA = async () => {
    try {
      setIsProcessing(true);
      console.log("Current account address:", account.address);

      // 獲取電子郵件繼承人列表
      const { emailHeirs } = separateHeirsByAddressType(heirs);

      const { tx, urls } = await zkTransaction(
        account.address,
        "testnet",
        ownerCapObjectIds
      );

      console.log("Generated URLs:", urls);
      console.log("Transaction object:", tx);

      // 檢查 tx 是否為陣列
      if (Array.isArray(tx)) {
        console.log(`Need to process ${tx.length} transactions`);

        // 完成交易的計數器
        let completedTxCount = 0;

        // 向用戶顯示進度資訊
        showWarningMessage(`Starting to process ${tx.length} transactions...`);

        // 按順序處理每個交易
        for (let i = 0; i < tx.length; i++) {
          const currentTx = tx[i];

          try {
            // 更新處理狀態消息
            showWarningMessage(
              `Processing transaction ${i + 1}/${tx.length}...`
            );

            // 執行當前交易
            await signAndExecuteTransaction(
              {
                transaction: currentTx,
                chain: "sui:testnet",
              },
              {
                onSuccess: (result) => {
                  console.log(
                    `Transaction ${i + 1}/${tx.length} executed successfully:`,
                    result
                  );

                  // 增加已完成交易數量
                  completedTxCount++;

                  // 如果所有交易都完成，進入下一步
                  if (completedTxCount === tx.length) {
                    // 顯示成功消息
                    showWarningMessage(
                      "All transactions completed successfully!"
                    );

                    // 向電子郵件繼承人發送通知
                    emailHeirs.forEach(async (heir) => {
                      try {
                        const result = await sendWillNotification(
                          heir.address,
                          `https://yourdomain.com/claim/vault/${vaultID}`
                        );
                        console.log(
                          `Email notification sent to ${heir.address}`
                        );
                      } catch (err) {
                        console.error(
                          `Failed to notify heir ${heir.address}:`,
                          err
                        );
                      }
                    });

                    setIsProcessing(false);
                  }
                },
                onError: (error) => {
                  console.error(
                    `Transaction ${i + 1}/${tx.length} execution error:`,
                    error
                  );
                  showWarningMessage(
                    `Transaction ${i + 1}/${tx.length} failed: ${error.message}`
                  );
                  setIsProcessing(false);
                  // 失敗時停止進一步交易
                  return;
                },
              }
            );
          } catch (error) {
            console.error(
              `Transaction ${i + 1}/${tx.length} processing error:`,
              error
            );
            showWarningMessage(
              `Transaction ${i + 1}/${tx.length} processing error: ${error.message || String(error)}`
            );
            setIsProcessing(false);
            break; // 失敗時停止循環
          }
        }
      } else {
        // 如果 tx 不是陣列，視為單個交易
        await signAndExecuteTransaction(
          {
            transaction: tx,
            chain: "sui:testnet",
          },
          {
            onSuccess: (result) => {
              console.log("Custom transaction executed successfully:", result);

              // 顯示成功消息
              showWarningMessage("Transaction completed successfully!");

              // 向電子郵件繼承人發送通知
              emailHeirs.forEach(async (heir) => {
                try {
                  const result = await sendWillNotification(
                    heir.address,
                    `https://yourdomain.com/claim/vault/${vaultID}`
                  );
                  console.log(`Email notification sent to ${heir.address}`);
                } catch (err) {
                  console.error(`Failed to notify heir ${heir.address}:`, err);
                }
              });

              setIsProcessing(false);
            },
            onError: (error) => {
              console.error("Custom transaction error:", error);
              showWarningMessage("Custom transaction failed: " + error.message);
              setIsProcessing(false);
            },
          }
        );
      }
    } catch (error) {
      console.error("Custom transaction execution error:", error);
      showWarningMessage(
        "Custom transaction execution error: " +
          (error.message || String(error))
      );
      setIsProcessing(false);
    }
  };

  // 創建自定義交易 B - 啟用自動分配功能
  const executeCustomTxB = async () => {
    try {
      setIsProcessing(true);

      const customTransaction = {
        kind: "moveCall",
        data: {
          packageObjectId: "0x123...", // 替換為實際合約包 ID
          module: "smartwill",
          function: "add_different_feature",
          typeArguments: [],
          arguments: [vaultID, ownerCap],
        },
      };

      const result = await signAndExecuteTransaction(
        {
          transaction: customTransaction,
          chain: "sui:testnet",
        },
        {
          onSuccess: (result) => {
            console.log("executed custom transaction B", result);
            setIsProcessing(false);
          },
          onError: (error) => {
            console.error("Custom transaction B error:", error);
            showWarningMessage("Custom transaction B failed: " + error.message);
            setIsProcessing(false);
          },
        }
      );

      return result;
    } catch (error) {
      console.error("Custom transaction B execution error:", error);
      showWarningMessage(
        "Custom transaction B execution error: " + error.message
      );
      setIsProcessing(false);
    }
  };

  // 格式化地址顯示
  const formatAddress = (address) => {
    if (!address) return "不可用";
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4'>
      <div className='bg-white p-8 rounded-lg shadow-lg w-full max-w-3xl'>
        <h1 className='text-3xl font-bold mb-6 text-center text-[#4da2ff]'>SeaVault Settings</h1>

        {/* 顯示保險庫資訊 */}
        <div className='mb-6 p-4 bg-gray-100 rounded-lg'>
          <h2 className='text-xl font-bold mb-3 text-[#4da2ff]'>Vault Information</h2>
          <p>
            <strong className='text-[#4da2ff]'>Vault ID:{vaultID}</strong>
          </p>
          <p>
            <strong className='text-[#4da2ff]'>Owner Cap:{ownerCap}</strong> 
          </p>
        </div>

        {/* 功能卡片 */}
        <div className='flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4'>
          {/* Mint Capabilities 卡片 */}
          <div className='w-full md:w-1/3 p-4 border border-green-200 rounded-lg bg-green-50'>
            <h3 className='font-bold text-lg mb-2 text-green-800'>
              Mint Heir Capabilities
            </h3>
            {/*<p className='text-gray-700 mb-4'>
              Mint capability for your heirs, allowing them to access the vault.
            </p>*/}
            <button
              onClick={mintCaps}
              className={`w-full p-3 bg-green-500 text-white rounded hover:bg-green-600 transition ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className='inline-block animate-spin mr-2'>⟳</span>
                  Processing...
                </>
              ) : (
                "Mint Capabilities"
              )}
            </button>
          </div>

          {/* 通過電子郵件發送能力卡片 
            <div className='w-full md:w-1/3 p-4 border border-blue-200 rounded-lg bg-blue-50'>
              <h3 className='font-bold text-lg mb-2 text-blue-800'>
                Send via Email
              </h3>
              <p className='text-gray-700 mb-4'>
                Securely send capabilities to heirs via encrypted email.
              </p>
              <button
                onClick={executeCustomTxA}
                className={`w-full p-3 bg-blue-500 text-white rounded hover:bg-blue-600 transition ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className='inline-block animate-spin mr-2'>⟳</span>
                    Processing...
                  </>
                ) : (
                  "Send with zksend"
                )}
              </button>
            </div> */}

          {/* 啟用自動分配卡片 - Commented out
            <div className='w-full md:w-1/3 p-4 border border-purple-200 rounded-lg bg-purple-50'>
              <h3 className='font-bold text-lg mb-2 text-purple-800'>
                Enable Auto-Distribution
              </h3>
              <p className='text-gray-700 mb-4'>
                Enable automatic asset distribution for your smart will.
              </p>
              <button
                onClick={executeCustomTxB}
                className={`w-full p-3 bg-purple-500 text-white rounded hover:bg-purple-600 transition ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}`}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <span className='inline-block animate-spin mr-2'>⟳</span>
                    Processing...
                  </>
                ) : (
                  "Enable Auto-Distribution"
                )}
              </button>
            </div> */}
        </div>
      </div>
      {/* 警告/消息對話框 */}
      {showWarning && (
        <div className='fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50'>
          <div className='bg-white p-6 rounded-lg shadow-xl max-w-md w-full'>
            <h3 className='text-xl font-bold text-gray-800 mb-4'>Message</h3>
            <p className='text-gray-700 mb-6'>{warningMessage}</p>
            <div className='flex justify-end'>
              <button
                className='px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition'
                onClick={closeWarning}
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
