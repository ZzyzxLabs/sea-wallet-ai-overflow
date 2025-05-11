"use client"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Box, Text, Heading, Separator, Tabs, TextArea, Spinner } from '@radix-ui/themes';
import { useCallback, useEffect, useState, useRef } from 'react';
import { X, ArrowLeft, Plus, Upload, FileText, Waves, Anchor, Fish, Droplet } from 'lucide-react';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { useNetworkVariable } from '../../app/networkConfig';
import { getObjectExplorerLink } from '../../store/sealWill/Will_utils';
import { getAllowlistedKeyServers, SealClient } from '@mysten/seal';
import { fromHex, toHex } from '@mysten/sui/utils';

// 定義型別
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

const OceanCard = ({ item, index }: { item: CardItem; index: number }) => {
  // 海洋風格的漸層色
  const gradients = [
    'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    'linear-gradient(135deg, #0077be 0%, #0099cc 100%)',
    'linear-gradient(135deg, #006994 0%, #00b4d8 100%)',
    'linear-gradient(135deg, #0d47a1 0%, #42a5f5 100%)',
  ];

  // 波浪動畫樣式
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
      {/* 波浪背景裝飾 */}
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
        {/* 標題區域 */}
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
            {item.name || '未命名遺囑'}
          </Heading>
        </Flex>

        <Separator size="4" style={{ background: 'rgba(255, 255, 255, 0.3)' }} mb="4" />

        {/* 內容區域 */}
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
                  清單項目數: {item.list.length}
                </Text>
              </Flex>
            )}
          </Flex>
        </Box>

        {/* 操作按鈕 */}
        <Flex gap="2" mt="4">
          <Button
            variant="soft"
            style={{
              flex: 1,
              background: 'rgba(255, 255, 255, 0.2)',
              color: 'white',
              border: '1px solid rgba(255, 255, 255, 0.3)',
            }}
            onClick={() => {
              const link = getObjectExplorerLink(item.cap_id);
              if (typeof link === 'string') {
                window.open(link, '_blank');
              } else {
                console.error('Invalid link:', link);
              }
            }}
          >
            查看詳情
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
      console.error('獲取資料時發生錯誤:', error);
    } finally {
      setLoading(false);
    }
  }, [currentAccount?.address, packageId, suiClient]);

  useEffect(() => {
    getCapObj();
  }, [getCapObj]);

  return (
    <Box
      style={{
        background: 'linear-gradient(180deg, #e3f2fd 0%, #bbdefb 100%)',
        minHeight: '100vh',
        padding: '24px',
      }}
    >
      {/* 標題區域 */}
      <Flex direction="column" align="center" mb="6">
        <Heading size="8" mb="2" style={{ color: '#0d47a1', textAlign: 'center' }}>
          海洋遺囑管理系統
        </Heading>
        <Text size="3" style={{ color: '#1976d2' }}>
          守護您的數位遺產，如海洋般深邃永恆
        </Text>
      </Flex>

      {/* 載入中狀態 */}
      {loading && (
        <Flex align="center" justify="center" p="8">
          <Spinner size="3" />
          <Text ml="3" size="3" style={{ color: '#0d47a1' }}>
            正在載入資料...
          </Text>
        </Flex>
      )}

      {/* 卡片網格 */}
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
            <OceanCard key={item.cap_id} item={item} index={index} />
          ))}
        </Box>
      )}

      {/* 空狀態 */}
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
            尚無遺囑資料
          </Text>
          <Text size="3" mt="2" style={{ color: '#1976d2', textAlign: 'center' }}>
            您的數位遺產將在這裡安全保存
          </Text>
        </Flex>
      )}

      {/* CSS 動畫 */}
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