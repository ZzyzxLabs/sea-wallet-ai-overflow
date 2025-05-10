"use client"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Box, Text, Heading, Separator, Tabs, TextArea, Spinner } from '@radix-ui/themes';
import { useCallback, useEffect, useState, useRef } from 'react';
import { X, ArrowLeft, Plus, Upload, FileText, Waves } from 'lucide-react';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { useNetworkVariable } from '../../app/networkConfig';
import { getObjectExplorerLink } from '../../store/sealWill/Will_utils';
import { getAllowlistedKeyServers, SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';

// 海洋主題樣式
const oceanTheme = {
  // 顏色配置
  colors: {
    primary: '#0077be',
    secondary: '#00a8e8',
    accent: '#00c9ff',
    background: {
      light: '#f0f9ff',
      card: 'rgba(255, 255, 255, 0.95)',
      glassMorphism: 'rgba(255, 255, 255, 0.85)',
    },
    text: {
      primary: '#0e4167',
      secondary: '#4a6fa5',
      light: '#7294b5',
    },
    wave: {
      light: '#e6f7ff',
      medium: '#bae7ff',
      dark: '#69c0ff',
    },
  },
  
  // 漸層配置
  gradients: {
    ocean: 'linear-gradient(135deg, #0077be 0%, #00a8e8 50%, #00c9ff 100%)',
    oceanLight: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 50%, #91d5ff 100%)',
    oceanDeep: 'linear-gradient(180deg, #003459 0%, #007ea7 50%, #00a8e8 100%)',
    card: 'linear-gradient(145deg, rgba(255,255,255,0.95) 0%, rgba(230,247,255,0.9) 100%)',
  },
  
  // 陰影配置
  shadows: {
    soft: '0 4px 6px -1px rgba(0, 119, 190, 0.1), 0 2px 4px -1px rgba(0, 119, 190, 0.06)',
    medium: '0 10px 15px -3px rgba(0, 119, 190, 0.15), 0 4px 6px -2px rgba(0, 119, 190, 0.1)',
    wave: '0 10px 25px -3px rgba(0, 168, 232, 0.2), 0 6px 10px -2px rgba(0, 201, 255, 0.1)',
  },
  
  // 動畫配置
  animations: {
    wave: 'wave 3s ease-in-out infinite',
    float: 'float 6s ease-in-out infinite',
    ripple: 'ripple 1.5s linear infinite',
  },
};

// 全域樣式（放在組件外部）
const globalStyles = `
  @keyframes wave {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-20px); }
  }
  
  @keyframes ripple {
    0% { transform: scale(0.95); opacity: 1; }
    100% { transform: scale(1.2); opacity: 0; }
  }
  
  .ocean-gradient {
    background: ${oceanTheme.gradients.ocean};
  }
  
  .ocean-card {
    background: ${oceanTheme.colors.background.glassMorphism};
    backdrop-filter: blur(10px);
    border: 1px solid rgba(0, 119, 190, 0.1);
    border-radius: 16px;
    box-shadow: ${oceanTheme.shadows.wave};
    transition: all 0.3s ease;
  }
  
  .ocean-card:hover {
    box-shadow: ${oceanTheme.shadows.medium};
    transform: translateY(-2px);
  }
  
  .ocean-button {
    background: ${oceanTheme.gradients.ocean};
    color: white;
    border: none;
    border-radius: 12px;
    padding: 10px 20px;
    font-weight: 600;
    box-shadow: ${oceanTheme.shadows.soft};
    transition: all 0.3s ease;
    position: relative;
    overflow: hidden;
  }
  
  .ocean-button:before {
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    width: 0;
    height: 0;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.2);
    transform: translate(-50%, -50%);
    transition: width 0.6s, height 0.6s;
  }
  
  .ocean-button:hover {
    transform: translateY(-2px);
    box-shadow: ${oceanTheme.shadows.medium};
  }
  
  .ocean-button:hover:before {
    width: 300px;
    height: 300px;
  }
  
  .ocean-input {
    background: rgba(255, 255, 255, 0.9);
    border: 2px solid ${oceanTheme.colors.wave.medium};
    border-radius: 12px;
    padding: 12px 16px;
    transition: all 0.3s ease;
    color: ${oceanTheme.colors.text.primary};
  }
  
  .ocean-input:focus {
    outline: none;
    border-color: ${oceanTheme.colors.secondary};
    box-shadow: 0 0 0 3px rgba(0, 168, 232, 0.2);
  }
  
  .ocean-header {
    background: ${oceanTheme.gradients.oceanDeep};
    color: white;
    padding: 20px;
    border-radius: 16px 16px 0 0;
    position: relative;
    overflow: hidden;
  }
  
  .ocean-header:before {
    content: '';
    position: absolute;
    bottom: -50%;
    left: -50%;
    width: 200%;
    height: 100%;
    background: url("data:image/svg+xml,%3Csvg width='100' height='20' viewBox='0 0 100 20' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 10C25 10 25 0 50 0C75 0 75 10 100 10C125 10 125 0 150 0' stroke='rgba(255,255,255,0.1)' stroke-width='2'/%3E%3C/svg%3E") repeat-x;
    animation: ${oceanTheme.animations.wave};
  }
  
  .wave-decoration {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 60px;
    background: url("data:image/svg+xml,%3Csvg width='100%25' height='60' viewBox='0 0 1200 60' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 30C200 60 400 0 600 30C800 60 1000 0 1200 30V60H0V30Z' fill='%23e6f7ff'/%3E%3C/svg%3E");
    background-size: cover;
  }
`;

// 注入全域樣式
if (typeof document !== 'undefined' && !document.querySelector('#ocean-theme-styles')) {
  const styleSheet = document.createElement('style');
  styleSheet.id = 'ocean-theme-styles';
  styleSheet.textContent = globalStyles;
  document.head.appendChild(styleSheet);
}

// 原有的接口定義保持不變
export interface Cap {
  id: string;
  service_id: string;
}

export interface CardItem {
  cap_id: string;
  willlist_id: string;
  list: string[];
  name: string;
}

export interface Willlist {
  id: string;
  name: string;
  list: string[];
}

export type Data = {
  status: string;
  blobId: string;
  endEpoch: string;
  suiRefType: string;
  suiRef: string;
  suiBaseUrl: string;
  blobUrl: string;
  suiUrl: string;
  isImage: string;
};

type WalrusService = {
  id: string;
  name: string;
  publisherUrl: string;
  aggregatorUrl: string;
};

// Walrus上傳組件
function WalrusUploader({ willlistId, capId }: { willlistId: string; capId: string }) {
  const [file, setFile] = useState<File | null>(null);
  const [info, setInfo] = useState<Data | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('service1');
  const [currentRetry, setCurrentRetry] = useState<number>(0);
  const [textInput, setTextInput] = useState<string>('');
  const maxRetries = 2;

  const SUI_VIEW_TX_URL = `https://suiscan.xyz/testnet/tx`;
  const SUI_VIEW_OBJECT_URL = `https://suiscan.xyz/testnet/object`;

  const NUM_EPOCH = 1;
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const client = new SealClient({
    suiClient,
    serverObjectIds: getAllowlistedKeyServers('testnet'),
    verifyKeyServers: false,
  });

  const services: WalrusService[] = [
    {
      id: 'service1',
      name: 'walrus.space',
      publisherUrl: '/publisher1',
      aggregatorUrl: '/aggregator1',
    },
    {
      id: 'service2',
      name: 'staketab.org',
      publisherUrl: '/publisher2',
      aggregatorUrl: '/aggregator2',
    },
    {
      id: 'service3',
      name: 'redundex.com',
      publisherUrl: '/publisher3',
      aggregatorUrl: '/aggregator3',
    },
    {
      id: 'service4',
      name: 'nodes.guru',
      publisherUrl: '/publisher4',
      aggregatorUrl: '/aggregator4',
    },
    {
      id: 'service5',
      name: 'banansen.dev',
      publisherUrl: '/publisher5',
      aggregatorUrl: '/aggregator5',
    },
    {
      id: 'service6',
      name: 'everstake.one',
      publisherUrl: '/publisher6',
      aggregatorUrl: '/aggregator6',
    },
  ];

  function getAggregatorUrl(path: string): string {
    const service = services.find((s) => s.id === selectedService);
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `${service?.aggregatorUrl}/v1/${cleanPath}`;
  }

  function getPublisherUrl(path: string): string {
    const service = services.find((s) => s.id === selectedService);
    const cleanPath = path.replace(/^\/+/, '').replace(/^v1\//, '');
    return `${service?.publisherUrl}/v1/${cleanPath}`;
  }

  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  const handleFileChange = (event: any) => {
    const file = event.target.files[0];
    // Max 10 MiB size
    if (file.size > 10 * 1024 * 1024) {
      alert('檔案大小必須小於 10 MiB');
      return;
    }
    setFile(file);
    setInfo(null);
  };

  // 文字轉檔案並上傳
  const handleTextUpload = () => {
    if (!textInput.trim()) {
      alert('請輸入要上傳的文字');
      return;
    }

    // 創建文字文件
    const textFile = new File([textInput], "text-upload.txt", {
      type: "text/plain",
    });

    // 設置檔案並自動開始上傳
    setFile(textFile);
    setInfo(null);
    
    // 使用setTimeout確保state更新後再開始上傳
    setTimeout(() => {
      handleSubmit(textFile);
    }, 0);
  };

  const handleSubmit = (uploadFile?: File) => {
    setIsUploading(true);
    const fileToUpload = uploadFile || file;
    
    if (fileToUpload) {
      const reader = new FileReader();
      reader.onload = async function (event) {
        if (event.target && event.target.result) {
          const result = event.target.result;
          if (result instanceof ArrayBuffer) {
            try {
              const nonce = crypto.getRandomValues(new Uint8Array(5));
              const policyObjectBytes = fromHex(willlistId);
              const id = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));
              const { encryptedObject: encryptedBytes } = await client.encrypt({
                threshold: 2,
                packageId,
                id,
                data: new Uint8Array(result),
              });
              
              try {
                const storageInfo = await storeBlob(encryptedBytes);
                displayUpload(storageInfo.info, fileToUpload.type);
                setIsUploading(false);
                setCurrentRetry(0); // 重設重試計數
              } catch (error) {
                handleUploadRetry(fileToUpload, encryptedBytes);
              }
            } catch (error) {
              console.error('加密過程中發生錯誤:', error);
              setIsUploading(false);
            }
          } else {
            console.error('意外的結果類型:', typeof result);
            setIsUploading(false);
          }
        }
      };
      reader.readAsArrayBuffer(fileToUpload);
    } else {
      console.error('未選擇檔案');
      setIsUploading(false);
    }
  };

  // 處理上傳重試
  const handleUploadRetry = (fileToUpload: File, encryptedBytes: Uint8Array) => {
    if (currentRetry < maxRetries) {
      // 選擇下一個服務
      const nextServiceIndex = (services.findIndex(s => s.id === selectedService) + 1) % services.length;
      const nextService = services[nextServiceIndex];
      
      console.log(`上傳失敗，正在重試... (${currentRetry + 1}/${maxRetries}) 嘗試服務: ${nextService.name}`);
      setSelectedService(nextService.id);
      setCurrentRetry(prev => prev + 1);
      
      // 使用新服務重試上傳
      setTimeout(async () => {
        try {
          const storageInfo = await storeBlob(encryptedBytes);
          displayUpload(storageInfo.info, fileToUpload.type);
          setIsUploading(false);
          setCurrentRetry(0); // 重設重試計數
        } catch (error) {
          handleUploadRetry(fileToUpload, encryptedBytes);
        }
      }, 500); // 短暫延遲以確保狀態更新
    } else {
      alert('已達到最大重試次數，上傳失敗。請稍後再試。');
      setIsUploading(false);
      setCurrentRetry(0);
    }
  };

  const displayUpload = (storage_info: any, media_type: any) => {
    let info;
    if ('alreadyCertified' in storage_info) {
      info = {
        status: '已認證',
        blobId: storage_info.alreadyCertified.blobId,
        endEpoch: storage_info.alreadyCertified.endEpoch,
        suiRefType: 'Previous Sui Certified Event',
        suiRef: storage_info.alreadyCertified.event.txDigest,
        suiBaseUrl: SUI_VIEW_TX_URL,
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.alreadyCertified.blobId}`),
        suiUrl: `${SUI_VIEW_OBJECT_URL}/${storage_info.alreadyCertified.event.txDigest}`,
        isImage: media_type.startsWith('image'),
      };
    } else if ('newlyCreated' in storage_info) {
      info = {
        status: '新建立',
        blobId: storage_info.newlyCreated.blobObject.blobId,
        endEpoch: storage_info.newlyCreated.blobObject.storage.endEpoch,
        suiRefType: 'Associated Sui Object',
        suiRef: storage_info.newlyCreated.blobObject.id,
        suiBaseUrl: SUI_VIEW_OBJECT_URL,
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.newlyCreated.blobObject.blobId}`),
        suiUrl: `${SUI_VIEW_OBJECT_URL}/${storage_info.newlyCreated.blobObject.id}`,
        isImage: media_type.startsWith('image'),
      };
    } else {
      throw Error('未處理的成功回應！');
    }
    setInfo(info);
  };

  const storeBlob = async (encryptedData: Uint8Array) => {
    try {
      console.log(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`)}`);
      const response = await fetch(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`)}`, {
        method: 'PUT',
        body: encryptedData,
      });
      
      if (response.status === 200) {
        return response.json().then((info) => {
          return { info };
        });
      } else {
        throw new Error('存儲 blob 時發生錯誤');
      }
    } catch (error) {
      console.error('Walrus 存儲錯誤:', error);
      throw error; // 重新拋出錯誤以便重試邏輯捕獲
    }
  };

  async function handlePublish() {
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::will::publish`,
      arguments: [tx.object(willlistId), tx.object(capId), tx.pure.string(info!.blobId)],
    });

    tx.setGasBudget(10000000);
    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async (result) => {
          console.log('交易結果', result);
          alert('Blob 已成功關聯，現在您可以分享連結或上傳更多內容。');
        },
        onError: (error) => {
          console.error('發布交易失敗:', error);
          alert('發布失敗，請稍後再試');
        }
      },
    );
  }

  return (
    <Card className="ocean-card" style={{ padding: '24px' }}>
      <Tabs.Root defaultValue="file">
        <Tabs.List style={{ 
          background: oceanTheme.gradients.oceanLight, 
          borderRadius: '12px',
          padding: '4px',
          marginBottom: '20px'
        }}>
          <Tabs.Trigger value="file" style={{ 
            borderRadius: '8px', 
            padding: '8px 16px',
            color: oceanTheme.colors.text.primary,
            fontWeight: '600'
          }}>
            <Upload size={16} style={{ marginRight: '8px' }} />
            檔案上傳
          </Tabs.Trigger>
          <Tabs.Trigger value="text" style={{ 
            borderRadius: '8px', 
            padding: '8px 16px',
            color: oceanTheme.colors.text.primary,
            fontWeight: '600'
          }}>
            <FileText size={16} style={{ marginRight: '8px' }} />
            文字上傳
          </Tabs.Trigger>
        </Tabs.List>
        
        <Box style={{ padding: '16px 0' }}>
          <Tabs.Content value="file">
            <Flex direction="column" gap="3">
              <Flex gap="3" align="center">
                <Text size="3" style={{ color: oceanTheme.colors.text.secondary, fontWeight: '500' }}>
                  選擇 Walrus 服務:
                </Text>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  aria-label="選擇 Walrus 服務"
                  className="ocean-input"
                  style={{ minWidth: '200px' }}
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Flex>
              
              <Box 
                style={{ 
                  border: `2px dashed ${oceanTheme.colors.wave.medium}`,
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  background: oceanTheme.colors.wave.light,
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <input
                  type="file"
                  onChange={handleFileChange}
                  style={{ 
                    position: 'absolute',
                    opacity: 0,
                    width: '100%',
                    height: '100%',
                    cursor: 'pointer'
                  }}
                />
                <Waves size={48} style={{ marginBottom: '12px', color: oceanTheme.colors.primary }} />
                <Text size="3" style={{ display: 'block', color: oceanTheme.colors.text.secondary }}>
                  拖曳檔案至此處或點擊選擇檔案
                </Text>
                <Text size="2" style={{ display: 'block', marginTop: '8px', color: oceanTheme.colors.text.light }}>
                  檔案大小必須小於 10 MiB
                </Text>
              </Box>
              
              {file && (
                <Card style={{ 
                  background: oceanTheme.colors.wave.light,
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <Text size="2" style={{ color: oceanTheme.colors.text.primary }}>
                    已選擇: {file.name}
                  </Text>
                </Card>
              )}
              
              <Button
                className="ocean-button"
                onClick={() => handleSubmit()}
                disabled={file === null || isUploading}
                style={{ marginTop: '16px' }}
              >
                {isUploading ? (
                  <Flex align="center" gap="2">
                    <Spinner size="1" />
                    正在加密上傳...
                  </Flex>
                ) : (
                  <>
                    <Upload size={16} style={{ marginRight: '8px' }} />
                    步驟 1: 加密並上傳至 Walrus
                  </>
                )}
              </Button>
            </Flex>
          </Tabs.Content>
          
          <Tabs.Content value="text">
            <Flex direction="column" gap="3">
              <Text size="3" style={{ color: oceanTheme.colors.text.secondary, fontWeight: '500' }}>
                輸入要上傳的文字:
              </Text>
              <TextArea 
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="在此輸入文字..."
                className="ocean-input"
                style={{ minHeight: '150px', resize: 'vertical' }}
              />
              
              <Flex gap="3" align="center">
                <Text size="3" style={{ color: oceanTheme.colors.text.secondary, fontWeight: '500' }}>
                  選擇 Walrus 服務:
                </Text>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  aria-label="選擇 Walrus 服務"
                  className="ocean-input"
                  style={{ minWidth: '200px' }}
                >
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </Flex>
              
              <Button
                className="ocean-button"
                onClick={handleTextUpload}
                disabled={textInput.trim() === '' || isUploading}
                style={{ marginTop: '16px' }}
              >
                {isUploading ? (
                  <Flex align="center" gap="2">
                    <Spinner size="1" />
                    正在轉換上傳...
                  </Flex>
                ) : (
                  <>
                    <FileText size={16} style={{ marginRight: '8px' }} />
                    轉換為文字檔並上傳
                  </>
                )}
              </Button>
            </Flex>
          </Tabs.Content>
        </Box>
      </Tabs.Root>
      
      {isUploading && (
        <Card style={{ 
          marginTop: '16px',
          padding: '16px',
          background: oceanTheme.colors.wave.light,
          borderRadius: '12px'
        }}>
          <Flex align="center" gap="3">
            <Spinner size="2" />
            <Text size="3" style={{ color: oceanTheme.colors.text.primary }}>
              正在上傳至 Walrus {currentRetry > 0 ? `(重試 ${currentRetry}/${maxRetries})` : ''}
            </Text>
          </Flex>
        </Card>
      )}
      
      {info && (
        <Card style={{ 
          padding: '20px', 
          marginTop: '20px',
          background: oceanTheme.gradients.card,
          borderRadius: '16px',
          border: `1px solid ${oceanTheme.colors.wave.medium}`
        }}>
          <Heading size="4" style={{ marginBottom: '16px', color: oceanTheme.colors.primary }}>
            上傳資訊
          </Heading>
          <Flex direction="column" gap="3">
            <Text size="3" style={{ color: oceanTheme.colors.text.primary }}>
              <strong>狀態:</strong> {info.status}
            </Text>
            <Text size="3" style={{ color: oceanTheme.colors.text.primary, wordBreak: 'break-all' }}>
              <strong>Blob ID:</strong> {info.blobId}
            </Text>
            <Flex gap="3" style={{ marginTop: '12px' }}>
              <Button 
                size="2" 
                variant="outline" 
                asChild
                style={{ 
                  borderColor: oceanTheme.colors.primary,
                  color: oceanTheme.colors.primary,
                  borderRadius: '8px'
                }}
              >
                <a
                  href={info.blobUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看加密 Blob
                </a>
              </Button>
              <Button 
                size="2" 
                variant="outline" 
                asChild
                style={{ 
                  borderColor: oceanTheme.colors.secondary,
                  color: oceanTheme.colors.secondary,
                  borderRadius: '8px'
                }}
              >
                <a
                  href={info.suiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  查看 Sui 物件
                </a>
              </Button>
            </Flex>
          </Flex>
        </Card>
      )}
      
      <Button
        className="ocean-button"
        onClick={handlePublish}
        disabled={!info || isUploading || !willlistId || !capId}
        style={{ marginTop: '24px', width: '100%' }}
      >
        步驟 2: 將檔案關聯至 Sui 物件
      </Button>
    </Card>
  );
}

// Will管理組件
function WilllistManager({ willlistId, capId, onBack, style }: { willlistId: string; capId: string; onBack: () => void; style?: React.CSSProperties }) {
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [willlist, setWilllist] = useState<Willlist>();
  const [newAddress, setNewAddress] = useState('');
  const [activeTab, setActiveTab] = useState('addresses'); // 'addresses' 或 'upload'

  useEffect(() => {
    async function getWilllist() {
      if (!currentAccount?.address || !willlistId) {
        return;
      }

      try {
        // 加載 willlist 數據
        const willlistObj = await suiClient.getObject({
          id: willlistId,
          options: { showContent: true },
        });
        
        const fields = (willlistObj.data?.content as { fields: any })?.fields || {};

        setWilllist({ id: willlistId, name: fields.name, list: fields.list });
      } catch (error) {
        console.error('[getWilllist] 發生錯誤:', error);
      }
    }

    getWilllist();

    const intervalId = setInterval(() => {
      getWilllist();
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, [willlistId, suiClient, currentAccount]);

  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) => {
      const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      });
      return result;
    },
  });

  const grantAccess = (addressToGrant: string) => {
    if (addressToGrant.trim() !== '') {
      if (!isValidSuiAddress(addressToGrant.trim())) {
        alert('無效的地址');
        return;
      }
      const tx = new Transaction();
      tx.moveCall({
        arguments: [
          tx.object(addressToGrant),
          tx.object(willlistId),
          tx.object(capId),
        ],
        target: `${packageId}::will::grant_access`,
      });

      signAndExecute(
        {
          transaction: tx,
        },
        {
          onSuccess: async (result) => {
            console.log('[grantAccess] 交易成功:', result);
            setNewAddress(''); // 清空輸入框
          },
          onError: (error) => {
            console.error('[grantAccess] 交易失敗:', error);
          }
        },
      );
    } else {
      console.warn('[grantAccess] 地址為空，不執行操作');
    }
  };

  const removeAccess = (address: string) => {
    if (!address || !willlistId || !capId) return;
    
    const tx = new Transaction();
    tx.moveCall({
      arguments: [
        tx.object(address),
        tx.object(willlistId),
        tx.object(capId),
      ],
      target: `${packageId}::will::remove_access`,
    });

    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async (result) => {
          console.log('[removeAccess] 交易成功:', result);
        },
        onError: (error) => {
          console.error('[removeAccess] 交易失敗:', error);
        }
      },
    );
  };

  return (
    <Card className="ocean-card" style={{ padding: 0, borderRadius: '20px', overflow: 'hidden' }}>
      <Box className="ocean-header">
        <Flex align="center" justify="between">
          <Flex align="center" gap="3">
            <Button 
              variant="ghost" 
              onClick={onBack}
              style={{ 
                color: 'white',
                padding: '8px',
                borderRadius: '8px'
              }}
            >
              <ArrowLeft size={20} />
            </Button>
            <Heading size="5" style={{ margin: 0 }}>{willlist?.name || 'Will 管理'}</Heading>
          </Flex>
        </Flex>
      </Box>
      
      <Box style={{ padding: '24px' }}>
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <Tabs.List style={{ 
            background: oceanTheme.gradients.oceanLight, 
            borderRadius: '12px',
            padding: '4px',
            marginBottom: '20px'
          }}>
            <Tabs.Trigger value="addresses" style={{ 
              borderRadius: '8px', 
              padding: '8px 16px',
              color: oceanTheme.colors.text.primary,
              fontWeight: '600'
            }}>
              地址管理
            </Tabs.Trigger>
            <Tabs.Trigger value="upload" style={{ 
              borderRadius: '8px', 
              padding: '8px 16px',
              color: oceanTheme.colors.text.primary,
              fontWeight: '600'
            }}>
              檔案上傳
            </Tabs.Trigger>
          </Tabs.List>
          
          <Box style={{ padding: '16px 0' }}>
            <Tabs.Content value="addresses">
              <Box style={{ marginBottom: '24px' }}>
                <Flex gap="3" style={{ marginBottom: '24px' }}>
                  <input
                    type="text"
                    value={newAddress}
                    onChange={(e) => setNewAddress(e.target.value)}
                    placeholder="輸入要添加的地址"
                    className="ocean-input"
                    style={{ flex: 1 }}
                  />
                  <Button 
                    className="ocean-button"
                    onClick={() => grantAccess(newAddress)}
                  >
                    <Plus size={16} style={{ marginRight: '8px' }} />
                    添加地址
                  </Button>
                </Flex>
                
                <Text size="3" style={{ marginBottom: '12px', color: oceanTheme.colors.text.secondary, fontWeight: '600' }}>
                  地址列表
                </Text>
                <div className="flex flex-col gap-2">
                  {willlist?.list?.length === 0 && (
                    <Card style={{ 
                      padding: '24px', 
                      textAlign: 'center',
                      background: oceanTheme.colors.wave.light,
                      borderRadius: '12px'
                    }}>
                      <Text size="3" style={{ color: oceanTheme.colors.text.light }}>
                        當前列表為空，請添加地址
                      </Text>
                    </Card>
                  )}
                  
                  {willlist?.list?.map((address) => (
                    <Card key={address} className="ocean-card" style={{ padding: '16px' }}>
                      <Flex align="center" justify="between">
                        <Text size="3" style={{ fontFamily: 'monospace', color: oceanTheme.colors.text.primary }}>
                          {address}
                        </Text>
                        <Button 
                          variant="ghost" 
                          size="2"
                          onClick={() => removeAccess(address)}
                          style={{ 
                            color: oceanTheme.colors.accent,
                            borderRadius: '8px'
                          }}
                        >
                          <X size={18} />
                        </Button>
                      </Flex>
                    </Card>
                  ))}
                </div>
              </Box>
            </Tabs.Content>
            
            <Tabs.Content value="upload">
              <WalrusUploader willlistId={willlistId} capId={capId} />
            </Tabs.Content>
          </Box>
        </Tabs.Root>
      </Box>
    </Card>
  );
}

// 主組件
export function AllWilllist({ width, height, maxWidth = '1200px', style = {} }: {
  width?: string;
  height?: string;
  maxWidth?: string;
  style?: React.CSSProperties;
}) {
  const packageId = useNetworkVariable('packageId');
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  const [cardItems, setCardItems] = useState<CardItem[]>([]);
  const [selectedWilllist, setSelectedWilllist] = useState<string | null>(null);
  const [selectedCapId, setSelectedCapId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [newWillName, setNewWillName] = useState<string>('');
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  const { mutate: signAndExecute } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showRawEffects: true,
          showEffects: true,
        },
      }),
  });

  const getCapObj = useCallback(async () => {
    if (!currentAccount?.address) return;

    const res = await suiClient.getOwnedObjects({
      owner: currentAccount?.address,
      options: {
        showContent: true,
        showType: true,
      },
      filter: {
        StructType: `${packageId}::will::Cap`,
      },
    });
    const caps = res.data
      .map((obj) => {
        const fields = (obj!.data!.content as { fields: any }).fields;
        return {
          id: fields?.id.id,
          service_id: fields?.service_id,
        };
      })
      .filter((item) => item !== null) as Cap[];
    const cardItems: CardItem[] = await Promise.all(
      caps.map(async (cap) => {
        const willlist = await suiClient.getObject({
          id: cap.service_id,
          options: { showContent: true },
        });
        const fields = (willlist.data?.content as { fields: any })?.fields || {};
        return {
          cap_id: cap.id,
          willlist_id: cap.service_id,
          list: fields.list,
          name: fields.name,
        };
      }),
    );
    setCardItems(cardItems);
  }, [currentAccount?.address, packageId, suiClient]);

  // 創建新的 willlist 函式
  const createWillList = () => {
    if (newWillName.trim() === '') {
      alert('請輸入 Will List 的名稱');
      return;
    }
    
    setIsCreating(true);
    const tx = new Transaction();
    tx.moveCall({
      target: `${packageId}::will::create_service_entry`,
      arguments: [tx.pure.string(newWillName.trim())],
    });
    tx.setGasBudget(10000000);
    
    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async (result) => {
          console.log('創建成功', result);
          // 重新獲取列表
          await getCapObj();
          setNewWillName('');
          setShowCreateModal(false);
          setIsCreating(false);
          alert('Will List 創建成功！');
        },
        onError: (error) => {
          console.error('創建失敗:', error);
          alert('創建失敗，請稍後再試');
          setIsCreating(false);
        }
      },
    );
  };

  useEffect(() => {
    getCapObj();
    
    // 定期刷新數據
    const intervalId = setInterval(() => {
      getCapObj();
    }, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [getCapObj]);

  // 處理管理按鈕點擊
  const handleManage = (willlistId: string, capId: string) => {
    setSelectedWilllist(willlistId);
    setSelectedCapId(capId);
  };

  // 處理返回按鈕點擊
  const handleBack = () => {
    setSelectedWilllist(null);
    setSelectedCapId(null);
  };

  // 顯示管理界面還是列表界面
  if (selectedWilllist && selectedCapId) {
    return (
      <Box style={{ 
        height: height || '100vh',
        width: width || '100%',
        background: oceanTheme.gradients.oceanLight,
        overflow: 'auto',
        ...style
      }}>
        <Box style={{ 
          maxWidth: maxWidth,
          margin: '0 auto',
          height: '100%'
        }}>
          <WilllistManager 
            willlistId={selectedWilllist} 
            capId={selectedCapId} 
            onBack={handleBack}
            style={{ margin: '100%' }}
          />
        </Box>
      </Box>
    );
  }

  // 顯示列表界面
  return (
    <Box style={{ 
      minHeight: height || '100vh',
      width: width || '100%',
      background: oceanTheme.gradients.oceanLight,
      padding: '40px',
      boxSizing: 'border-box',
      ...style
    }}>
      <Card className="ocean-card" style={{ 
        maxWidth: maxWidth,
        margin: '0 auto', 
        padding: 0, 
        overflow: 'hidden',
        height: height ? 'calc(100% - 80px)' : 'auto'
      }}>
        <Box className="ocean-header" style={{ padding: '32px' }}>
          <Flex justify="between" align="center">
            <Box>
              <Heading size="6" style={{ marginBottom: '12px' }}>
                Admin View: Owned Willlists
              </Heading>
              <Text size="3" style={{ color: 'rgba(255,255,255,0.9)' }}>
                管理您創建的所有 Willlist，點擊管理按鈕編輯 willlist 並上傳新檔案。
              </Text>
            </Box>
            <Button
              className="ocean-button"
              onClick={() => setShowCreateModal(true)}
              size="3"
            >
              <Plus size={20} style={{ marginRight: '8px' }} />
              創建新的 Will
            </Button>
          </Flex>
        </Box>
        
        {/* 創建新 Will 的模態框 */}
        {showCreateModal && (
          <Box style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}>
            <Card className="ocean-card" style={{
              width: '90%',
              maxWidth: '500px',
              padding: '32px',
              position: 'relative',
            }}>
              <Button
                variant="ghost"
                onClick={() => setShowCreateModal(false)}
                style={{
                  position: 'absolute',
                  right: '16px',
                  top: '16px',
                  color: oceanTheme.colors.text.secondary,
                  borderRadius: '8px',
                }}
              >
                <X size={24} />
              </Button>
              
              <Heading size="5" style={{ marginBottom: '24px', color: oceanTheme.colors.text.primary }}>
                創建新的 Will List
              </Heading>
              
              <Flex direction="column" gap="4">
                <Text size="3" style={{ color: oceanTheme.colors.text.secondary }}>
                  請輸入 Will List 名稱：
                </Text>
                <input
                  type="text"
                  value={newWillName}
                  onChange={(e) => setNewWillName(e.target.value)}
                  placeholder="輸入名稱..."
                  className="ocean-input"
                  style={{ marginBottom: '16px' }}
                  autoFocus
                />
                
                <Flex gap="3" justify="end">
                  <Button
                    variant="soft"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewWillName('');
                    }}
                    style={{
                      borderRadius: '8px',
                      color: oceanTheme.colors.text.secondary,
                    }}
                  >
                    取消
                  </Button>
                  <Button
                    className="ocean-button"
                    onClick={createWillList}
                    disabled={isCreating || newWillName.trim() === ''}
                  >
                    {isCreating ? (
                      <Flex align="center" gap="2">
                        <Spinner size="1" />
                        創建中...
                      </Flex>
                    ) : (
                      '創建'
                    )}
                  </Button>
                </Flex>
              </Flex>
            </Card>
          </Box>
        )}
        
        <Box style={{ padding: '32px' }}>
          {cardItems.length === 0 && (
            <Card style={{ 
              padding: '48px', 
              textAlign: 'center',
              background: oceanTheme.colors.wave.light,
              borderRadius: '16px'
            }}>
              <Waves size={64} style={{ marginBottom: '16px', color: oceanTheme.colors.primary }} />
              <Text size="4" style={{ color: oceanTheme.colors.text.secondary }}>
                沒有找到 Willlist
              </Text>
              <Button
                className="ocean-button"
                onClick={() => setShowCreateModal(true)}
                style={{ marginTop: '16px' }}
              >
                <Plus size={16} style={{ marginRight: '8px' }} />
                創建第一個 Will
              </Button>
            </Card>
          )}
          
          <Box style={{ display: 'grid', gap: '16px' }}>
            {cardItems.map((item) => (
              <Card key={`${item.cap_id} - ${item.willlist_id}`} className="ocean-card" style={{ padding: '24px' }}>
                <Flex justify="between" align="center">
                  <Box>
                    <Heading size="4" style={{ marginBottom: '8px', color: oceanTheme.colors.text.primary }}>
                      {item.name}
                    </Heading>
                    <Text size="2" style={{ color: oceanTheme.colors.text.secondary }}>
                      ID: {getObjectExplorerLink(item.willlist_id)}
                    </Text>
                  </Box>
                  <Button
                    className="ocean-button"
                    onClick={() => handleManage(item.willlist_id, item.cap_id)}
                  >
                    管理
                  </Button>
                </Flex>
              </Card>
            ))}
          </Box>
        </Box>
      </Card>
    </Box>
  );
}