"use client"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Box, Text, Heading, Separator, Badge, Spinner, Dialog, AlertDialog } from '@radix-ui/themes';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Eye, Crown, Users, Anchor, Fish, Droplet, Waves, Shield } from 'lucide-react';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { useNetworkVariable } from '@/app/networkConfig';
import { getObjectExplorerLink } from '@/store/sealWill/Will_utils';
import { SealClient, SessionKey, NoAccessError } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { downloadAndDecrypt } from './utils_download';
import { set, get } from 'idb-keyval';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';

const TTL_MIN = 10;

// Define Cap Type Enum
enum CapType {
  OWNER = 'OWNER',
  MEMBER = 'MEMBER'
}

// Update interface definitions
interface BaseCap {
  id: string;
  vault_id: string;
  type: CapType;
}

interface OwnerCap extends BaseCap {
  type: CapType.OWNER;
}

interface MemberCap extends BaseCap {
  type: CapType.MEMBER;
}

type Cap = OwnerCap | MemberCap;

interface CardItem {
  cap_id: string;
  willlist_id: string;
  list: any[];
  name: string;
  cap_type: CapType;
  permissions?: string[];
}

interface FeedData {
  allowlistId: string;
  allowlistName: string;
  blobIds: string[];
  capType: CapType;
}

// Construct different types of MoveCalls
function constructMoveCall(packageId: string, allowlistId: string, cap_id: string, capType: CapType) {
  return (tx: Transaction, id: string) => {
    const target = capType === CapType.OWNER 
      ? `${packageId}::seaVault::seal_approve_owner`
      : `${packageId}::seaVault::seal_approve`;
      
    tx.moveCall({
      target,
      arguments: [tx.pure.vector('u8', fromHex(id)), tx.object(cap_id), tx.object(allowlistId)],
    });
  };
}

