import { QdrantClient } from "@qdrant/js-client-rest";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// 共用的 Qdrant 客戶端實例
const qdrant = new QdrantClient({
  url: "http://localhost:6333",
  timeout: 10_000,
});

// 共用的 Embedding 模型
const embeddingsModel = new OllamaEmbeddings({
  model: "nomic-embed-text",
});

/**
 * 獲取用戶錢包狀態
 * @param userId 用戶ID
 * @returns 用戶錢包狀態數據
 */
export async function fetchWalletStatus(userId: string) {
  // 這裡是簡化的實現，實際上應該從數據庫或API獲取用戶的錢包狀態
  // 保持可修改性，以便未來擴展
  const mockWalletData = `
用戶ID: ${userId}
錢包餘額: 1,000 USD
最近交易:
- 2025-05-15: 購買 BTC -100 USD
- 2025-05-14: 充值 +500 USD
- 2025-05-10: 提現 -200 USD
資產分佈:
- 比特幣 (BTC): 0.05 BTC
- 以太幣 (ETH): 2.5 ETH
- 穩定幣 (USDT): 400 USDT
`;
  return mockWalletData;
}

/**
 * 將錢包狀態數據存入向量數據庫
 * @param userId 用戶ID
 * @param walletData 錢包數據
 * @returns 創建的集合名稱
 */
export async function storeWalletDataInVectorDB(userId: string, walletData: string) {
  const collectionName = `wallet_data_${userId}`;
  let collectionExists = false;

  try {
    await qdrant.getCollection(collectionName);
    collectionExists = true;
  } catch (err) {
    // 集合不存在
  }

  if (collectionExists) {
    await qdrant.deleteCollection(collectionName);
  }
  
  await qdrant.createCollection(collectionName, {
    vectors: { size: 768, distance: "Cosine" },
    timeout: 10_000
  });

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });
  
  const textChunks = await splitter.splitText(walletData);
  const vectors = await embeddingsModel.embedDocuments(textChunks);
  const points = vectors.map((vector, idx) => ({
    id: idx,
    vector,
    payload: { text: textChunks[idx] },
  }));
  
  await qdrant.upsert(collectionName, { points });
  return collectionName;
}

/**
 * 搜索向量數據庫獲取相關上下文
 * @param collectionName 集合名稱
 * @param query 查詢文本
 * @returns 搜索結果文本
 */
export async function searchVectorDB(collectionName: string, query: string) {
  const queryVec = await embeddingsModel.embedQuery(query);
  const searchRes = await qdrant.search(collectionName, {
    vector: queryVec,
    limit: 3,
  });
  return searchRes.map((r) => r.payload.text).join("\n");
}