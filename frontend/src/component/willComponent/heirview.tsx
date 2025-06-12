"use client"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Box, Text, Heading, Separator, Tabs, TextArea, Spinner, Dialog, AlertDialog } from '@radix-ui/themes';
import { useCallback, useEffect, useState, useRef } from 'react';
import { X, ArrowLeft, Plus, Upload, FileText, Waves, Anchor, Fish, Droplet, Eye } from 'lucide-react';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { useNetworkVariable } from '../../app/networkConfig';
import { getObjectExplorerLink } from '../../store/sealWill/Will_utils';
import { KeyServerConfig, getAllowlistedKeyServers, SealClient, SessionKey, NoAccessError, type SessionKeyType, } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { downloadAndDecrypt } from './utils_download';
import { set, get } from 'idb-keyval';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
const TTL_MIN = 10;

// Define types
interface Cap {
  id: string;
  service_id: string;
}

interface CardItem {
  cap_id: string;
  willlist_id: string;
  list: any[];
  name: string;
}

interface FeedData {
  allowlistId: string;
  allowlistName: string;
  blobIds: string[];
}

function constructMoveCall(packageId: string, allowlistId: string, cap_id: string) {
  return (tx: Transaction, id: string) => {
    tx.moveCall({
      target: `${packageId}::will::seal_approve`,
      arguments: [tx.pure.vector('u8', fromHex(id)), tx.object(cap_id), tx.object(allowlistId)],
    });
  };
}

const OceanCard = ({ 
  item, 
  index, 
  onViewDetails 
}: { 
  item: CardItem; 
  index: number;
  onViewDetails: (capId: string, willlistId: string) => void;
}) => {
  // Ocean style gradient colors
  const gradients = [
    'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    'linear-gradient(135deg, #0077be 0%, #0099cc 100%)',
    'linear-gradient(135deg, #006994 0%, #00b4d8 100%)',
    'linear-gradient(135deg, #0d47a1 0%, #42a5f5 100%)',
  ];

  // Wave animation style
  const waveAnimation = {
    animation: `waves ${3 + index * 0.5}s ease-in-out infinite`,
  };

  return (
    <Card
      style={{
        background: gradients[index % gradients.length],
        border: 'none',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        overflow: 'hidden',
        position: 'relative' as const,
        transform: `translateY(${Math.sin(Date.now() / 1000 + index) * 5}px)`,
        transition: 'all 0.3s ease',
      }}
      className="ocean-card"
    >
      {/* Wave background decoration */}
      <Box
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          opacity: 0.1,
          background: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'%3E%3Cpath d='M0,50 Q25,${30 + Math.sin(Date.now() / 1000) * 10} 50,50 T100,50 L100,100 L0,100 Z' fill='%23ffffff' /%3E%3C/svg%3E")`,
          ...waveAnimation,
        }}
      />

      <Box p="5">
        {/* Title area */}
        <Flex align="center" gap="3" mb="4">
          <Box
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              padding: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Anchor size={24} color="white" />
          </Box>
          <Heading size="4" style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
            {item.name || 'Unnamed Will'}
          </Heading>
        </Flex>

        <Separator size="4" style={{ background: 'rgba(255, 255, 255, 0.3)' }} mb="4" />

        {/* Content area */}
        <Box
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            backdropFilter: 'blur(5px)',
          }}
        >
          <Flex direction="column" gap="3">
            <Flex align="center" gap="2">
              <Fish size={16} color="white" />
              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                Cap ID: {item.cap_id.slice(0, 8)}...
              </Text>
            </Flex>

            <Flex align="center" gap="2">
              <Droplet size={16} color="white" />
              <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                WillList ID: {item.willlist_id.slice(0, 8)}...
              </Text>
            </Flex>

            {item.list && item.list.length > 0 && (
              <Flex align="center" gap="2">
                <Waves size={16} color="white" />
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  Number of list items: {item.list.length}
                </Text>
              </Flex>
            )}
          </Flex>
        </Box>

        {/* Action buttons */}
        <Flex gap="2" mt="4">
          <Button
            variant="soft"
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
            onClick={() => onViewDetails(item.cap_id, item.willlist_id)}
          >
            <Eye size={16} style={{ marginRight: '8px' }} />
            View Details
          </Button>
        </Flex>
      </Box>
    </Card>
  );
};

