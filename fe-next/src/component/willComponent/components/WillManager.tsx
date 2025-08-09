"use client"
import { useCurrentAccount, useSignAndExecuteTransaction, useSuiClient } from '@mysten/dapp-kit';
import { Transaction } from '@mysten/sui/transactions';
import { Button, Card, Flex, Box, Text, Heading, Tabs } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { X, ArrowLeft, Plus } from 'lucide-react';
import { isValidSuiAddress } from '@mysten/sui/utils';
import { useNetworkVariable } from '../../../app/networkConfig';
import { oceanTheme } from '../theme/oceanTheme';
import { Willlist } from '../types';
import { WalrusUploader } from './WalrusUploader';

interface WilllistManagerProps {
  willlistId: string;
  capId: string;
  onBack: () => void;
  style?: React.CSSProperties;
}

export function WilllistManager({ willlistId, capId, onBack, style }: WilllistManagerProps) {
  const packageId = useNetworkVariable('packageId');
  const suiClient = useSuiClient();
  const currentAccount = useCurrentAccount();
  const [willlist, setWilllist] = useState<Willlist>();
  const [newAddress, setNewAddress] = useState('');
  const [activeTab, setActiveTab] = useState('addresses');

  useEffect(() => {
    async function getWilllist() {
      if (!currentAccount?.address || !willlistId) {
        return;
      }

      try {
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
            setNewAddress('');
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

  // ... 餘下的 JSX 代碼保持不變
  return (
    <Card className="ocean-card" style={{ padding: 0, borderRadius: '20px', overflow: 'hidden' }}>
      {/* 完整的組件 JSX 內容 */}
    </Card>
  );
}