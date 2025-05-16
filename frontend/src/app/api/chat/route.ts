import { NextResponse } from "next/server";
import { 
  fetchWalletStatus, 
  storeWalletDataInVectorDB, 
  searchVectorDB 
} from "./walletInfo";

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
              content: "Message received, please wait clerk to reply.",
            })}\n\n`
          )
        );
      } else if (mode === "ai") {
        const systemPrompt = `You are SeaWallet AI assistant, answer ${message}`;
        await streamLlamaResponse(systemPrompt, writer, encoder);
      } else if (mode === "wallet") {
        // 獲取錢包狀態並存入向量數據庫
        const walletData = await fetchWalletStatus(userId);
        const collectionName = await storeWalletDataInVectorDB(userId, walletData);
        
        // 從向量數據庫獲取與問題相關的錢包數據作為上下文
        const walletContext = await searchVectorDB(collectionName, message);
        
        // 用戶上傳的文檔直接作為上下文，而不存入向量數據庫
        const userDocsContext = docs ? `用戶上傳文檔內容：\n${docs}` : "";
        
        const combinedContext = [walletContext, userDocsContext].filter(Boolean).join("\n\n");
        
        const systemPrompt = `你是 SeaWallet 的 AI 助手。根據上下文回答：
上下文：${combinedContext || "無相關上下文"}
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
        // Ignore parsing errors
      }
    }
  }
}