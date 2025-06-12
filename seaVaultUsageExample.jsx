// Example of how to use the enhanced useSeaVault hook
import React from "react";
import { useCurrentAccount } from "@mysten/dapp-kit";
import { useSeaVault } from "./seaVault";

const VaultDashboard = () => {
  const account = useCurrentAccount();
  const packageName = "your_package_name_here"; // Replace with your actual package name
  
  // Use the comprehensive hook
  const vault = useSeaVault(account?.address, packageName);

  // Show loading state
  if (vault.isLoading.any) {
    return <div>Loading vault data...</div>;
  }

  // Show error state
  if (vault.error.vaultAndCap || vault.error.vaultList) {
    return <div>Error loading vault data</div>;
  }

  // Show no vault state
  if (!vault.helpers.hasVault()) {
    return <div>No vault found</div>;
  }

  return (
    <div className="vault-dashboard">
      <h2>SeaVault Dashboard</h2>
      
      {/* Vault Info */}
      <div className="vault-info">
        <h3>Vault Information</h3>
        <p>Vault ID: {vault.vaultID}</p>
        <p>Owner Cap ID: {vault.ownerCapId}</p>
        <p>Total Unique Coins: {vault.helpers.getTotalUniqueCoins()}</p>
        <p>Has Coins: {vault.helpers.hasCoins() ? "Yes" : "No"}</p>
      </div>

      {/* Coin List */}
      <div className="coin-list">
        <h3>Coins in Vault</h3>
        {vault.processedCoins.length === 0 ? (
          <p>No coins in vault</p>
        ) : (
          <div className="coin-grid">
            {vault.processedCoins.map((coin, index) => (
              <div key={index} className="coin-item">
                <div>
                  <strong>{coin.symbol}</strong>
                  <span className="coin-type">{coin.formattedType}</span>
                </div>
                <div className="coin-balance">
                  {coin.displayBalance.toFixed(coin.decimals)} {coin.symbol}
                </div>
                <div className="coin-details">
                  <small>Raw Balance: {coin.balance}</small>
                  <small>Decimals: {coin.decimals}</small>
                  <small>Object ID: {coin.objectId.substring(0, 10)}...</small>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="vault-actions">
        <button onClick={() => vault.refetch.all()}>
          Refresh All Data
        </button>
        <button onClick={() => vault.refetch.vaultContents()}>
          Refresh Coins Only
        </button>
      </div>

      {/* Debug Info */}
      <details className="debug-info">
        <summary>Debug Information</summary>
        <pre>{JSON.stringify({
          vaultID: vault.vaultID,
          objectIds: vault.objectIds,
          coinTypes: vault.coinTypes,
          loadingStates: vault.isLoading,
          successStates: vault.isSuccess
        }, null, 2)}</pre>
      </details>
    </div>
  );
};

// Example of using specific helper functions
const VaultHelperExamples = () => {
  const account = useCurrentAccount();
  const packageName = "your_package_name_here";
  const vault = useSeaVault(account?.address, packageName);

  const handleFindCoinBySymbol = (symbol) => {
    const coin = vault.helpers.getCoinBySymbol(symbol);
    console.log(`Found coin for ${symbol}:`, coin);
  };

  const handleFindCoinByType = (type) => {
    const coin = vault.helpers.getCoinByType(type);
    console.log(`Found coin for type ${type}:`, coin);
  };

  return (
    <div>
      <h3>Helper Function Examples</h3>
      <button onClick={() => handleFindCoinBySymbol("SUI")}>
        Find SUI Coin
      </button>
      <button onClick={() => handleFindCoinByType("0x2::sui::SUI")}>
        Find by Full Type
      </button>
      
      {/* Display some helper results */}
      <div>
        <p>Has Vault: {vault.helpers.hasVault().toString()}</p>
        <p>Has Owner Cap: {vault.helpers.hasOwnerCap().toString()}</p>
        <p>Is Empty: {vault.helpers.isEmpty().toString()}</p>
        <p>Is Ready: {vault.helpers.isReady().toString()}</p>
      </div>
    </div>
  );
};

export default VaultDashboard;
export { VaultHelperExamples };
