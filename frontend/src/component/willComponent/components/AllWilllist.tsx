"use client"
import { useCurrentAccount, useSuiClient } from '@mysten/dapp-kit';
import { Button, Card, Flex, Box, Text, Heading } from '@radix-ui/themes';
import { useCallback, useEffect, useState } from 'react';
import { Waves } from 'lucide-react';
import { useNetworkVariable } from '../../../app/networkConfig';
import { getObjectExplorerLink } from '../../../store/sealWill/Will_utils';
import { oceanTheme, injectGlobalStyles } from '../theme/oceanTheme';
import { Cap, CardItem } from '../types';
import { WilllistManager } from './WillManager';

interface AllWilllistProps {
  width?: string;
  height?: string;
  maxWidth?: string;
  style?: React.CSSProperties;
}

export function AllWilllist({ width, height, maxWidth = '1200px', style = {} }: AllWilllistProps) {
  const packageId = useNetworkVariable('packageId');
  const currentAccount = useCurrentAccount();
  const suiClient = useSuiClient();

  const [cardItems, setCardItems] = useState<CardItem[]>([]);
  const [selectedWilllist, setSelectedWilllist] = useState<string | null>(null);
  const [selectedCapId, setSelectedCapId] = useState<string | null>(null);

  // 初始化時注入全域樣式
  useEffect(() => {
    injectGlobalStyles();
  }, []);

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

  useEffect(() => {
    getCapObj();
    
    const intervalId = setInterval(() => {
      getCapObj();
    }, 5000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [getCapObj]);

  const handleManage = (willlistId: string, capId: string) => {
    setSelectedWilllist(willlistId);
    setSelectedCapId(capId);
  };

  const handleBack = () => {
    setSelectedWilllist(null);
    setSelectedCapId(null);
  };

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

  return (
    <Box style={{ 
      minHeight: height || '100vh',
      width: width || '100%',
      background: oceanTheme.gradients.oceanLight,
      padding: '40px',
      boxSizing: 'border-box',  // 確保 padding 不會增加總寬度
      ...style
    }}>
      <Card className="ocean-card" style={{ 
        maxWidth: maxWidth,
        margin: '0 auto', 
        padding: 0, 
        overflow: 'hidden',
        height: height ? 'calc(100% - 80px)' : 'auto'  // 減去 padding
      }}>
        <Box className="ocean-header" style={{ padding: '32px' }}>
          <Heading size="6" style={{ marginBottom: '12px' }}>
            Admin View: Owned Willlists
          </Heading>
          <Text size="3" style={{ color: 'rgba(255,255,255,0.9)' }}>
            管理您創建的所有 Willlist，點擊管理按鈕編輯 willlist 並上傳新檔案。
          </Text>
        </Box>
        
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