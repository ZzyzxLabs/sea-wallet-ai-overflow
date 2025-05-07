async function sendEmail(to: string, url: any) {
    try {
      const response = await fetch('/api/maillService', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ to, url }),
      });
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('發送請求失敗:', error);
      throw error;
    }
  }
  
  // 使用範例
  sendEmail('recipient@example.com', 'Url://to/zkSend/Cap');