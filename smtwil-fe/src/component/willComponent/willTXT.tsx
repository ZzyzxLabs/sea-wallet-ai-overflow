'use client';

import { useState } from 'react';

export default function TextToFileComponent() {
  // 狀態管理
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('我的文件.txt');

  // 打開模態框
  const openModal = () => {
    setIsModalOpen(true);
  };

  // 關閉模態框
  const closeModal = () => {
    setIsModalOpen(false);
    setText('');
  };

  // 處理文字輸入變更
  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  // 處理檔名輸入變更
  const handleFileNameChange = (e) => {
    setFileName(e.target.value);
  };

  // 生成並下載文字檔
  const generateTextFile = () => {
    if (!text.trim()) {
      alert('請輸入文字內容！');
      return;
    }

    // 創建 Blob 對象
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    
    // 創建下載連結
    const url = URL.createObjectURL(blob);
    
    // 創建臨時下載元素
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName.endsWith('.txt') ? fileName : `${fileName}.txt`;
    
    // 模擬點擊下載
    document.body.appendChild(link);
    link.click();
    
    // 清理
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // 關閉模態框
    closeModal();
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      {/* 按鈕 */}
      <button
        onClick={openModal}
        className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
      >
        新增文字檔
      </button>

      {/* 模態框背景 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {/* 模態框內容 */}
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-xl font-bold mb-4">輸入文字內容</h2>
            
            {/* 檔案名稱輸入 */}
            <div className="mb-4">
              <label htmlFor="fileName" className="block text-sm font-medium text-gray-700 mb-1">
                檔案名稱
              </label>
              <input
                type="text"
                id="fileName"
                value={fileName}
                onChange={handleFileNameChange}
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* 文字輸入區域 */}
            <div className="mb-4">
              <label htmlFor="textContent" className="block text-sm font-medium text-gray-700 mb-1">
                文字內容
              </label>
              <textarea
                id="textContent"
                value={text}
                onChange={handleTextChange}
                rows={6}
                placeholder="請在此輸入文字..."
                className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              ></textarea>
            </div>
            
            {/* 按鈕區域 */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400"
              >
                取消
              </button>
              <button
                onClick={generateTextFile}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                確認並下載
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}