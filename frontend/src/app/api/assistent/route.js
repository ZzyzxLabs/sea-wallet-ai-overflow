import { NextResponse } from 'next/server';
import { QdrantClient } from '@qdrant/js-client-rest';
import { OpenAIEmbeddings } from 'langchain/embeddings/openai';

// 在全局保持一張 Map 管理每個 userId 的臨時向量 DB 狀態
const hasCollection = new Map();
// 設定 Qdrant 客戶端 (假設已啟動於本地或雲端)
const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

export const config = { runtime: 'nodejs' };

export async function POST(request) {
  const { message, mode, userId, docs } = await request.json();

  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // 非同步處理流程
  (async () => {
    try {
      // 若尚未建立該使用者的 collection，則「即時」創建並上傳文件嵌入
      if (!hasCollection.get(userId)) {
        const collectionName = `temp_user_${userId}`;
        // 1. 建立 collection (非持久化設計，可自行加 TTL 清理)
        await qdrant.createCollection({
          collection_name: collectionName,
          vectors: { size: 1536, distance: 'Cosine' } // size 取決於你的 embed 模型
        });

        // 2. 切 chunk、嵌入並上傳至 Qdrant
        const splitter = new (await import('langchain/text_splitter')).RecursiveCharacterTextSplitter({ chunkSize: 500, chunkOverlap: 50 });
        const textChunks = await splitter.createDocuments([docs]);
        const embeddingsModel = new OpenAIEmbeddings();
        const vectors = await embeddingsModel.embedDocuments(textChunks.map(c => c.pageContent));

        // 3. upsert 向量到 Qdrant
        const points = vectors.map((vector, idx) => ({ id: idx, vector, payload: { text: textChunks[idx].pageContent } }));
        await qdrant.upsert({ collection_name: collectionName, points });

        hasCollection.set(userId, collectionName);
      }

      // 4. 查詢向量資料，取得 TopK
      const collectionName = hasCollection.get(userId);
      const embeddingsModel = new OpenAIEmbeddings();
      const queryVec = await embeddingsModel.embedQuery(message);
      const searchRes = await qdrant.search({
        collection_name: collectionName,
        vector: queryVec,
        limit: 3
      });
      const context = searchRes.map(r => r.payload.text).join('\n');

      // 5. 組 prompt 並呼叫本地 Ollama Llama
      const systemPrompt = `你是 SeaWallet 的 AI 助手。根據上下文回答：\n上下文：${context}\n用戶提問：${message}`;
      const ollamaResp = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'llama3.2:latest', prompt: systemPrompt, stream: true })
      });

      const reader = ollamaResp.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value);
        for (const line of chunk.split('\n').filter(l => l.trim())) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'text', content: parsed.response })}\n\n`));
            }
          } catch {}
        }
      }
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`));
    } catch (err) {
      console.error(err);
      await writer.write(encoder.encode(`data: ${JSON.stringify({ type: 'error', content: '處理錯誤' })}\n\n`));
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive'
    }
  });
}
