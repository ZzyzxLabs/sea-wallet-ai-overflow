'use client'

import { useState, useRef, useEffect } from 'react';
import styles from '../styles/ChatSupport.module.css';

const ChatSupport = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('ai'); // 'customer_service' 或 'ai'
  const [walletModeEnabled, setWalletModeEnabled] = useState(false); // 控制 Wallet 模式的開關
  const [userId, setUserId] = useState(''); // 為每個會話生成唯一 ID
  const [uploadedDocs, setUploadedDocs] = useState(null); // 儲存上傳的文檔
  
  // 生成唯一ID
  const generateUniqueId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15) + 
           '_' + Date.now().toString(36);
  };

  // 初始化用戶ID
  useEffect(() => {
    if (!userId) {
      setUserId(generateUniqueId());
    }
  }, []);

  // 對話框相關狀態
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState(null);

  // 文件上傳對話框
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const fileInputRef = useRef(null);

  // 修改系統訊息類型
  const handleSystemMessage = (text) => {
    const systemMessage = { 
      id: generateUniqueId(), 
      text: text, 
      isSystem: true,
      isAI: false
    };
    setMessages(prev => [...prev, systemMessage]);
  };

  const [messages, setMessages] = useState([
    { id: 'initial_msg_1', text: '您好！我是 SeaWallet 的 AI 助手，有什麼我能幫助您的嗎？', isAI: true }
  ]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isTypingEffect, setIsTypingEffect] = useState(true);
  const [quickReplies, setQuickReplies] = useState([
    '如何充值？',
    '忘記密碼',
    '費用與手續費',
    '聯繫客服'
  ]);

  const messagesEndRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chatBoxRef = useRef(null);
  const dialogRef = useRef(null);
  const fileDialogRef = useRef(null);

  // 初始化
  useEffect(() => {
    // 檢查用戶偏好的主題模式
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDarkMode(prefersDarkMode);
    
    // 添加動畫結束監聽器
    const handleAnimationEnd = () => {
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    };
    
    document.addEventListener('animationend', handleAnimationEnd);
    
    // 點擊聊天框外區域關閉對話框
    const handleClickOutside = (event) => {
      if (dialogRef.current && !dialogRef.current.contains(event.target)) {
        setDialogOpen(false);
      }
      if (fileDialogRef.current && !fileDialogRef.current.contains(event.target)) {
        setFileDialogOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    
    return () => {
      document.removeEventListener('animationend', handleAnimationEnd);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // 開啟訊息對話框
  const openMessageDialog = (message) => {
    if (message.isSystem) return; // 系統訊息不顯示對話框
    setSelectedMessage(message);
    setDialogOpen(true);
  };

  // 關閉訊息對話框
  const closeMessageDialog = () => {
    setDialogOpen(false);
  };

  // 開啟文件上傳對話框
  const openFileDialog = () => {
    setFileDialogOpen(true);
  };

  // 關閉文件上傳對話框
  const closeFileDialog = () => {
    setFileDialogOpen(false);
  };

  // 處理文件上傳
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedDocs(event.target.result);
      handleSystemMessage(`文件已上傳：${file.name}（此文件將直接用於問答上下文，而不會儲存在資料庫中）`);
      closeFileDialog();
    };
    reader.readAsText(file);
  };

  // 複製訊息文字
  const copyMessageText = () => {
    if (selectedMessage) {
      navigator.clipboard.writeText(selectedMessage.text)
        .then(() => {
          handleSystemMessage('已複製訊息至剪貼簿');
        })
        .catch(err => {
          console.error('複製訊息失敗:', err);
          handleSystemMessage('複製訊息失敗，請重試');
        });
    }
    closeMessageDialog();
  };

  // 標記訊息為重要
  const markAsImportant = () => {
    if (selectedMessage) {
      setMessages(prev => 
        prev.map(msg => 
          msg.id === selectedMessage.id 
            ? { ...msg, isImportant: !msg.isImportant } 
            : msg
        )
      );
      
      const actionText = selectedMessage.isImportant 
        ? '已取消標記重要訊息' 
        : '已標記為重要訊息';
      
      handleSystemMessage(actionText);
    }
    closeMessageDialog();
  };

  // 刪除訊息
  const deleteMessage = () => {
    if (selectedMessage) {
      setMessages(prev => prev.filter(msg => msg.id !== selectedMessage.id));
      handleSystemMessage('已刪除訊息');
    }
    closeMessageDialog();
  };

  // 控制對話框顯示/隱藏
  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // 切換 Wallet 模式
  const toggleWalletMode = () => {
    setWalletModeEnabled(!walletModeEnabled);
    handleSystemMessage(`${!walletModeEnabled ? '已啟用' : '已停用'} Wallet 模式`);
  };

  // 獲取實際使用的模式
  const getEffectiveMode = () => {
    if (mode === 'customer_service') {
      return 'customer_service';
    } else if (mode === 'ai' && walletModeEnabled) {
      return 'wallet';
    } else {
      return 'ai';
    }
  };

  // 處理流式回應的函數
  const handleStreamResponse = async (message, currentMode) => {
    // 顯示加載狀態
    setIsLoading(true);
    const loadingMsgId = generateUniqueId();
    
    // 初始化一個空的回應訊息
    setMessages(prev => [...prev, { 
      id: loadingMsgId, 
      text: '', 
      isAI: true,
      isStreaming: true
    }]);
    
    try {
      // 準備請求數據
      const requestData = {
        message,
        mode: currentMode
      };
      
      // 如果是錢包模式，添加用戶ID和文檔
      if (currentMode === 'wallet') {
        requestData.userId = userId;
        requestData.docs = uploadedDocs;
      }
      
      // 使用 fetch 進行流式請求
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
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
                      ? { id: loadingMsgId, text: accumulatedText, isAI: true, isStreaming: isTypingEffect } 
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
                
                // 根據消息內容生成快速回覆
                generateQuickReplies(accumulatedText);
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

  // 根據AI回應生成快速回覆選項
  const generateQuickReplies = (text) => {
    // 實際應用中可以使用更複雜的邏輯或從API獲取相關的快速回覆
    // 這裡簡單示範：
    if (text.includes('充值') || text.includes('付款')) {
      setQuickReplies(['如何添加銀行卡？', '支持哪些支付方式？', '充值限額是多少？', '遇到充值問題']);
    } else if (text.includes('密碼') || text.includes('登錄')) {
      setQuickReplies(['重設密碼流程', '帳戶安全設置', '兩步驗證說明', '聯繫客服']);
    } else if (walletModeEnabled) {
      // 針對 Wallet 模式的快速回覆
      setQuickReplies(['查詢餘額', '交易記錄', '添加新資產', '禁用 Wallet 模式']);
    } else {
      // 預設的快速回覆
      setQuickReplies(['產品功能介紹', '費用與手續費', '常見問題', '聯繫客服']);
    }
  };

  // 傳送訊息
  const sendMessage = async (e) => {
    e && e.preventDefault();
    if (newMessage.trim() === '' || isLoading) return;

    // 添加使用者訊息
    const userMessage = { id: generateUniqueId(), text: newMessage, isAI: false };
    setMessages(prev => [...prev, userMessage]);
    
    const currentMessage = newMessage;
    setNewMessage('');
    
    // 獲取實際使用的模式
    const effectiveMode = getEffectiveMode();
    
    // 根據模式處理回應
    await handleStreamResponse(currentMessage, effectiveMode);
  };

  // 處理快速回覆點擊
  const handleQuickReplyClick = (reply) => {
    // 特殊快速回覆處理
    if (reply === '轉至 AI 助手') {
      switchMode('ai');
      return;
    } else if (reply === '禁用 Wallet 模式') {
      toggleWalletMode();
      return;
    }
    
    setNewMessage(reply);
    // 稍微延遲以便看到輸入框中的文字
    setTimeout(() => sendMessage(), 300);
  };

  // 語音輸入功能
  const toggleVoiceInput = async () => {
    if (isRecording) {
      // 停止錄音
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // 創建錄音機
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const audioChunks = [];
      
      mediaRecorder.addEventListener('dataavailable', (event) => {
        audioChunks.push(event.data);
      });
      
      mediaRecorder.addEventListener('stop', async () => {
        // 處理錄音結果
        const audioBlob = new Blob(audioChunks);
        
        // 這裡應該是發送錄音到語音識別 API 的邏輯
        // 簡化示範：假設已轉文字
        setNewMessage('這是一條由語音轉換的文字訊息...');
        
        // 關閉麥克風流
        stream.getTracks().forEach(track => track.stop());
      });
      
      // 開始錄音
      mediaRecorder.start();
      setIsRecording(true);
      
      // 添加錄音提示
      handleSystemMessage('正在聆聽您的聲音，請說話...');
      
      // 設置錄音時間限制（例如 10 秒）
      setTimeout(() => {
        if (isRecording && mediaRecorderRef.current) {
          mediaRecorderRef.current.stop();
          setIsRecording(false);
        }
      }, 10000);
      
    } catch (error) {
      console.error('語音輸入錯誤:', error);
      handleSystemMessage('無法訪問麥克風。請檢查權限設置。');
    }
  };

  // 切換主題模式
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  // 切換聊天模式
  const switchMode = (newMode) => {
    if (newMode !== mode && !isLoading) {
      setMode(newMode);
      // 添加模式切換通知
      handleSystemMessage(`您已切換至${newMode === 'customer_service' ? '客服人員' : 'AI 助手'}模式`);
      
      // 如果從AI切換到客服，自動關閉錢包模式
      if (newMode === 'customer_service' && walletModeEnabled) {
        setWalletModeEnabled(false);
      }
      
      // 更新快速回覆
      if (newMode === 'customer_service') {
        setQuickReplies(['申請緊急支援', '查看工單狀態', '預約回電', '轉至 AI 助手']);
      } else {
        setQuickReplies(['產品功能介紹', '費用與手續費', '常見問題', '聯繫客服']);
      }
    }
  };

  // 添加淡入淡出動畫效果
  const handleChatBoxAnimation = () => {
    if (chatBoxRef.current) {
      chatBoxRef.current.classList.add(styles.fadeIn);
      setTimeout(() => {
        if (chatBoxRef.current) {
          chatBoxRef.current.classList.remove(styles.fadeIn);
        }
      }, 500);
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

  // 獲取基於當前模式的樣式
  const getButtonClassName = () => {
    if (mode === 'customer_service') {
      return `${styles.chatButton} ${styles.customerButton}`;
    } else if (walletModeEnabled) {
      return `${styles.chatButton} ${styles.walletButton}`; // 新增錢包按鈕樣式
    } else {
      return styles.chatButton;
    }
  };

  const getUserMessageClassName = () => {
    if (mode === 'customer_service') {
      return `${styles.message} ${styles.userMessage} ${styles.customerUserMessage}`;
    } else if (walletModeEnabled) {
      return `${styles.message} ${styles.userMessage} ${styles.walletUserMessage}`; // 新增錢包用戶訊息樣式
    } else {
      return `${styles.message} ${styles.userMessage}`;
    }
  };

  const getSendButtonClassName = () => {
    if (mode === 'customer_service') {
      return `${styles.sendButton} ${styles.customerSendButton}`;
    } else if (walletModeEnabled) {
      return `${styles.sendButton} ${styles.walletSendButton}`; // 新增錢包發送按鈕樣式
    } else {
      return styles.sendButton;
    }
  };

  const getInputClassName = () => {
    if (mode === 'customer_service') {
      return `${styles.messageInput} ${styles.customerInput}`;
    } else if (walletModeEnabled) {
      return `${styles.messageInput} ${styles.walletInput}`; // 新增錢包輸入框樣式
    } else {
      return `${styles.messageInput} ${styles.aiInput}`;
    }
  };

  const getActiveModeClassName = (buttonMode) => {
    if (buttonMode === mode) {
      if (mode === 'customer_service') {
        return `${styles.optionButton} ${styles.activeMode} ${styles.activeCustomerMode}`;
      } else if (walletModeEnabled) {
        return `${styles.optionButton} ${styles.activeMode} ${styles.activeWalletMode}`; // 新增錢包激活樣式
      } else {
        return `${styles.optionButton} ${styles.activeMode} ${styles.activeAiMode}`;
      }
    }
    return styles.optionButton;
  };

  const getIndicatorClassName = () => {
    if (mode === 'customer_service') {
      return `${styles.indicatorSlider} ${styles.customerIndicator}`;
    } else if (walletModeEnabled) {
      return `${styles.indicatorSlider} ${styles.walletIndicator}`; // 新增錢包指示器樣式
    } else {
      return `${styles.indicatorSlider} ${styles.aiIndicator}`;
    }
  };

  // 獲取消息對話框的標題
  const getMessageDialogTitle = () => {
    if (!selectedMessage) return '';
    if (selectedMessage.isAI) {
      if (mode === 'customer_service') {
        return '客服人員的訊息';
      } else if (walletModeEnabled) {
        return 'AI 錢包助手的訊息';
      } else {
        return 'AI 助手的訊息';
      }
    } else {
      return '您的訊息';
    }
  };

  // 獲取Header標題
  const getHeaderTitle = () => {
    if (mode === 'customer_service') {
      return 'SeaWallet 客服人員';
    } else if (walletModeEnabled) {
      return 'SeaWallet AI 錢包助手';
    } else {
      return 'SeaWallet AI 助手';
    }
  };

  // 獲取模式圖標
  const getModeIcon = () => {
    if (mode === 'customer_service') {
      return '👤';
    } else if (walletModeEnabled) {
      return '💰';
    } else {
      return '🤖';
    }
  };

  return (
    <div className={styles.chatSupportContainer}>
      {/* 右下角的按鈕 */}
      <button 
        className={getButtonClassName()} 
        onClick={toggleChat}
        aria-label="客服支援"
      >
        {isOpen ? '✕' : getModeIcon()}
      </button>

      {/* 對話框 */}
      {isOpen && (
        <div 
          ref={chatBoxRef}
          className={`${styles.chatBox} ${isDarkMode ? styles.nightMode : ''}`}
        >
          <div className={`${styles.chatHeader} ${
            mode === 'customer_service' 
              ? styles.customerHeader 
              : walletModeEnabled 
                ? styles.walletHeader 
                : styles.aiHeader
          }`}>
            <div className={styles.headerContent}>
              <div className={styles.modeIndicator}>
                {getModeIcon()}
              </div>
              <h3>{getHeaderTitle()}</h3>
            </div>
            
            {/* 主題切換按鈕 */}
            <button 
              className={styles.themeToggle} 
              onClick={toggleTheme}
              aria-label={isDarkMode ? '切換到亮色模式' : '切換到暗色模式'}
            >
              {isDarkMode ? '☀️' : '🌙'}
            </button>
            
            <button 
              className={styles.closeButton} 
              onClick={toggleChat}
              aria-label="關閉對話"
            >
              ✕
            </button>
          </div>
          
          <div className={styles.messagesContainer}>
            {messages.map((msg, index) => (
              <div 
                key={msg.id} 
                className={`${
                  msg.isSystem 
                    ? styles.systemMessage 
                    : msg.isAI 
                      ? styles.aiMessage 
                      : getUserMessageClassName()
                } ${msg.isStreaming ? styles.loadingMessage : ''} ${msg.isImportant ? styles.importantMessage : ''}`}
                style={{ 
                  animationDelay: `${index * 0.05}s`,
                  animationDuration: '0.5s'
                }}
                onClick={() => openMessageDialog(msg)}
              >
                {msg.isSystem ? (
                  <span className={styles.systemMessageBadge}>ℹ️</span>
                ) : msg.isAI ? (
                  <span className={styles.messageBadge}>
                    {mode === 'customer_service' ? '👤' : walletModeEnabled ? '💰' : '🤖'}
                  </span>
                ) : (
                  <span className={styles.userMessageBadge}>👤</span>
                )}
                <TypewriterText text={msg.text} isActive={msg.isStreaming} />
                {msg.isImportant && <span className={styles.importantBadge}>⭐</span>}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* 快速回覆按鈕 */}
          {!isLoading && messages.length > 0 && messages[messages.length - 1].isAI && (
            <div className={styles.quickReplies}>
              {quickReplies.map((reply, index) => (
                <button
                  key={index}
                  className={styles.quickReplyButton}
                  onClick={() => handleQuickReplyClick(reply)}
                >
                  {reply}
                </button>
              ))}
            </div>
          )}
          
          <form className={styles.inputContainer} onSubmit={sendMessage}>
            {/* 語音輸入按鈕 */}
            <button
              type="button"
              className={`${styles.voiceButton} ${isRecording ? styles.recording : ''}`}
              onClick={toggleVoiceInput}
              aria-label={isRecording ? '停止錄音' : '語音輸入'}
            >
              {isRecording ? '🔴' : '🎤'}
            </button>
            
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="輸入您的訊息..."
              className={getInputClassName()}
              disabled={isLoading || isRecording}
            />
            <button 
              type="submit" 
              className={getSendButtonClassName()}
              disabled={newMessage.trim() === '' || isLoading || isRecording}
            >
              {isLoading ? '發送中' : '發送'} {isLoading ? '...' : '➤'}
            </button>
          </form>
          
          <div className={styles.optionsContainer}>
            <button 
              className={getActiveModeClassName('customer_service')} 
              onClick={() => switchMode('customer_service')}
              disabled={isLoading || isRecording}
            >
              <span className={styles.optionIcon}>👤</span>
              聯繫客服
            </button>
            <button 
              className={getActiveModeClassName('ai')}
              onClick={() => switchMode('ai')}
              disabled={isLoading || isRecording}
            >
              <span className={styles.optionIcon}>
                {walletModeEnabled ? '💰' : '🤖'}
              </span>
              AI 協助
            </button>
          </div>
          
          {/* Wallet 模式開關 - 只在 AI 模式下顯示 */}
          {mode === 'ai' && (
            <div className={styles.walletModeToggle}>
              <label className={styles.toggleSwitch}>
                <input 
                  type="checkbox" 
                  checked={walletModeEnabled}
                  onChange={toggleWalletMode}
                  disabled={isLoading}
                />
                <span className={styles.toggleSlider}></span>
              </label>
              <span className={styles.walletModeLabel}>
                {walletModeEnabled ? '錢包模式已啟用' : '錢包模式'}
              </span>
              
              {/* 只在錢包模式啟用時顯示上傳文件按鈕 */}
              {walletModeEnabled && (
                <button
                  type="button"
                  onClick={openFileDialog}
                  className={styles.uploadButton}
                  disabled={isLoading}
                >
                  📄
                </button>
              )}
            </div>
          )}
          
          <div className={styles.modeIndicatorBar}>
            <div 
              className={getIndicatorClassName()} 
              style={{ 
                transform: `translateX(${mode === 'customer_service' ? '0' : '100%'})` 
              }}
            />
            <span className={styles.modeLabel}>
              目前模式: {
                mode === 'customer_service' 
                  ? '客服人員' 
                  : walletModeEnabled 
                    ? 'AI 錢包助手' 
                    : 'AI 助手'
              }
            </span>
          </div>
        </div>
      )}

      {/* 訊息對話框 */}
      {dialogOpen && selectedMessage && (
        <div className={`${styles.messageDialog} ${isDarkMode ? styles.nightMode : ''}`}>
          <div 
            ref={dialogRef}
            className={`${styles.messageDialogContent} ${
              selectedMessage.isAI 
                ? mode === 'customer_service' 
                  ? styles.customerDialogContent 
                  : walletModeEnabled 
                    ? styles.walletDialogContent 
                    : styles.aiDialogContent 
                : styles.userDialogContent
            }`}
          >
            <div className={styles.messageDialogHeader}>
              <h4>{getMessageDialogTitle()}</h4>
              <button 
                className={styles.dialogCloseBtn}
                onClick={closeMessageDialog}
                aria-label="關閉訊息對話框"
              >
                ✕
              </button>
            </div>
            
            <div className={styles.messageDialogBody}>
              <p className={styles.messageDialogText}>
                {selectedMessage.text}
              </p>
              
              <div className={styles.messageDialogTime}>
                <small>
                  {new Date().toLocaleTimeString()} · {selectedMessage.isAI ? '由系統發送' : '由您發送'}
                </small>
              </div>
            </div>
            
            <div className={styles.messageDialogActions}>
              <button 
                className={styles.dialogActionBtn}
                onClick={copyMessageText}
              >
                📋 複製
              </button>
              <button 
                className={styles.dialogActionBtn}
                onClick={markAsImportant}
              >
                {selectedMessage.isImportant ? '⭐ 取消標記' : '⭐ 標記重要'}
              </button>
              <button 
                className={`${styles.dialogActionBtn} ${styles.dialogDeleteBtn}`}
                onClick={deleteMessage}
              >
                🗑️ 刪除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 文件上傳對話框 */}
      {fileDialogOpen && (
        <div className={`${styles.messageDialog} ${isDarkMode ? styles.nightMode : ''}`}>
          <div 
            ref={fileDialogRef}
            className={`${styles.messageDialogContent} ${styles.fileDialogContent}`}
          >
            <div className={styles.messageDialogHeader}>
              <h4>上傳文件</h4>
              <button 
                className={styles.dialogCloseBtn}
                onClick={closeFileDialog}
                aria-label="關閉文件上傳對話框"
              >
                ✕
              </button>
            </div>            
            <div className={styles.fileDialogBody}>
              <p>請上傳文件以增強 AI 錢包助手的功能。上傳的文件將直接用於問答上下文，同時系統會自動獲取您的錢包狀態信息。</p>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".txt,.csv,.json,.md"
                className={styles.fileInput}
              />
              <div className={styles.fileUploadArea} onClick={() => fileInputRef.current?.click()}>
                <div className={styles.uploadIcon}>📄</div>
                <p>點擊或拖拽文件至此</p>
                <small>支持 .txt, .csv, .json, .md 格式</small>
              </div>
            </div>    
            <div className={styles.messageDialogActions}>
              <button 
                className={styles.dialogActionBtn}
                onClick={closeFileDialog}
              >
                取消
              </button>
              <button 
                className={`${styles.dialogActionBtn} ${styles.confirmUploadBtn}`}
                onClick={() => fileInputRef.current?.click()}
              >
                選擇文件
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatSupport;