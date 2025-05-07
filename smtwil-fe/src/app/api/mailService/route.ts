import { NextResponse } from 'next/server';
import sgMail from '@sendgrid/mail';

// 設定 SendGrid API 金鑰
sgMail.setApiKey(process.env.SENDGRID_API_KEY as string);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, url } = body;
    

    const msg = {
      to: to,
      from: process.env.SENDER_EMAIL as string,
      subject: 'SeaWallet - SmartWill Service',
      html: `<!DOCTYPE html>
              <html lang="zh-TW">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>SeaWallet SmartWill 通知</title>
                  <style>
                      /* 全域樣式 */
                      body {
                          font-family: 'Helvetica Neue', Arial, sans-serif;
                          line-height: 1.6;
                          color: #333;
                          background-color: #f9f9f9;
                          margin: 0;
                          padding: 0;
                      }
                      
                      /* 主容器 */
                      .container {
                          max-width: 600px;
                          margin: 20px auto;
                          background-color: #ffffff;
                          border-radius: 8px;
                          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
                          overflow: hidden;
                      }
                      
                      /* 頁首 */
                      .header {
                          background-color: #1a73e8;
                          color: white;
                          padding: 20px;
                          text-align: center;
                      }
                      
                      .header h1 {
                          margin: 0;
                          font-size: 24px;
                      }
                      
                      /* 內容區 */
                      .content {
                          padding: 30px;
                      }
                      
                      .message {
                          margin-bottom: 25px;
                          font-size: 16px;
                      }
                      
                      /* URL欄位 */
                      .url-section {
                          background-color: #f5f8ff;
                          border: 1px solid #d0e0ff;
                          border-radius: 6px;
                          padding: 15px;
                          margin: 20px 0;
                      }
                      
                      .url-label {
                          display: block;
                          font-weight: bold;
                          margin-bottom: 8px;
                          color: #555;
                      }
                      
                      .url-field {
                          display: block;
                          width: 100%;
                          padding: 10px;
                          border: 1px solid #ccc;
                          border-radius: 4px;
                          font-size: 14px;
                          color: #666;
                          background-color: #fff;
                          box-sizing: border-box;
                      }
                      
                      /* 按鈕 */
                      .button-container {
                          text-align: center;
                          margin: 30px 0;
                      }
                      
                      .button {
                          display: inline-block;
                          background-color: #1a73e8;
                          color: white;
                          padding: 12px 24px;
                          border-radius: 4px;
                          text-decoration: none;
                          font-weight: bold;
                          font-size: 16px;
                          transition: background-color 0.3s;
                      }
                      
                      .button:hover {
                          background-color: #0d62d0;
                      }
                      
                      /* 提示區 */
                      .note {
                          font-size: 14px;
                          color: #666;
                          background-color: #f8f9fa;
                          padding: 15px;
                          border-radius: 6px;
                          margin-top: 25px;
                      }
                      
                      /* 頁尾 */
                      .footer {
                          background-color: #f2f2f2;
                          padding: 20px;
                          text-align: center;
                          font-size: 12px;
                          color: #777;
                      }
                  </style>
              </head>
              <body>
                  <div class="container">
                      <div class="header">
                          <h1>SeaWallet SmartWill 通知</h1>
                      </div>
                      
                      <div class="content">
                          <div class="message">
                              <p>親愛的用戶，您好：</p>
                              <p>我們需要通知您，您的親人已啟用了 SeaWallet 的 <strong>SmartWill</strong> 功能，並且已將您指定為信任聯絡人。</p>
                              <p>根據 SmartWill 的設定，您現在可以通過安全的 zkSend 技術獲取其錢包 vault 的操作權限。</p>
                          </div>
                          
                          <div class="url-section">
                              <label class="url-label">安全連結：</label>
                              <input type="text" class="url-field" value="${url}" readonly>
                          </div>
                          
                          <div class="button-container">
                              <a href="${url}" class="button">通過 zkSend 領取權限</a>
                          </div>
                          
                          <div class="note">
                              <p><strong>請注意：</strong> zkSend 是一種加密技術，可確保您安全地接收 vault 的操作權限，而不會洩露任何私密資訊。領取權限後，您將能夠依照 SmartWill 的設定管理指定的資產。</p>
                          </div>
                      </div>
                      
                      <div class="footer">
                          <p>© 2025 SeaWallet 公司版權所有</p>
                          <p>如有任何問題，請聯繫我們的客戶支援：support@seawallet.com</p>
                          <p>此郵件是系統自動發送，請勿直接回覆</p>
                      </div>
                  </div>
              </body>
              </html>` 
    };
    
    await sgMail.send(msg);
    
    return NextResponse.json(
      { success: true, message: '郵件發送成功' },
      { status: 200 }
    );
  } catch (error) {
    console.error('郵件發送失敗:', error);
    return NextResponse.json(
      { success: false, message: '郵件發送失敗' },
      { status: 500 }
    );
  }
}