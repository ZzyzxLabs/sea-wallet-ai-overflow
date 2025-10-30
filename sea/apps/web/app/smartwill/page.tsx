"use client";
import "@mysten/dapp-kit/dist/index.css";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { Button, Card, Flex, Box, Text, Heading, Spinner } from '@radix-ui/themes';
import { Plus, Waves } from 'lucide-react';
import { WalrusUploader } from "@/components/WalrusUploader";
import { useCallback } from 'react';
import { useSuiClient } from '@mysten/dapp-kit';
import { CardItem, Cap } from './types';
import { oceanTheme, injectGlobalStyles } from './theme';
import { package_addr } from '@/utils/package';

export default function SmartWillPage() {
  const account = useCurrentAccount();
  const suiClient = useSuiClient();
  const packageId = package_addr;
  
  const [cardItems, setCardItems] = useState<CardItem[]>([]);
  const [selectedWilllist, setSelectedWilllist] = useState<string | null>(null);
  const [selectedCapId, setSelectedCapId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Inject global styles
  useEffect(() => {
    injectGlobalStyles();
  }, []);

  // Countdown states
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(2);
  const [seconds, setSeconds] = useState(0);

  // Setup countdown
  useEffect(() => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + daysRemaining);
    endDate.setHours(endDate.getHours() + hours);
    endDate.setMinutes(endDate.getMinutes() + minutes);
    endDate.setSeconds(endDate.getSeconds() + seconds);

    const timer = setInterval(() => {
      const now = new Date();
      const difference = endDate.getTime() - now.getTime();

      if (difference <= 0) {
        clearInterval(timer);
        setDaysRemaining(0);
        setHours(0);
        setMinutes(0);
        setSeconds(0);
      } else {
        const days = Math.floor(difference / (1000 * 60 * 60 * 24));
        const hrs = Math.floor(
          (difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
        );
        const mins = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const secs = Math.floor((difference % (1000 * 60)) / 1000);

        setDaysRemaining(days);
        setHours(hrs);
        setMinutes(mins);
        setSeconds(secs);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Fetch wills
  const getCapObj = useCallback(async () => {
    if (!account?.address) return;
    
    setLoading(true);
    try {
      // Get all owned objects first
      const allObjects = await suiClient.getOwnedObjects({
        owner: account.address,
        options: {
          showContent: true,
          showType: true,
        },
      });
      
      // Filter for OwnerCap objects locally
      const ownerCapObjects = allObjects.data.filter(obj => 
        obj.data?.type?.includes('::sea_vault::OwnerCap') || 
        obj.data?.type?.includes('::seaVault::OwnerCap')
      );
      
      const caps: Cap[] = ownerCapObjects
        .map((obj) => {
          if (!obj.data?.content || !('fields' in obj.data.content)) return null;
          const fields = (obj.data.content as { fields: any }).fields;
          return {
            id: fields?.id?.id || obj.data.objectId,
            vault_id: fields?.vaultID,
          };
        })
        .filter((item): item is Cap => item !== null && item.vault_id !== undefined);
        
      const cardItemsRaw = await Promise.all(
        caps.map(async (cap) => {
          try {
            const willlist = await suiClient.getObject({
              id: cap.vault_id,
              options: { showContent: true },
            });
            const fields = (willlist.data?.content as { fields: any })?.fields || {};
            return {
              cap_id: cap.id,
              willlist_id: cap.vault_id,
              list: fields.list || [],
              name: fields.name || 'Unnamed Will',
            };
          } catch (error) {
            console.error(`Error fetching will ${cap.vault_id}:`, error);
            return null;
          }
        }),
      );
      
      // Filter out any null results from failed fetches
      const cardItems = cardItemsRaw.filter((item): item is CardItem => item !== null);
      setCardItems(cardItems);
    } catch (error) {
      console.error('Error fetching wills:', error);
    } finally {
      setLoading(false);
    }
  }, [account?.address, packageId, suiClient]);

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

  // If managing a specific will
  if (selectedWilllist && selectedCapId) {
    return (
      <div className="min-h-screen text-slate-100 bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(40rem_40rem_at_110%_10%,rgba(147,51,234,0.18),transparent)] bg-slate-950">
        <Navigation />
        
        <main className="max-w-7xl mx-auto px-6 py-12">
          <Card className="ocean-card" style={{ padding: 0, borderRadius: '20px', overflow: 'hidden' }}>
            <Box className="ocean-header" style={{ padding: '32px' }}>
              <Flex align="center" justify="between">
                <Flex align="center" gap="3">
                  <button 
                    onClick={handleBack}
                    style={{ 
                      color: 'white',
                      padding: '8px 16px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '14px',
                      fontWeight: '500',
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)'}
                    onMouseOut={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                  >
                    ← Back
                  </button>
                  <Heading size="5" style={{ margin: 0 }}>File Upload</Heading>
                </Flex>
              </Flex>
            </Box>
            
            <Box style={{ padding: '24px' }}>
              <WalrusUploader willlistId={selectedWilllist} capId={selectedCapId} />
            </Box>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-100 bg-[radial-gradient(60rem_60rem_at_-10%_-10%,rgba(99,102,241,0.25),transparent),radial-gradient(40rem_40rem_at_110%_10%,rgba(147,51,234,0.18),transparent)] bg-slate-950">
      <Navigation />
      
      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Smart Will State</h1>
          <p className="text-sm text-slate-400">
            Monitor your smart will countdown and manage heir distributions
          </p>
        </div>

        {/* Countdown Card */}
        <Card style={{ 
          background: oceanTheme.gradients.ocean,
          marginBottom: '24px',
          borderRadius: '12px',
          padding: '20px',
          border: 'none'
        }}>
          <Flex direction="column" align="center">
            <Flex justify="center" gap="3" style={{ color: 'white', fontSize: '32px', fontWeight: 'bold', marginBottom: '12px' }}>
              <Flex direction="column" align="center">
                <span>{daysRemaining}</span>
                <span style={{ fontSize: '12px', marginTop: '4px' }}>Days</span>
              </Flex>
              <span style={{ fontSize: '24px', alignSelf: 'flex-start', marginTop: '4px' }}>:</span>
              <Flex direction="column" align="center">
                <span>{hours.toString().padStart(2, "0")}</span>
                <span style={{ fontSize: '12px', marginTop: '4px' }}>Hours</span>
              </Flex>
              <span style={{ fontSize: '24px', alignSelf: 'flex-start', marginTop: '4px' }}>:</span>
              <Flex direction="column" align="center">
                <span>{minutes.toString().padStart(2, "0")}</span>
                <span style={{ fontSize: '12px', marginTop: '4px' }}>Minutes</span>
              </Flex>
              <span style={{ fontSize: '24px', alignSelf: 'flex-start', marginTop: '4px' }}>:</span>
              <Flex direction="column" align="center">
                <span>{seconds.toString().padStart(2, "0")}</span>
                <span style={{ fontSize: '12px', marginTop: '4px' }}>Seconds</span>
              </Flex>
            </Flex>
            <Text style={{ color: 'white', fontSize: '14px' }}>Till Will Execution</Text>
          </Flex>
        </Card>

        {/* Wills List */}
        <Card className="ocean-card" style={{ padding: '20px', marginBottom: '24px' }}>
          <Heading size="4" style={{ marginBottom: '12px', color: oceanTheme.colors.text.primary }}>
            Your Wills
          </Heading>
          
          {loading && (
            <Flex align="center" justify="center" p="4">
              <Spinner size="2" />
              <Text ml="3" size="2">Loading wills...</Text>
            </Flex>
          )}
          
          {!loading && cardItems.length === 0 && (
            <Box style={{ textAlign: 'center', padding: '32px' }}>
              <Waves size={32} style={{ marginBottom: '12px', color: oceanTheme.colors.primary }} />
              <Text size="3" style={{ color: oceanTheme.colors.text.secondary }}>
                No wills found
              </Text>
            </Box>
          )}
          
          {!loading && cardItems.length > 0 && (
            <Box style={{ display: 'grid', gap: '12px' }}>
              {cardItems.map((item) => (
                <Card key={`${item.cap_id}-${item.willlist_id}`} className="ocean-card" style={{ padding: '16px' }}>
                  <Flex justify="between" align="center">
                    <Box>
                      <Heading size="3" style={{ marginBottom: '4px', color: oceanTheme.colors.text.primary }}>
                        {item.name || 'Unnamed Will'}
                      </Heading>
                      <Text size="1" style={{ color: oceanTheme.colors.text.secondary, fontFamily: 'monospace' }}>
                        ID: {item.willlist_id.slice(0, 8)}...{item.willlist_id.slice(-8)}
                      </Text>
                    </Box>
                    <Button
                      className="ocean-button"
                      size="2"
                      onClick={() => handleManage(item.willlist_id, item.cap_id)}
                    >
                      Manage
                    </Button>
                  </Flex>
                </Card>
              ))}
            </Box>
          )}
        </Card>
      </main>
    </div>
  );
}
