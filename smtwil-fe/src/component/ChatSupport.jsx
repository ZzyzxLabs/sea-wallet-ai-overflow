'use client';

import { useState, useRef, useEffect } from 'react';
import styles from '../styles/ChatSupport.module.css';

const ChatSupport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('ai'); // 'customer' 或 'ai'
  const [messages, setMessages] = useState([
    { id: 1, text: '您好！我是 SeaWallet 的 AI 助手，有什麼我能幫助您的嗎？', isAI: true }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  // 控制對話框顯示/隱藏
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // 處理流式回應的函數
  const handleStreamResponse = async (message, mode) => {
    // 顯示加載狀態
    setIsLoading(true);
    const loadingMsgId = messages.length + 2;
    
    // 初始化一個空的回應訊息
    setMessages(prev => [...prev, { 
      id: loadingMsgId, 
      text: '', 
      isAI: true,
      isStreaming: true
    }]);
    
    try {
      // 使用 fetch 進行流式請求
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          mode
        }),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      // 取得讀取器
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';
      
      // 持續讀取流
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // 解碼當前的數據塊
        const chunk = decoder.decode(value, { stream: true });
        // 處理 SSE 格式的數據
        const lines = chunk.split('\n\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const eventData = JSON.parse(line.substring(6));
              
              if (eventData.type === 'text') {
                // 將新文字添加到累積的文字中
                accumulatedText += eventData.content;
                
                // 更新訊息，保留流式狀態
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === loadingMsgId 
                      ? { id: loadingMsgId, text: accumulatedText, isAI: true, isStreaming: true } 
                      : msg
                  )
                );
              } else if (eventData.type === 'done') {
                // 流式結束，更新訊息移除流式狀態
                setMessages(prev => 
                  prev.map(msg => 
                    msg.id === loadingMsgId 
                      ? { id: loadingMsgId, text: accumulatedText, isAI: true, isStreaming: false } 
                      : msg
                  )
                );
                setIsLoading(false);
                break;
              } else if (eventData.type === 'error') {
                throw new Error(eventData.content || '處理請求時發生錯誤');
              }
            } catch (e) {
              console.error('解析事件數據錯誤:', e);
              throw e;
            }
          }
        }
      }
    } catch (error) {
      console.error('聊天 API 錯誤:', error);
      // 處理錯誤
      setMessages(prev => 
        prev.map(msg => 
          msg.id === loadingMsgId 
            ? { id: loadingMsgId, text: '抱歉，發生了一個錯誤。請稍後再試。', isAI: true, isStreaming: false } 
            : msg
        )
      );
      setIsLoading(false);
    }
  };

  // 傳送訊息
  const sendMessage = async (e) => {
    e.preventDefault();
    if (newMessage.trim() === '' || isLoading) return;

    // 添加使用者訊息
    const userMessage = { id: messages.length + 1, text: newMessage, isAI: false };
    setMessages(prev => [...prev, userMessage]);
    
    const currentMessage = newMessage;
    setNewMessage('');
    
    // 使用流式處理函數
    if (mode === 'ai') {
      await handleStreamResponse(currentMessage, mode);
    } else {
      // 客服模式使用標準回應
      setIsLoading(true);
      const loadingMsgId = messages.length + 2;
      
      // 簡單延遲模擬客服回應
      setTimeout(() => {
        setMessages(prev => [...prev, { 
          id: loadingMsgId, 
          text: '您的訊息已收到。客服人員將儘快回覆您。', 
          isAI: true 
        }]);
        setIsLoading(false);
      }, 1000);
    }
  };

  // 切換模式
  const switchMode = (newMode) => {
    if (newMode !== mode && !isLoading) {
      setMode(newMode);
      // 添加模式切換通知
      const switchMessage = { 
        id: messages.length + 1, 
        text: `您已切換至${newMode === 'customer' ? '客服人員' : 'AI 助手'}模式`, 
        isSystem: true 
      };
      setMessages(prev => [...prev, switchMessage]);
    }
  };

  // 自動捲動到最新訊息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // 打字機效果的組件
  const TypewriterText = ({ text, isActive }) => {
    if (!isActive) return text;

    return (
      <>
        {text}
        <span className={styles.cursor}></span>
      </>
    );
  };

  return (
    <div className={styles.chatSupportContainer}>
      {/* 右下角的按鈕 */}
      <button 
        className={styles.chatButton} 
        onClick={toggleChat}
        aria-label="客服支援"
      >
        {isOpen ? '✕' : '💬'}
      </button>

      {/* 對話框 */}
      {isOpen && (
        <div className={styles.chatBox}>
          <div className={`${styles.chatHeader} ${mode === 'customer' ? styles.customerHeader : styles.aiHeader}`}>
            <div className={styles.headerContent}>
              <div className={styles.modeIndicator}>
                {mode === 'customer' ? '👤' : '🤖'}
              </div>
              <h3>
                SeaWallet {mode === 'customer' ? '客服人員' : 'AI 助手'}
              </h3>
            </div>
            <button 
              className={styles.closeButton} 
              onClick={toggleChat}
              aria-label="關閉對話"
            >
              ✕
            </button>
          </div>
          
          <div className={styles.messagesContainer}>
            {messages.map(msg => (
              <div 
                key={msg.id} 
                className={`${styles.message} ${
                  msg.isSystem 
                    ? styles.systemMessage 
                    : msg.isAI 
                      ? styles.aiMessage 
                      : styles.userMessage
                }`}
              >
                {msg.isSystem ? null : msg.isAI && <span className={styles.messageBadge}>{mode === 'customer' ? '👤' : '🤖'}</span>}
                <TypewriterText text={msg.text} isActive={msg.isStreaming} />
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          <form className={styles.inputContainer} onSubmit={sendMessage}>
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="輸入您的訊息..."
              className={styles.messageInput}
              disabled={isLoading}
            />
            <button 
              type="submit" 
              className={styles.sendButton}
              disabled={newMessage.trim() === '' || isLoading}
            >
              {isLoading ? '傳送中...' : '傳送'}
            </button>
          </form>
          
          <div className={styles.optionsContainer}>
            <button 
              className={`${styles.optionButton} ${mode === 'customer' ? styles.activeMode : ''}`} 
              onClick={() => switchMode('customer')}
              disabled={isLoading}
            >
              <span className={styles.optionIcon}>👤</span>
              聯繫客服
            </button>
            <button 
              className={`${styles.optionButton} ${mode === 'ai' ? styles.activeMode : ''}`}
              onClick={() => switchMode('ai')}
              disabled={isLoading}
            >
              <span className={styles.optionIcon}>🤖</span>
              AI 協助
            </button>
          </div>
          
          <div className={styles.modeIndicatorBar}>
            <div 
              className={styles.indicatorSlider} 
              style={{ 
                transform: `translateX(${mode === 'customer' ? '0' : '100%'})` 
              }}
            />
            <span className={styles.modeLabel}>
              目前模式: {mode === 'customer' ? '客服人員' : 'AI 助手'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSupport;