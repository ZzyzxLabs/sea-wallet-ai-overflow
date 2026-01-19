"use client"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient, useSignPersonalMessage } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Box, Text, Heading, Separator, Badge, Spinner, Dialog, AlertDialog } from '@radix-ui/themes';
import { useCallback, useEffect, useState, useMemo } from 'react';
import { Eye, Crown, Users, Anchor, Fish, Droplet, Waves, Shield, Database } from 'lucide-react';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { getObjectExplorerLink } from '@/app/seal/_sealWill/Will_utils';
import { SealClient, SessionKey, NoAccessError } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';
import { downloadAndDecrypt } from './utils_download';
import { set, get } from 'idb-keyval';
import { getFullnodeUrl, SuiClient } from '@mysten/sui/client';
import { getVaultAndOwnerCap, getVaultDynamicFields, getVaultField } from "../../../../utils/queryer";
import { package_addr } from '@/utils/package';
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
      ? `${packageId}::sea_vault::seal_approve_owner`
      : `${packageId}::sea_vault::seal_approve`;
    console.log(fromHex(id))
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
  const packageId = package_addr;
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
  const [blobId, setBlobId] = useState<string[]>([]);
  const { mutate: signPersonalMessage } = useSignPersonalMessage();

  // Initialize SealClient with proper configuration
  const client = useMemo(() => new SealClient({
    suiClient: suiClient as any,
    serverConfigs: [
      // Using testnet key server configuration
      { objectId: '0x73d05d62c18d9374e3ea529e8e0ed6161da1a141a94d3f76ae3fe4e99356db75', weight: 1 }
    ],
    verifyKeyServers: false,
  }), [suiClient]);

  useEffect(() => {
    let active = true;

    const fetchVault = async () => {
      try {
        const result = await getVaultAndOwnerCap({
          suiClient,
          accountAddress: currentAccount!.address,
          packageName: package_addr,
        });
        const vaultID = result?.vaultID;

        if (!active) return;

        if (vaultID) {
          const data = await getVaultField({ suiClient, vaultID });

          if (active) {
            setBlobId(data.content.fields.blob);
            // 這裡可以 setState 或其他操作
          }
        }
      } catch (err) {
        console.error("Error fetching vault data:", err);
      }
    };

    fetchVault();

    return () => {
      active = false;
    };
  }, [currentAccount?.address, package_addr, suiClient]);


  // Unified retrieval of both types of Caps
  const getUnifiedCapObj = useCallback(async () => {
    if (!currentAccount?.address) return;

    setLoading(true);
    try {
      // Get all owned objects first
      const allObjects = await suiClient.getOwnedObjects({
        owner: currentAccount.address,
        options: {
          showContent: true,
          showType: true,
        },
      });

      // Filter for OwnerCap and MemberCap locally
      const ownerCapObjects = allObjects.data.filter(obj =>
        obj.data?.type?.includes('::sea_vault::OwnerCap') ||
        obj.data?.type?.includes('::seaVault::OwnerCap')
      );

      const memberCapObjects = allObjects.data.filter(obj =>
        obj.data?.type?.includes('::sea_vault::MemberCap') ||
        obj.data?.type?.includes('::seaVault::MemberCap')
      );

      // Process OwnerCap
      const ownerCaps: Cap[] = ownerCapObjects
        .map((obj) => {
          if (!obj.data?.content || !('fields' in obj.data.content)) return null;
          const fields = (obj.data.content as { fields: any }).fields;
          return {
            id: fields?.id?.id || obj.data.objectId,
            vault_id: fields?.vaultID,
            type: CapType.OWNER,
          } as OwnerCap;
        })
        .filter((item): item is OwnerCap => item !== null && item.vault_id !== undefined);

      // Process MemberCap  
      const memberCaps: Cap[] = memberCapObjects
        .map((obj) => {
          if (!obj.data?.content || !('fields' in obj.data.content)) return null;
          const fields = (obj.data.content as { fields: any }).fields;
          return {
            id: fields?.id?.id || obj.data.objectId,
            vault_id: fields?.vaultID,
            type: CapType.MEMBER,
          } as MemberCap;
        })
        .filter((item): item is MemberCap => item !== null && item.vault_id !== undefined);

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
      const encryptedObjects = [blobId];
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
    console.log(blobIds, allowlistId, capId, capType);
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
      packageId: package_addr,
      ttlMin: TTL_MIN,
      suiClient: suiClient as any,
    });

    signPersonalMessage(
      { message: sessionKey.getPersonalMessage() },
      {
        onSuccess: async result => {
          await sessionKey.setPersonalMessageSignature(result.signature);
          console.log(blobIds, allowlistId, capId, capType);
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
    console.log(blobIds, allowlistId, capId, capType);
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
      () => { }
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
      className='w-full min-h-screen'
      style={{
        padding: '32px 24px',
        background: 'transparent',
      }}
    >
      {/* Title area with enhanced design */}
      <Flex direction="column" align="center" mb="6" className="text-center">
        <Flex align="center" gap="3" mb="3">
          <Waves size={48} color="#6366f1" style={{ animation: 'pulse 2s infinite' }} />
          <Heading size="8" style={{
            color: '#e0e7ff',
            fontWeight: 'bold',
            textShadow: '0 2px 4px rgba(99, 102, 241, 0.3)'
          }}>
            Ocean Will Management
          </Heading>
          <Waves size={48} color="#6366f1" style={{ animation: 'pulse 2s infinite' }} />
        </Flex>
        <Text size="4" style={{ color: '#a5b4fc', maxWidth: '600px' }}>
          Protecting your digital heritage with the depth and security of the ocean
        </Text>

        {/* Enhanced Statistics with better visual hierarchy */}
        <Flex gap="4" mt="5" wrap="wrap" justify="center">
          <Card style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.25) 100%)',
            padding: '16px 24px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.2)'
          }}>
            <Flex align="center" gap="2">
              <Crown size={24} color="#a5b4fc" />
              <Box>
                <Text size="1" style={{ color: '#94a3b8', marginBottom: '4px' }}>
                  Owner Wills
                </Text>
                <Heading size="6" style={{ color: '#e0e7ff' }}>
                  {stats.ownerCount}
                </Heading>
              </Box>
            </Flex>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(34, 197, 94, 0.25) 100%)',
            padding: '16px 24px',
            border: '1px solid rgba(34, 197, 94, 0.3)',
            boxShadow: '0 4px 12px rgba(34, 197, 94, 0.2)'
          }}>
            <Flex align="center" gap="2">
              <Users size={24} color="#86efac" />
              <Box>
                <Text size="1" style={{ color: '#94a3b8', marginBottom: '4px' }}>
                  Member Wills
                </Text>
                <Heading size="6" style={{ color: '#e0e7ff' }}>
                  {stats.memberCount}
                </Heading>
              </Box>
            </Flex>
          </Card>

          <Card style={{
            background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15) 0%, rgba(147, 51, 234, 0.25) 100%)',
            padding: '16px 24px',
            border: '1px solid rgba(147, 51, 234, 0.3)',
            boxShadow: '0 4px 12px rgba(147, 51, 234, 0.2)'
          }}>
            <Flex align="center" gap="2">
              <Database size={24} color="#c4b5fd" />
              <Box>
                <Text size="1" style={{ color: '#94a3b8', marginBottom: '4px' }}>
                  Total Items
                </Text>
                <Heading size="6" style={{ color: '#e0e7ff' }}>
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
            background: 'rgba(255, 255, 255, 0.05)',
            borderRadius: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
            maxWidth: '600px',
            margin: '64px auto',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Box style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4) 0%, rgba(147, 51, 234, 0.3) 100%)',
            borderRadius: '50%',
            padding: '24px',
            marginBottom: '24px',
            boxShadow: '0 4px 16px rgba(99, 102, 241, 0.3)',
            border: '1px solid rgba(99, 102, 241, 0.5)'
          }}>
            <Waves size={64} color="white" />
          </Box>
          <Heading size="6" mb="3" style={{ color: '#e0e7ff', textAlign: 'center' }}>
            No Wills Found
          </Heading>
          <Text size="4" style={{ color: '#a5b4fc', textAlign: 'center', maxWidth: '400px' }}>
            Your digital heritage will be securely stored and protected here, deep and eternal like the ocean
          </Text>
        </Flex>
      )}

      {/* Details dialog */}
      <Dialog.Root open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <Dialog.Content
          maxWidth="600px"
          style={{
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
            borderRadius: '16px',
            boxShadow: '0 24px 48px rgba(0, 0, 0, 0.4)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          <Dialog.Title
            style={{
              color: '#e0e7ff',
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
                background: selectedCapType === CapType.OWNER ? 'rgba(99, 102, 241, 0.3)' : 'rgba(34, 197, 94, 0.3)',
                color: 'white',
                border: `1px solid ${selectedCapType === CapType.OWNER ? 'rgba(99, 102, 241, 0.5)' : 'rgba(34, 197, 94, 0.5)'}`
              }}
            >
              {selectedCapType === CapType.OWNER ? 'Owner' : 'Member'}
            </Badge>
          </Dialog.Title>

          <Box mt="4">
            {decrypting && (
              <Flex align="center" justify="center" p="4">
                <Spinner size="3" />
                <Text ml="3" style={{ color: '#a5b4fc' }}>Decrypting data...</Text>
              </Flex>
            )}

            {!decrypting && decryptedTexts.length > 0 && (
              <Box>
                <Text size="3" mb="3" style={{ color: '#a5b4fc' }}>
                  Decrypted Content:
                </Text>
                <Box
                  style={{
                    background: 'rgba(99, 102, 241, 0.1)',
                    borderRadius: '12px',
                    padding: '16px',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    border: '1px solid rgba(99, 102, 241, 0.2)',
                  }}
                >
                  {decryptedTexts.map((txt, idx) => (
                    <Box
                      key={idx}
                      style={{
                        background: 'rgba(15, 23, 42, 0.5)',
                        padding: '12px',
                        borderRadius: '8px',
                        marginBottom: idx < decryptedTexts.length - 1 ? '12px' : '0',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                      }}
                    >
                      <pre style={{
                        margin: 0,
                        whiteSpace: 'pre-wrap',
                        color: '#e2e8f0',
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
              <Text style={{ color: '#94a3b8', textAlign: 'center', padding: '32px' }}>
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
                  background: 'rgba(148, 163, 184, 0.15)',
                  color: '#e0e7ff',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
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
        <AlertDialog.Content
          maxWidth="450px"
          style={{
            background: 'rgba(15, 23, 42, 0.95)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
          }}
        >
          <AlertDialog.Title style={{ color: '#fca5a5' }}>Error</AlertDialog.Title>
          <AlertDialog.Description size="2" style={{ color: '#e0e7ff' }}>
            {error}
          </AlertDialog.Description>
          <Flex gap="3" mt="4" justify="end">
            <AlertDialog.Action>
              <Button
                variant="solid"
                color="red"
                style={{
                  background: 'rgba(239, 68, 68, 0.2)',
                  color: '#fca5a5',
                  border: '1px solid rgba(239, 68, 68, 0.4)',
                }}
                onClick={() => setError(null)}
              >
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