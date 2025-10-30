// Copyright (c), Mysten Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
import { getFullnodeUrl } from '@mysten/sui/client';
import { createNetworkConfig } from '@mysten/dapp-kit';

// Update this with your deployed package ID
const TESTNET_PACKAGE_ID = '0x832e0de8c09bc1f1ed0b91b5fb4d81e97d9f7b4a2be22e05b0ecae3a58e11eb8';

const { networkConfig, useNetworkVariable, useNetworkVariables } = createNetworkConfig({
  testnet: {
    url: getFullnodeUrl('testnet'),
    variables: {
      packageId: TESTNET_PACKAGE_ID,
      gqlClient: 'https://sui-testnet.mystenlabs.com/graphql',
    },
  },
  mainnet: {
    url: getFullnodeUrl('mainnet'),
    variables: {
      packageId: '', // Add mainnet package ID when deployed
      gqlClient: 'https://sui-mainnet.mystenlabs.com/graphql',
    },
  },
});

export { useNetworkVariable, useNetworkVariables, networkConfig };
