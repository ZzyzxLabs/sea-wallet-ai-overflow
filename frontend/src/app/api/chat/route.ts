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
        // Get wallet status and store in vector database
        const walletData = await fetchWalletStatus(userId);
        const collectionName = await storeWalletDataInVectorDB(userId, walletData);
        
        // Get wallet data related to the question from vector database as context
        const walletContext = await searchVectorDB(collectionName, message);
        
        // User uploaded documents are used directly as context, not stored in vector database
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