export const WillListDisplay = () => {
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageId = useNetworkVariable('packageId');
  const [cardItems, setCardItems] = useState<CardItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedWillId, setSelectedWillId] = useState<string | null>(null);
  const [decryptedTexts, setDecryptedTexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionKey, setCurrentSessionKey] = useState<SessionKey | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  const client = new SealClient({
    suiClient,
    serverConfigs: getAllowlistedKeyServers('testnet').map((id) => ({
      objectId: id,
      weight: 1,
    })),
    verifyKeyServers: false,
  });

  const getCapObj = useCallback(async () => {
    if (!currentAccount?.address) return;
    
    setLoading(true);
    try {
      const res = await suiClient.getOwnedObjects({
        owner: currentAccount?.address,
        options: {
          showContent: true,
          showType: true,
        },
        filter: {
          StructType: `${packageId}::will::AccessNFT`,
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
    } catch (error) {
      console.error('Error while fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAccount?.address, packageId, suiClient]);

  useEffect(() => {
    getCapObj();
  }, [getCapObj]);

  const handleViewDetails = async (capId: string, willlistId: string) => {
    setSelectedWillId(willlistId);
    setIsDialogOpen(true);
    setDecryptedTexts([]);
    
    // Get encrypted objects
    try {
      const allowlist = await suiClient.getObject({ id: willlistId, options: { showContent: true } });
      const encryptedObjects = await suiClient.getDynamicFields({ parentId: willlistId }).then(res =>
        res.data.map(obj => obj.name.value as string)
      );
      const fields = (allowlist.data?.content as { fields: any })?.fields || {};
      
      const feed = { 
        allowlistId: willlistId, 
        allowlistName: fields.name, 
        blobIds: encryptedObjects 
      };
      setFeedData(feed);
      
      // Automatically start decryption
      if (encryptedObjects.length > 0) {
        await onView(encryptedObjects, willlistId, capId);
      }
    } catch (error) {
      console.error('Error while retrieving encrypted data:', error);
      setError('Unable to retrieve encrypted data');
    }
  };

  const onView = async (blobIds: string[], allowlistId: string, capId: string) => {
    setDecrypting(true);
    const imported: SessionKeyType = await get('sessionKey');
    if (imported) {
      try {
        const currentSessionKey = await SessionKey.import(
          imported,
          new SuiClient({url: getFullnodeUrl('testnet')}),
        );
        console.log('loaded currentSessionKey', currentSessionKey);
        if (currentSessionKey && !currentSessionKey.isExpired() && currentSessionKey.getAddress() === currentAccount?.address) {
          await handleDecrypt(blobIds, allowlistId, currentSessionKey, capId);
        return;
      }
    }
      catch (error) {
        console.log('Imported session key is expired', error);
      }
    }
    set('sessionKey', null);
    setCurrentSessionKey(null);
    const sessionKey = await SessionKey.create({
      address: currentAccount?.address!,
      packageId,
      ttlMin: TTL_MIN,
      suiClient,
    });
    signPersonalMessage(
      { message: sessionKey.getPersonalMessage() },
      {
        onSuccess: async result => {
          await sessionKey.setPersonalMessageSignature(result.signature);
          await handleDecrypt(blobIds, allowlistId, sessionKey, capId);
          setCurrentSessionKey(sessionKey);
        },
        onError: () => {
          setDecrypting(false);
          setError('Signature failed');
        }
      }
    );
  };

  const handleDecrypt = async (blobIds: string[], allowlistId: string, sessionKey: SessionKey, capId: string) => {
    const moveCallConstructor = constructMoveCall(packageId, allowlistId, capId);
    await downloadAndDecrypt(
      blobIds,
      sessionKey,
      suiClient,
      client,
      moveCallConstructor,
      setError,
      setDecryptedTexts,
      setIsDialogOpen,
      setDecryptedTexts,
      setReloadKey
    );
    setDecrypting(false);
  };

  return (
    <Box className='rounded-md bg-[#e3f2fd]/50'
      style={{
        minHeight: '80vh',
        padding: '24px',
      }}
    >
      {/* Title area */}
      <Flex direction="column" align="center" mb="6">
        <Heading size="8" mb="2" className='' style={{ color: '#0d47a1', textAlign: 'center' }}>
          Ocean Will Management System
        </Heading>
        <Text size="3" style={{ color: '#1976d2' }}>
          Protecting your digital legacy, as deep and eternal as the ocean
        </Text>
      </Flex>

      {/* Loading state */}
      {loading && (
        <Flex align="center" justify="center" p="8">
          <Spinner size="3" />
          <Text ml="3" size="3" style={{ color: '#0d47a1' }}>
            Loading data...
          </Text>
        </Flex>
      )}

      {/* Card grid */}
      {!loading && cardItems.length > 0 && (
        <Box
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '24px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {cardItems.map((item, index) => (
            <OceanCard 
              key={item.cap_id} 
              item={item} 
              index={index}
              onViewDetails={handleViewDetails}
            />
          ))}
        </Box>
      )}

      {/* Empty state */}
      {!loading && cardItems.length === 0 && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          p="8"
          style={{
            background: 'rgba(255, 255, 255, 0.8)',
            borderRadius: '16px',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.1)',
            maxWidth: '600px',
            margin: '0 auto',
          }}
        >
          <Waves size={64} color="#0d47a1" />
          <Text size="5" mt="4" style={{ color: '#0d47a1', textAlign: 'center' }}>
            No will data yet
          </Text>
          <Text size="3" mt="2" style={{ color: '#1976d2', textAlign: 'center' }}>
            Your digital legacy will be safely stored here
          </Text>
        </Flex>
      )}

      {/* Details dialog */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Content 
          maxWidth="600px"
          style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #e3f2fd 100%)',
            borderRadius: '16px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.2)',
          }}
        >
          <Dialog.Title 
            style={{ 
              color: '#0d47a1',
              fontSize: '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Anchor size={24} />
            {feedData?.allowlistName || 'Will Details'}
          </Dialog.Title>
          
          <Box mt="4">
            {decrypting && (
              <Flex align="center" justify="center" p="4">
                <Spinner size="3" />
                <Text ml="3" style={{ color: '#0d47a1' }}>Decrypting data...</Text>
              </Flex>
            )}
            
            {!decrypting && decryptedTexts.length > 0 && (
              <Box>
                <Text size="3" mb="3" style={{ color: '#1565c0' }}>
                  Decrypted content:
                </Text>
                <Box
                  style={{
                    background: 'rgba(13, 71, 161, 0.05)',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                  }}
                >
                  {decryptedTexts.map((txt, idx) => (
                    <Box
                      key={idx}
                      style={{
                        background: 'white',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: idx < decryptedTexts.length - 1 ? '12px' : '0',
                        border: '1px solid rgba(13, 71, 161, 0.1)',
                      }}
                    >
                      <pre style={{ 
                        margin: 0, 
                        whiteSpace: 'pre-wrap',
                        color: '#333',
                        fontFamily: 'monospace',
                        fontSize: '14px',
                      }}>
                        {txt}
                      </pre>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            
            {!decrypting && feedData?.blobIds.length === 0 && (
              <Text style={{ color: '#757575', textAlign: 'center', padding: '32px' }}>
                This will has no encrypted files
              </Text>
            )}
          </Box>
          
          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button 
                variant="soft" 
                color="gray"
                style={{
                  background: 'rgba(0, 0, 0, 0.05)',
                }}
                onClick={() => {
                  setDecryptedTexts([]);
                  setFeedData(null);
                }}
              >
                Close
              </Button>
            </Dialog.Close>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>

      {/* Error dialog */}
      <AlertDialog.Root open={!!error} onOpenChange={() => setError(null)}>
        <AlertDialog.Content maxWidth="450px">
          <AlertDialog.Title style={{ color: '#d32f2f' }}>Error</AlertDialog.Title>
          <AlertDialog.Description size="2">{error}</AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Action>
              <Button variant="solid" color="red" onClick={() => setError(null)}>
                Close
              </Button>
            </AlertDialog.Action>
          </Flex>
        </AlertDialog.Content>
      </AlertDialog.Root>

      {/* CSS animation */}
      <style jsx>{`
        @keyframes waves {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }

        .ocean-card:hover {
          transform: scale(1.02) !important;
          box-shadow: 0 12px 40px 0 rgba(31, 38, 135, 0.5) !important;
        }
      `}</style>
    </Box>
  );
};