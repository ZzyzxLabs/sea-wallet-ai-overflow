"use client"
import { useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Box, Text, Heading, Separator, Tabs, TextArea, Spinner } from '@radix-ui/themes';
import { useState } from 'react';
import { Upload, FileText, Waves } from 'lucide-react';
import { useNetworkVariable } from '../../../app/networkConfig';
import { getAllowlistedKeyServers, SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { oceanTheme } from '../theme/oceanTheme';
import { Data, WalrusService } from '../types';
import { walrusServices, getAggregatorUrl, getPublisherUrl } from '../utils';

interface WalrusUploaderProps {
  willlistId: string;
  capId: string;
}

export function WalrusUploader({ willlistId, capId }: WalrusUploaderProps) {
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
    if (file.size > 10 * 1024 * 1024) {
      alert('檔案大小必須小於 10 MiB');
      return;
    }
    setFile(file);
    setInfo(null);
  };

  const handleTextUpload = () => {
    if (!textInput.trim()) {
      alert('請輸入要上傳的文字');
      return;
    }

    const textFile = new File([textInput], "text-upload.txt", {
      type: "text/plain",
    });

    setFile(textFile);
    setInfo(null);
    
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
                setCurrentRetry(0);
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

  const handleUploadRetry = (fileToUpload: File, encryptedBytes: Uint8Array) => {
    if (currentRetry < maxRetries) {
      const nextServiceIndex = (walrusServices.findIndex(s => s.id === selectedService) + 1) % walrusServices.length;
      const nextService = walrusServices[nextServiceIndex];
      
      console.log(`上傳失敗，正在重試... (${currentRetry + 1}/${maxRetries}) 嘗試服務: ${nextService.name}`);
      setSelectedService(nextService.id);
      setCurrentRetry(prev => prev + 1);
      
      setTimeout(async () => {
        try {
          const storageInfo = await storeBlob(encryptedBytes);
          displayUpload(storageInfo.info, fileToUpload.type);
          setIsUploading(false);
          setCurrentRetry(0);
        } catch (error) {
          handleUploadRetry(fileToUpload, encryptedBytes);
        }
      }, 500);
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
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.alreadyCertified.blobId}`, selectedService),
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
        blobUrl: getAggregatorUrl(`/v1/blobs/${storage_info.newlyCreated.blobObject.blobId}`, selectedService),
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
      console.log(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`, selectedService)}`);
      const response = await fetch(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`, selectedService)}`, {
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
      throw error;
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
                  {walrusServices.map((service) => (
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
                  {walrusServices.map((service) => (
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