const UnifiedOceanCard = ({ 
  item, 
  index,
  onViewDetails 
}: { 
  item: CardItem; 
  index: number;
  onViewDetails: (capId: string, willlistId: string, capType: CapType) => void;
}) => {
  // Choose different visual styles based on Cap type
  const getCardStyle = (capType: CapType, index: number) => {
    const ownerGradients = [
      'linear-gradient(135deg, #1e3c72 0%, #2a5298 50%, #3b5ba8 100%)',
      'linear-gradient(135deg, #0077be 0%, #1e88c8 50%, #0099cc 100%)',
      'linear-gradient(135deg, #006994 0%, #0089b8 50%, #00b4d8 100%)',
      'linear-gradient(135deg, #0d47a1 0%, #2e6bc0 50%, #42a5f5 100%)',
    ];
    
    const memberGradients = [
      'linear-gradient(135deg, #2e7d32 0%, #3d9142 50%, #4caf50 100%)',
      'linear-gradient(135deg, #388e3c 0%, #4da250 50%, #66bb6a 100%)',
      'linear-gradient(135deg, #43a047 0%, #5db75b 50%, #81c784 100%)',
      'linear-gradient(135deg, #1b5e20 0%, #2e7d32 50%, #4caf50 100%)',
    ];
    
    const gradients = capType === CapType.OWNER ? ownerGradients : memberGradients;
    
    return {
      background: gradients[index % gradients.length],
      border: 'none',
      boxShadow: '0 10px 40px 0 rgba(31, 38, 135, 0.25)',
      backdropFilter: 'blur(10px)',
      borderRadius: '20px',
      overflow: 'hidden',
      position: 'relative' as const,
      transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
    };
  };

  const getCapIcon = (capType: CapType) => {
    return capType === CapType.OWNER ? Crown : Users;
  };

  const getCapLabel = (capType: CapType) => {
    return capType === CapType.OWNER ? 'Will Owner' : 'Will Member';
  };

  const CapIcon = getCapIcon(item.cap_type);

  return (
    <Card
      style={getCardStyle(item.cap_type, index)}
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
          animation: `waves ${3 + index * 0.5}s ease-in-out infinite`,
        }}
      />

      <Box p="5">
        {/* Title area with Cap type indicator */}
        <Flex align="center" justify="between" mb="4">
          <Flex align="center" gap="3">
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
              <CapIcon size={24} color="white" />
            </Box>
            <Heading size="4" style={{ color: 'white', textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              {item.name || 'Unnamed Will'}
            </Heading>
          </Flex>
          
          <Badge 
            size="2" 
            style={{ 
              background: 'rgba(255, 255, 255, 0.2)', 
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)'
            }}
          >
            {getCapLabel(item.cap_type)}
          </Badge>
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
                  List Items: {item.list.length}
                </Text>
              </Flex>
            )}

            {item.cap_type === CapType.MEMBER && (
              <Flex align="center" gap="2">
                <Shield size={16} color="white" />
                <Text size="2" style={{ color: 'rgba(255, 255, 255, 0.9)' }}>
                  Limited Member Permissions
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
            onClick={() => onViewDetails(item.cap_id, item.willlist_id, item.cap_type)}
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
  const [selectedCapType, setSelectedCapType] = useState<CapType | null>(null);
  const [decryptedTexts, setDecryptedTexts] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentSessionKey, setCurrentSessionKey] = useState<SessionKey | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [feedData, setFeedData] = useState<FeedData | null>(null);
  const [decrypting, setDecrypting] = useState(false);

  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  // Initialize SealClient with proper configuration
  const client = useMemo(() => new SealClient({
    suiClient: suiClient as any,
    serverConfigs: [
      // Using testnet key server configuration
      { objectId: '0x0b4830cc7f444723cc5f00b0ed6b08ea8ddbdfc55e4d3d8306be3091e28b4e13', weight: 1 }
    ],
    verifyKeyServers: false,
  }), [suiClient]);

  // Unified retrieval of both types of Caps
  const getUnifiedCapObj = useCallback(async () => {
    if (!currentAccount?.address) return;
    
    setLoading(true);
    try {
      // Parallel retrieval of both types of Caps
      const [ownerRes, memberRes] = await Promise.all([
        suiClient.getOwnedObjects({
          owner: currentAccount.address,
          options: {
            showContent: true,
            showType: true,
          },
          filter: {
            StructType: `${packageId}::seaVault::OwnerCap`,
          },
        }),
        suiClient.getOwnedObjects({
          owner: currentAccount.address,
          options: {
            showContent: true,
            showType: true,
          },
          filter: {
            StructType: `${packageId}::seaVault::MemberCap`,
          },
        })
      ]);
      
      // Process OwnerCap
      const ownerCaps: Cap[] = ownerRes.data
        .map((obj) => {
          const fields = (obj!.data!.content as { fields: any }).fields;
          return {
            id: fields?.id.id,
            vault_id: fields?.vaultID,
            type: CapType.OWNER,
          } as OwnerCap;
        })
        .filter((item) => item !== null);

      // Process MemberCap  
      const memberCaps: Cap[] = memberRes.data
        .map((obj) => {
          const fields = (obj!.data!.content as { fields: any }).fields;
          return {
            id: fields?.id.id,
            vault_id: fields?.vaultID,
            type: CapType.MEMBER,
          } as MemberCap;
        })
        .filter((item) => item !== null);

      // Merge both types of Caps
      const allCaps = [...ownerCaps, ...memberCaps];
        
      // Get corresponding will details for each Cap
      const cardItems: CardItem[] = await Promise.all(
        allCaps.map(async (cap) => {
          const willlist = await suiClient.getObject({
            id: cap.vault_id,
            options: { showContent: true },
          });
          const fields = (willlist.data?.content as { fields: any })?.fields || {};
          return {
            cap_id: cap.id,
            willlist_id: cap.vault_id,
            list: fields.list,
            name: fields.name,
            cap_type: cap.type,
            permissions: cap.type === CapType.MEMBER ? ['view', 'decrypt'] : ['full'],
          };
        }),
      );
      
      setCardItems(cardItems);
    } catch (error) {
      console.error('Error occurred while fetching data:', error);
      setError('Unable to fetch will data');
    } finally {
      setLoading(false);
    }
  }, [currentAccount?.address, packageId, suiClient]);

  useEffect(() => {
    getUnifiedCapObj();
  }, [getUnifiedCapObj]);

  const handleViewDetails = async (capId: string, willlistId: string, capType: CapType) => {
    setSelectedWillId(willlistId);
    setSelectedCapType(capType);
    setIsDialogOpen(true);
    setDecryptedTexts([]);
    
    try {
      const allowlist = await suiClient.getObject({ id: willlistId, options: { showContent: true } });
      const encryptedObjects = await suiClient.getDynamicFields({ parentId: willlistId }).then(res =>
        res.data.map(obj => obj.name.value as string)
      );
      const fields = (allowlist.data?.content as { fields: any })?.fields || {};
      
      const feed: FeedData = { 
        allowlistId: willlistId, 
        allowlistName: fields.name, 
        blobIds: encryptedObjects,
        capType
      };
      setFeedData(feed);
      
      // Automatically start decryption
      if (encryptedObjects.length > 0) {
        await onView(encryptedObjects, willlistId, capId, capType);
      }
    } catch (error) {
      console.error('Error occurred while fetching encrypted data:', error);
      setError('Unable to fetch encrypted data');
    }
  };

  const onView = async (blobIds: string[], allowlistId: string, capId: string, capType: CapType) => {
    setDecrypting(true);
    const imported: any = await get('sessionKey');
    
    if (imported) {
      try {
        const currentSessionKey = await SessionKey.import(
          imported,
          suiClient as any,
        );
        
        if (currentSessionKey && !currentSessionKey.isExpired() && currentSessionKey.getAddress() === currentAccount?.address) {
          await handleDecrypt(blobIds, allowlistId, currentSessionKey, capId, capType);
          return;
        }
      } catch (error) {
        console.log('Imported session key has expired', error);
      }
    }
    
    set('sessionKey', null);
    setCurrentSessionKey(null);
    
    const sessionKey = await SessionKey.create({
      address: currentAccount?.address!,
      packageId,
      ttlMin: TTL_MIN,
      suiClient: suiClient as any,
    });
    
    signPersonalMessage(
      { message: sessionKey.getPersonalMessage() },
      {
        onSuccess: async result => {
          await sessionKey.setPersonalMessageSignature(result.signature);
          await handleDecrypt(blobIds, allowlistId, sessionKey, capId, capType);
          setCurrentSessionKey(sessionKey);
        },
        onError: () => {
          setDecrypting(false);
          setError('Signature failed');
        }
      }
    );
  };

  const handleDecrypt = async (
    blobIds: string[], 
    allowlistId: string, 
    sessionKey: SessionKey, 
    capId: string, 
    capType: CapType
  ) => {
    // Construct different MoveCalls based on Cap type
    const moveCallConstructor = constructMoveCall(packageId, allowlistId, capId, capType);
    
    await downloadAndDecrypt(
      blobIds,
      sessionKey,
      suiClient as any,
      client,
      moveCallConstructor,
      setError,
      setDecryptedTexts,
      setIsDialogOpen,
      setDecryptedTexts,
      () => {}
    );
    setDecrypting(false);
  };

  // Statistics information
  const stats = useMemo(() => {
    const ownerCount = cardItems.filter(item => item.cap_type === CapType.OWNER).length;
    const memberCount = cardItems.filter(item => item.cap_type === CapType.MEMBER).length;
    
    return { ownerCount, memberCount, total: cardItems.length };
  }, [cardItems]);

  return (
    <Box 
      className='w-full min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50'
      style={{
        padding: '32px 24px',
      }}
    >
      {/* Title area with enhanced design */}
      <Flex direction="column" align="center" mb="6" className="text-center">
        <Flex align="center" gap="3" mb="3">
          <Waves size={48} color="#0d47a1" style={{ animation: 'pulse 2s infinite' }} />
          <Heading size="8" style={{ 
            color: '#0d47a1', 
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(13, 71, 161, 0.1)'
          }}>
            Ocean Will Management
          </Heading>
          <Waves size={48} color="#0d47a1" style={{ animation: 'pulse 2s infinite' }} />
        </Flex>
        <Text size="4" style={{ color: '#1565c0', maxWidth: '600px' }}>
          Protecting your digital heritage with the depth and security of the ocean
        </Text>
        
        {/* Enhanced Statistics with better visual hierarchy */}
        <Flex gap="4" mt="5" wrap="wrap" justify="center">
          <Card style={{ 
            background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
            padding: '16px 24px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(30, 60, 114, 0.3)'
          }}>
            <Flex align="center" gap="2">
              <Crown size={24} color="white" />
              <Box>
                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                  Owner Wills
                </Text>
                <Heading size="6" style={{ color: 'white' }}>
                  {stats.ownerCount}
                </Heading>
              </Box>
            </Flex>
          </Card>
          
          <Card style={{ 
            background: 'linear-gradient(135deg, #2e7d32 0%, #4caf50 100%)',
            padding: '16px 24px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(46, 125, 50, 0.3)'
          }}>
            <Flex align="center" gap="2">
              <Users size={24} color="white" />
              <Box>
                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                  Member Wills
                </Text>
                <Heading size="6" style={{ color: 'white' }}>
                  {stats.memberCount}
                </Heading>
              </Box>
            </Flex>
          </Card>
          
          <Card style={{ 
            background: 'linear-gradient(135deg, #0d47a1 0%, #42a5f5 100%)',
            padding: '16px 24px',
            border: 'none',
            boxShadow: '0 4px 12px rgba(13, 71, 161, 0.3)'
          }}>
            <Flex align="center" gap="2">
              <Shield size={24} color="white" />
              <Box>
                <Text size="1" style={{ color: 'rgba(255, 255, 255, 0.8)', marginBottom: '4px' }}>
                  Total Wills
                </Text>
                <Heading size="6" style={{ color: 'white' }}>
                  {stats.total}
                </Heading>
              </Box>
            </Flex>
          </Card>
        </Flex>
      </Flex>

      {/* Loading state with better animation */}
      {loading && (
        <Flex align="center" justify="center" direction="column" gap="4" p="8">
          <Spinner size="3" />
          <Text size="4" style={{ color: '#0d47a1', fontWeight: 'medium' }}>
            Loading your wills...
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
            <UnifiedOceanCard 
              key={`${item.cap_type}-${item.cap_id}`} 
              item={item} 
              index={index}
              onViewDetails={handleViewDetails}
            />
          ))}
        </Box>
      )}

      {/* Empty state with enhanced design */}
      {!loading && cardItems.length === 0 && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          p="8"
          style={{
            background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.9) 0%, rgba(227, 242, 253, 0.9) 100%)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(13, 71, 161, 0.15)',
            maxWidth: '600px',
            margin: '64px auto',
            border: '2px solid rgba(13, 71, 161, 0.1)',
          }}
        >
          <Box style={{ 
            background: 'linear-gradient(135deg, #0d47a1 0%, #42a5f5 100%)',
            borderRadius: '50%',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(13, 71, 161, 0.3)'
          }}>
            <Waves size={64} color="white" />
          </Box>
          <Heading size="6" mb="3" style={{ color: '#0d47a1', textAlign: 'center' }}>
            No Wills Found
          </Heading>
          <Text size="4" style={{ color: '#1565c0', textAlign: 'center', maxWidth: '400px' }}>
            Your digital heritage will be securely stored and protected here, deep and eternal like the ocean
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
            {selectedCapType === CapType.OWNER ? <Crown size={24} /> : <Users size={24} />}
            {feedData?.allowlistName || 'Will Details'}
            <Badge 
              size="2" 
              style={{ 
                background: selectedCapType === CapType.OWNER ? '#1e3c72' : '#2e7d32', 
                color: 'white' 
              }}
            >
              {selectedCapType === CapType.OWNER ? 'Owner' : 'Member'}
            </Badge>
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
                  Decrypted Content:
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
                  setSelectedCapType(null);
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

      {/* Enhanced CSS animations */}
      <style jsx>{`
        @keyframes waves {
          0%, 100% {
            transform: translateY(0) scale(1);
          }
          50% {
            transform: translateY(-15px) scale(1.02);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.8;
            transform: scale(1.05);
          }
        }

        .ocean-card {
          position: relative;
        }

        .ocean-card:hover {
          transform: translateY(-8px) scale(1.03) !important;
          box-shadow: 0 16px 48px 0 rgba(31, 38, 135, 0.5) !important;
        }

        .ocean-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            45deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0) 100%
          );
          opacity: 0;
          transition: opacity 0.4s ease;
          pointer-events: none;
        }

        .ocean-card:hover::before {
          opacity: 1;
        }
      `}</style>
    </Box>
  );
};