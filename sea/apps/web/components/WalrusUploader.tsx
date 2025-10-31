"use client"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Box, Text, Heading, Tabs, TextArea, Spinner } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { Upload, FileText, Waves } from 'lucide-react';
import { SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { oceanTheme } from '@/app/smartwill/theme';
import { Data, WalrusService } from '@/app/smartwill/types';
import { walrusServices, getAggregatorUrl, getPublisherUrl } from '@/app/smartwill/utils';
import { package_addr } from '@/utils/package';
import { getVaultAndOwnerCap } from '@/utils/queryer';
interface WalrusUploaderProps {
  willlistId: string;
  capId: string;
}

export function WalrusUploader({ willlistId, capId }: WalrusUploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const account = useCurrentAccount();
  const [info, setInfo] = useState<Data | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [selectedService, setSelectedService] = useState<string>('service1');
  const [currentRetry, setCurrentRetry] = useState<number>(0);
  const [textInput, setTextInput] = useState<string>('');
  const [willListId, setWillListId] = useState<string>(willlistId);
  const [isLoading, setIsLoading] = useState(false);
  const maxRetries = 2;
  const SUI_VIEW_TX_URL = `https://suiscan.xyz/testnet/tx`;
  const SUI_VIEW_OBJECT_URL = `https://suiscan.xyz/testnet/object`;
  const NUM_EPOCH = 1;
  const packageId = package_addr;
  const suiClient = useSuiClient();
  console.log(willlistId, capId);
  const client = new SealClient({
    suiClient: suiClient as any,
    serverConfigs: [
      { objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 }
    ],
    verifyKeyServers: false,
  });
  const [vaultData, setVaultData] = useState<{
    ownerCapObjects: SuiObjectResponse[] | null;
    vaultID: string | null;
    ownerCapId: string | null;
  } | null>(null);
  useEffect(() => {
    const fetchVaultData = async () => {
      if (!account?.address) return;

      setIsLoading(true);
      try {
        const vaultResult = await getVaultAndOwnerCap({
          suiClient,
          accountAddress: account.address,
          packageName: package_addr
        });

        console.log("Vault and OwnerCap data:", vaultResult);
        setVaultData(vaultResult || null);
      } catch (error) {
        console.error("Error fetching vault data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchVaultData();
  }, [account?.address, package_addr]);
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
      alert('File size must be less than 10 MiB');
      return;
    }
    setFile(file);
    setInfo(null);
  };

  const handleTextUpload = () => {
    if (!textInput.trim()) {
      alert('Please enter text to upload');
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
    console.log(packageId);
    if (fileToUpload) {
      const reader = new FileReader();
      reader.onload = async function (event) {
        if (event.target && event.target.result) {
          const result = event.target.result;
          if (result instanceof ArrayBuffer) {
            try {
              const nonce = crypto.getRandomValues(new Uint8Array(5));
              const policyObjectBytes = fromHex(willlistId);
              const pid = fromHex(package_addr);
              console.log(pid);
              const id = toHex(new Uint8Array([...policyObjectBytes, ...nonce]));
              const { encryptedObject: encryptedBytes } = await client.encrypt({
                threshold: 1,
                packageId: package_addr,
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
              console.error('Error during encryption:', error);
              setIsUploading(false);
            }
          } else {
            console.error('Unexpected result type:', typeof result);
            setIsUploading(false);
          }
        }
      };
      reader.readAsArrayBuffer(fileToUpload);
    } else {
      console.error('No file selected');
      setIsUploading(false);
    }
  };

  const handleUploadRetry = (fileToUpload: File, encryptedBytes: Uint8Array) => {
    if (currentRetry < maxRetries) {
      const nextServiceIndex = (walrusServices.findIndex((s: WalrusService) => s.id === selectedService) + 1) % walrusServices.length;
      const nextService = walrusServices[nextServiceIndex];

      if (!nextService) {
        alert('No more services available to retry');
        setIsUploading(false);
        return;
      }

      console.log(`Upload failed, retrying... (${currentRetry + 1}/${maxRetries}) using service: ${nextService.name}`);
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
      alert('Reached maximum retries. Upload failed. Please try again later.');
      setIsUploading(false);
      setCurrentRetry(0);
    }
  };

  const displayUpload = (storage_info: any, media_type: any) => {
    let info;
    if ('alreadyCertified' in storage_info) {
      info = {
        status: 'Already Certified',
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
        status: 'Newly Created',
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
      throw Error('Unhandled success response!');
    }
    setInfo(info);
  };

  const storeBlob = async (encryptedData: Uint8Array) => {
    try {
      console.log(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`, selectedService)}`);
      const response = await fetch(`${getPublisherUrl(`/v1/blobs?epochs=${NUM_EPOCH}`, selectedService)}`, {
        method: 'PUT',
        body: encryptedData as any,
      });

      if (response.status === 200) {
        return response.json().then((info) => {
          return { info };
        });
      } else {
        throw new Error('Error storing blob');
      }
    } catch (error) {
      console.error('Walrus storage error:', error);
      throw error;
    }
  };

  async function handlePublish() {
    const tx = new Transaction();
    console.log(info!.blobId)
    console.log(packageId)
    console.log(willListId)
    console.log(capId)
    tx.moveCall({
      target: `${package_addr}::sea_vault::publish`,
      arguments: [tx.object(vaultData!.vaultID), tx.object(capId), tx.pure.string("2"), tx.pure.string(info!.blobId)],
    });

    tx.setGasBudget(10000000);
    signAndExecute(
      {
        transaction: tx,
      },
      {
        onSuccess: async (result) => {
          console.log('Transaction result', result);
          alert('Blob successfully associated. You can now share the link or upload more content.');
        },
        onError: (error) => {
          console.error('Publish transaction failed:', error);
          alert('Publish failed, please try again later');
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
            File Upload
          </Tabs.Trigger>
          <Tabs.Trigger value="text" style={{
            borderRadius: '8px',
            padding: '8px 16px',
            color: oceanTheme.colors.text.primary,
            fontWeight: '600'
          }}>
            <FileText size={16} style={{ marginRight: '8px' }} />
            Text Upload
          </Tabs.Trigger>
        </Tabs.List>

        <Box style={{ padding: '16px 0' }}>
          <Tabs.Content value="file">
            <Flex direction="column" gap="3">
              <Flex gap="3" align="center">
                <Text size="3" style={{ color: oceanTheme.colors.text.secondary, fontWeight: '500' }}>
                  Select Walrus service:
                </Text>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  aria-label="Select Walrus service"
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
                  Drag file here or <span className='text-black'>click to select</span>
                </Text>
                <Text size="2" style={{ display: 'block', marginTop: '8px', color: oceanTheme.colors.text.light }}>
                  File size must be less than 10 MiB
                </Text>
              </Box>

              {file && (
                <Card style={{
                  background: oceanTheme.colors.wave.light,
                  padding: '12px',
                  borderRadius: '8px'
                }}>
                  <Text size="2" style={{ color: oceanTheme.colors.text.primary }}>
                    Selected: {file.name}
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
                    Encrypting and uploading...
                  </Flex>
                ) : (
                  <>
                    <Upload size={16} style={{ marginRight: '8px' }} />
                    Step 1: Encrypt and upload to Walrus
                  </>
                )}
              </Button>
            </Flex>
          </Tabs.Content>

          <Tabs.Content value="text">
            <Flex direction="column" gap="3">
              <Text size="3" style={{ color: oceanTheme.colors.text.secondary, fontWeight: '500' }}>
                Enter text to upload:
              </Text>
              <TextArea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="Enter text here..."
                className="ocean-input"
                style={{ minHeight: '150px', resize: 'vertical' }}
              />

              <Flex gap="3" align="center">
                <Text size="3" style={{ color: oceanTheme.colors.text.secondary, fontWeight: '500' }}>
                  Select Walrus service:
                </Text>
                <select
                  value={selectedService}
                  onChange={(e) => setSelectedService(e.target.value)}
                  aria-label="Select Walrus service"
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
                    Converting and uploading...
                  </Flex>
                ) : (
                  <>
                    <FileText size={16} style={{ marginRight: '8px' }} />
                    Convert to text file and upload
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
              Uploading to Walrus {currentRetry > 0 ? `(Retry ${currentRetry}/${maxRetries})` : ''}
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
            Upload Info
          </Heading>
          <Flex direction="column" gap="3">
            <Text size="3" style={{ color: oceanTheme.colors.text.primary }}>
              <strong>Status:</strong> {info.status}
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
                  View encrypted Blob
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
                  View Sui object
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
        Step 2: Associate file with Sui object
      </Button>
    </Card>
  );
}
