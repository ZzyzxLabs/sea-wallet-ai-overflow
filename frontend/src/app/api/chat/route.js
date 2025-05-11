import { NextResponse } from 'next/server';

export async function POST(request) {
  const { message, mode } = await request.json();
  
  // 設置流式回應頭部
  const encoder = new TextEncoder();
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // 非同步處理函數
  const processRequest = async () => {
    try {
      if (mode !== 'ai') {
        // 如果不是 AI 模式，發送標準客服回覆並結束
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: 'text', content: '您的訊息已收到。客服人員將儘快回覆您。' })}\n\n`)
        );
        await writer.write(
          encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
        );
        await writer.close();
        return;
      }
    
      // 準備系統提示
      const systemPrompt = `你是 SeaWallet 的專業 AI 客服助手。回答以下問題：${message}`;
    
      // 創建 Ollama 流式請求
      const ollamaResponse = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama3.2:latest',
          prompt: systemPrompt,
          stream: true
        }),
      });

      // 處理流式回應
      const reader = ollamaResponse.body.getReader();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解析收到的數據塊
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            if (parsed.response) {
              await writer.write(
                encoder.encode(`data: ${JSON.stringify({ type: 'text', content: parsed.response })}\n\n`)
              );
            }
          } catch (e) {
            console.error('解析錯誤:', e);
          }
        }
      }

      // 發送完成事件
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'done' })}\n\n`)
      );
    } catch (error) {
      console.error('Ollama API 錯誤:', error);
      await writer.write(
        encoder.encode(`data: ${JSON.stringify({ type: 'error', content: '處理您的請求時發生錯誤' })}\n\n`)
      );
    } finally {
      await writer.close();
    }
  };

  // 啟動非同步處理
  processRequest();
  
  // 返回流
  return new NextResponse(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// 標記為 edge 模式以支援流式響應
export const config = {
  runtime: 'edge',
};