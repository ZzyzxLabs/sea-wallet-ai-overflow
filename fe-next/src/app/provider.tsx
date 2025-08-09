"use client";

import { SuiClientProvider, WalletProvider } from "@mysten/dapp-kit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { Theme } from "@radix-ui/themes";
import "@radix-ui/themes/styles.css";
import "@mysten/dapp-kit/dist/index.css";
import { ThemeProvider } from "../component/ThemeContext";
import { networkConfig } from './networkConfig';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <Theme appearance="dark">
        <QueryClientProvider client={queryClient}>
          <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
            <WalletProvider autoConnect >
              {children}
            </WalletProvider>
          </SuiClientProvider>
        </QueryClientProvider>
      </Theme>
    </ThemeProvider>
  );
}