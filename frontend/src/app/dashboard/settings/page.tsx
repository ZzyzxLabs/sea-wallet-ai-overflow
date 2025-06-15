// frontend/src/app/dashboard/page.tsx
"use client";
import { useSuiClient, useSuiClientQuery } from "@mysten/dapp-kit";
import {
  useCurrentAccount,
  useSignAndExecuteTransaction,
} from "@mysten/dapp-kit";
import { useState, useEffect, Suspense } from "react";
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

function DashboardContent() {
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
      console.log("heirs:", heirs);
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
              `Transaction ${i + 1}/${tx.length} processing error: ${
                error.message || String(error)
              }`
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
  }; // 格式化地址顯示
  const formatAddress = (address) => {
    if (!address) return "不可用";
    return `${address.slice(0, 5)}...${address.slice(-5)}`;
  };

  // 控制地址顯示的狀態
  const [owAddCensor, setOwAddCensor] = useState(true);
  const [vaAddCensor, setVaAddCensor] = useState(true);

  // 複製地址到剪貼簿
  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      showWarningMessage(`${type} copied to clipboard!`);
    } catch (err) {
      console.error("Failed to copy: ", err);
      showWarningMessage(`Failed to copy ${type}`);
    }
  };
  return (
    <div className='flex flex-col items-center justify-center min-h-screen bg-gray-100/50 p-4'>
      <div className='bg-white/60 p-8 rounded-lg shadow-lg w-full max-w-4xl'>
        <h1 className='text-3xl font-bold mb-6 text-center text-[#4da2ff]'>
          SeaVault Settings
        </h1>{" "}
        {/* 顯示保險庫資訊 */}
        <div className='mb-6 p-4 bg-gray-100/60 rounded-lg'>
          <h2 className='text-xl font-bold mb-3 text-[#4da2ff]'>
            Vault Information
          </h2>
          <div
            className='mb-2 border-2 border-[#4da2ff]/40 shadow-lg p-3 rounded-lg cursor-pointer hover:bg-gray-50/50 transition-all duration-300 group overflow-hidden'
            onClick={() => setOwAddCensor(!owAddCensor)}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='flex-1 min-w-0'>
                <strong className='text-[#4da2ff] block mb-1'>Vault ID:</strong>
                <div className='relative overflow-hidden'>
                  <span
                    className={`text-[#555555] text-sm font-mono break-all block transition-all duration-500 ease-in-out transform ${
                      owAddCensor
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-2"
                    }`}
                    style={{
                      position: owAddCensor ? "static" : "absolute",
                      width: "100%",
                    }}
                  >
                    {formatAddress(vaultID)}
                  </span>
                  <span
                    className={`text-[#555555] text-sm font-mono break-all block transition-all duration-500 ease-in-out transform ${
                      !owAddCensor
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2"
                    }`}
                    style={{
                      position: !owAddCensor ? "static" : "absolute",
                      width: "100%",
                      top: owAddCensor ? "0" : "auto",
                    }}
                  >
                    {vaultID}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-2 flex-shrink-0'>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(vaultID, "Vault ID");
                  }}
                  className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded text-sm'
                  title='Copy Vault ID'
                >
                  📋
                </button>
                <span className='text-[#4da2ff] text-sm transition-transform duration-300 hover:scale-110'>
                  {owAddCensor ? "👁️" : "🙈"}
                </span>
              </div>
            </div>
          </div>
          <div
            className='mb-2 border-2 border-[#4da2ff]/40 shadow-lg p-3 rounded-lg cursor-pointer hover:bg-gray-50/50 transition-all duration-300 group overflow-hidden'
            onClick={() => setVaAddCensor(!vaAddCensor)}
          >
            <div className='flex items-start justify-between gap-3'>
              <div className='flex-1 min-w-0'>
                <strong className='text-[#4da2ff] block mb-1'>
                  Owner Cap:
                </strong>
                <div className='relative overflow-hidden'>
                  <span
                    className={`text-[#555555] text-sm font-mono break-all block transition-all duration-500 ease-in-out transform ${
                      vaAddCensor
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 -translate-y-2"
                    }`}
                    style={{
                      position: vaAddCensor ? "static" : "absolute",
                      width: "100%",
                    }}
                  >
                    {formatAddress(ownerCap)}
                  </span>
                  <span
                    className={`text-[#555555] text-sm font-mono break-all block transition-all duration-500 ease-in-out transform ${
                      !vaAddCensor
                        ? "opacity-100 translate-y-0"
                        : "opacity-0 translate-y-2"
                    }`}
                    style={{
                      position: !vaAddCensor ? "static" : "absolute",
                      width: "100%",
                      top: vaAddCensor ? "0" : "auto",
                    }}
                  >
                    {ownerCap}
                  </span>
                </div>
              </div>
              <div className='flex items-center gap-2 flex-shrink-0'>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    copyToClipboard(ownerCap, "Owner Cap");
                  }}
                  className='opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded text-sm'
                  title='Copy Owner Cap'
                >
                  📋
                </button>
                <span className='text-[#4da2ff] text-sm transition-transform duration-300 hover:scale-110'>
                  {vaAddCensor ? "👁️" : "🙈"}
                </span>
              </div>
            </div>
          </div>
        </div>
        {/* 功能卡片 */}
        <div className='flex flex-col md:flex-row justify-between space-y-4 md:space-y-0 md:space-x-4'>
          {/* Mint Capabilities 卡片 */}
          <div className='w-full md:w-1/3 p-4 border border-green-200 rounded-lg bg-transparent'>
            {/*<p className='text-gray-700 mb-4'>
              Mint capability for your heirs, allowing them to access the vault.
            </p>*/}
            <button
              onClick={mintCaps}
              className={`w-full p-3 bg-green-400 text-white rounded hover:bg-green-600/80 transition ${
                isProcessing ? "opacity-50 cursor-not-allowed" : ""
              }`}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <>
                  <span className='inline-block animate-spin mr-2'>⟳</span>
                  Processing...
                </>
              ) : (
                "Send Heir Capabilities"
              )}
            </button>
          </div>
        </div>
      </div>
      {/* 警告/消息對話框 */}
      {showWarning && (
        <div className='fixed inset-0 bg-black/40 bg-opacity-40 flex items-center justify-center z-50'>
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

export default function Dashboard() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  );
}
