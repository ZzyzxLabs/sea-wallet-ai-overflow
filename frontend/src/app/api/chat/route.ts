import { NextResponse } from "next/server";
import { storeWalletDataInVectorDB, searchVectorDB } from "./walletInfo";

export const config = {
  runtime: "edge",
};

export async function POST(request: Request) {
  const { message, mode, userId, docs, walletStatus } = await request.json();

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
              content: "Message received, please wait clerk to reply.",
            })}\n\n`
          )
        );
      } else if (mode === "ai") {
        const systemPrompt = `You are SeaWallet AI assistant, answer ${message}`;
        await streamLlamaResponse(systemPrompt, writer, encoder);
      } else if (mode === "wallet") {
        // 使用前端傳入的錢包信息，而不是後端獲取
        const walletData = walletStatus || "";
        console.log("walletData", walletData);
        // 只有當有錢包數據時才存入向量數據庫
        let collectionName = `wallet_data_${userId}`;
        let walletContext = "No wallet data available";
        
        if (walletData && walletData.trim() !== "") {
          // 儲存錢包數據到向量數據庫
          collectionName = await storeWalletDataInVectorDB(userId, walletData);
          
          // 從向量數據庫獲取與問題相關的錢包數據作為上下文
          walletContext = await searchVectorDB(collectionName, message);
        }
        
        // 用戶上傳的文檔直接作為上下文使用，不儲存在向量數據庫中
        const userDocsContext = docs ? `User uploaded document content:\n${docs}` : "";
        
        const combinedContext = [walletContext, userDocsContext].filter(Boolean).join("\n\n");
        
        const systemPrompt = `You are the AI assistant for SeaWallet. Answer based on the context:
Context: ${combinedContext || "No relevant context"}
User question: ${message}`;
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
            content: "Processing error, please try again later.",
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
        // Ignore parsing errors
      }
    }
  }
}