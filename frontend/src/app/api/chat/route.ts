import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { OllamaEmbeddings } from "@langchain/ollama";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

// 初始化 Qdrant 客戶端
const qdrant = new QdrantClient({
  url: "http://localhost:6333",
  timeout: 10_000,
});

const embeddingsModel = new OllamaEmbeddings({
  model: "nomic-embed-text",
});

export const config = {
  runtime: "edge",
};

export async function POST(request: Request) {
  const { message, mode, userId, docs } = await request.json();

  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  (async () => {
    try {
      if (mode === "customer_service") {
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "text",
              content: "您的訊息已收到。客服人員將儘快回覆您。",
            })}\n\n`
          )
        );
      } else if (mode === "ai") {
        const systemPrompt = `你是 SeaWallet 的專業 AI 客服助手。回答以下問題：${message}`;
        await streamLlamaResponse(systemPrompt, writer, encoder);
      } else if (mode === "wallet") {
        const collectionName = `temp_user_${userId}`;
        let collectionExists = false;

        try {
          await qdrant.getCollection(collectionName);
          collectionExists = true;
        } catch (err) {
          // 集合不存在
        }

        if (docs) {
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
          const textChunks = await splitter.splitText(docs);
          const vectors = await embeddingsModel.embedDocuments(textChunks);
          const points = vectors.map((vector, idx) => ({
            id: idx,
            vector,
            payload: { text: textChunks[idx] },
          }));
          await qdrant.upsert(collectionName, { points });
          collectionExists = true;
        }

        let context = "";
        if (collectionExists) {
          const queryVec = await embeddingsModel.embedQuery(message);
          const searchRes = await qdrant.search(collectionName, {
            vector: queryVec,
            limit: 3,
          });
          context = searchRes.map((r) => r.payload.text).join("\n");
        }

        const systemPrompt = `你是 SeaWallet 的 AI 助手。根據上下文回答：
上下文：${context || "無相關上下文"}
用戶提問：${message}`;
        await streamLlamaResponse(systemPrompt, writer, encoder);
      }

      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: "done" })}\n\n`)
      );
    } catch (err) {
      console.error(err);
      await writer.write(
        encoder.encode(
          `data: ${JSON.stringify({
            type: "error",
            content: "處理錯誤，請稍後再試。",
          })}\n\n`
        )
      );
    } finally {
      await writer.close();
    }
  })();

  return new NextResponse(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

async function streamLlamaResponse(
  prompt: string,
  writer: WritableStreamDefaultWriter<Uint8Array>,
  encoder: TextEncoder
) {
  const resp = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "llama3.2:latest",
      prompt,
      stream: true,
    }),
  });

  const reader = resp.body!.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value);
    for (const line of chunk.split("\n").filter((l) => l.trim())) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.response) {
          await writer.write(
            encoder.encode(
              `data: ${JSON.stringify({ type: "text", content: parsed.response })}\n\n`
            )
          );
        }
      } catch {
        // 忽略非 JSON 行
      }
    }
  }
}