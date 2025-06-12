"use client";
import React, { useEffect, useState, useCallback } from "react";
import { useCurrentAccount, useSuiClientQueries, useSuiClientQuery } from "@mysten/dapp-kit";
import useMoveStore from "../store/moveStore";
import { Img } from "react-image";

const ContractAlterScroll = () => {
  const account = useCurrentAccount();
  const [coinsInVault, setCoinsInVault] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const packageName = useMoveStore((state) => state.packageName);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [coinTypes, setCoinTypes] = useState([]);
  const [formattedAmounts, setFormattedAmounts] = useState([]);
  const [manualControl, setManualControl] = useState(false);
  const [coinIcons, setCoinIcons] = useState([]);

  const vaultAndCap = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address,
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!account?.address,
      staleTime: 30000,
    }
  );

  const getVaultAndCap = useCallback(() => {
    let ownerCapObjects = null;
    let vaultID = null;
    if (vaultAndCap.data) {
      ownerCapObjects = vaultAndCap.data.data.filter((obj) =>
        obj.data?.type?.includes(packageName + "::seaVault::OwnerCap")
      );
      vaultID = ownerCapObjects[0]?.data?.content?.fields?.vaultID;
    }
    return { ownerCapObjects, vaultID };
  }, [vaultAndCap.data, packageName]);

  const { vaultID } = getVaultAndCap();

  const vaultList = useSuiClientQuery(
    "getDynamicFields",
    { parentId: vaultID },
    {
      enabled: !!vaultID,
      staleTime: 30000,
    }
  );

  const getObjectIds = useCallback(() => {
    if (!vaultList?.data?.data) return [];
    return vaultList.data.data.map((item) => item.objectId);
  }, [vaultList?.data]);

  const objectIds = getObjectIds();

  const coinData = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: objectIds,
      options: { showContent: true, showType: true },
    },
    {
      enabled: objectIds.length > 0,
      staleTime: 30000,
    }
  );

  const coinMetadataQueries = useSuiClientQueries({
    queries: coinTypes.map(coinType => ({
      method: "getCoinMetadata",
      params: { coinType: coinType }
    })),
    combine: (result) => ({
      data: result.map((res) => res.data),
      isSuccess: result.every((res) => res.isSuccess),
      isPending: result.some((res) => res.isPending),
      isError: result.some((res) => res.isError),
    }),
    enabled: coinTypes.length > 0,
    staleTime: 30000,
  });

  useEffect(() => {
    if (!coinMetadataQueries?.data) return;
    const icons = coinMetadataQueries.data.map(metadata => metadata?.iconUrl || null);
    setCoinIcons(icons);
  }, [coinMetadataQueries?.data]);

  useEffect(() => {
    if (!coinMetadataQueries?.data || !coinsInVault.length) return;
    const formatted = coinsInVault.map((coin, index) => {
      const amount = BigInt(coin[2]);
      const decimals = coinMetadataQueries.data[index]?.decimals || 0;
      const divisor = BigInt(10) ** BigInt(decimals);
      let formattedAmount;
      if (divisor === BigInt(1)) {
        formattedAmount = amount.toString();
      } else {
        const integerPart = amount / divisor;
        const fractionalPart = amount % divisor;
        const paddedFractionalPart = fractionalPart.toString().padStart(decimals, '0');
        formattedAmount = `${integerPart}.${paddedFractionalPart}`.replace(/\.?0+$/, '');
      }
      return formattedAmount;
    });
    setFormattedAmounts(formatted);
  }, [coinMetadataQueries?.data, coinsInVault]);

  useEffect(() => {
    if (!coinData.data) return;
    const processedCoins = [];
    const extractedCoinTypes = [];
    coinData.data.forEach((coinObj) => {
      if (!coinObj?.data?.content) return;
      const type = coinObj.data.type || "";
      const typeMatch = type.match(/<(.+)>/);
      const fullCoinType = typeMatch ? typeMatch[1] : "Unknown";
      let formattedCoinType = "Unknown";
      if (fullCoinType !== "Unknown") {
        const parts = fullCoinType.split("::");
        if (parts.length > 0) {
          const address = parts[0];
          formattedCoinType = address.length > 10
            ? `${address.substring(0, 7)}...${address.substring(address.length - 5)}::${parts.slice(1).join("::")}`
            : fullCoinType;
        }
      }
      const coinSymbol = fullCoinType.split("::").pop() || "Unknown";
      const amount = coinObj.data?.content?.fields?.balance || "0";
      processedCoins.push([coinSymbol, formattedCoinType, amount, fullCoinType]);
      extractedCoinTypes.push(fullCoinType);
    });
    setCoinsInVault(processedCoins);
    setCoinTypes(extractedCoinTypes);
    setIsLoading(false);
  }, [coinData.data]);

  useEffect(() => {
    const isDataLoading = !coinData.data && objectIds.length > 0;
    setIsLoading(isDataLoading);
  }, [coinData.data, objectIds]);

  useEffect(() => {
    if (coinsInVault.length <= 1) return;
    let timer;
    if (!manualControl) {
      timer = setInterval(() => {
        setAnimating(true);
        setTimeout(() => {
          setCurrentIndex((prevIndex) => (prevIndex + 1) % coinsInVault.length);
          setAnimating(false);
        }, 700);
      }, 6000);
    }
    return () => clearInterval(timer);
  }, [coinsInVault.length, manualControl]);

  const goToPrevious = () => {
    setManualControl(true);
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex - 1 + coinsInVault.length) % coinsInVault.length);
      setAnimating(false);
    }, 700);
    setTimeout(() => setManualControl(false), 6000);
  };

  const goToNext = () => {
    setManualControl(true);
    setAnimating(true);
    setTimeout(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % coinsInVault.length);
      setAnimating(false);
    }, 700);
    setTimeout(() => setManualControl(false), 6000);
  };

  const getTokenIcon = (tokenName, iconUrl) => {
    if (iconUrl) {
      return (
        <div className="rounded-full w-8 h-8 flex items-center justify-center shadow-lg relative overflow-hidden">
          <Img
            src={iconUrl}
            alt={`${tokenName} icon`}
            className="w-full h-full object-cover"
            loader={
              <div className="w-full h-full flex items-center justify-center bg-gray-200 animate-pulse">
                <span className="text-sm font-bold text-gray-500">{tokenName.substring(0, 2).toUpperCase()}</span>
              </div>
            }
            unloader={
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-r from-gray-300 to-gray-400">
                <span className="text-sm font-bold text-white">{tokenName.substring(0, 2).toUpperCase()}</span>
              </div>
            }
          />
        </div>
      );
    }
    const initials = tokenName.substring(0, 2).toUpperCase();
    const hash = tokenName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const hue = hash % 360;
    return (
      <div
        className="rounded-full w-8 h-8 flex items-center justify-center shadow-lg"
        style={{ background: `hsl(${hue}, 70%, 80%)` }}
      >
        <span className="text-sm font-bold text-white">{initials}</span>
      </div>
    );
  };

  return (
    <div className="flex justify-center items-center w-full">
      <div className="rounded-2xl backdrop-blur-lg bg-white/60 shadow-xl p-0 w-full max-w-3xl h-20 overflow-hidden border border-white/40 transition-all duration-300 hover:shadow-2xl">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="inline-block animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-indigo-500 mr-3"></div>
            <p className="text-gray-700 font-medium">Loading assets...</p>
          </div>
        ) : coinsInVault.length > 0 ? (
          <div className="relative h-full">
            <div
              className={`transition-all duration-700 ease-in-out transform h-full ${
                animating ? "opacity-0 translate-y-8 scale-98" : "opacity-100 translate-y-0 scale-100"
              }`}
            >
              <div className="flex items-center justify-between h-full px-6">
                <div className="flex items-center space-x-3">
                  {getTokenIcon(coinsInVault[currentIndex][0], coinIcons[currentIndex])}
                  <div>
                    <div className="text-gray-900 font-semibold tracking-tight">
                      {coinsInVault[currentIndex][0]}
                    </div>
                    <div className="text-xs text-gray-500 font-medium">{coinsInVault[currentIndex][1]}</div>
                  </div>
                </div>
                <div className="flex-1 max-w-xs mx-6">
                  <div className="bg-gradient-to-r from-gray-50/70 to-white/80 rounded-xl p-2.5 transform transition-all duration-300 hover:scale-102 hover:shadow-sm">
                    <div className="flex justify-between items-center">
                      <div className="text-gray-800 font-medium text-xs uppercase tracking-wider">Amount</div>
                      <div className="text-lg font-bold text-gray-900 tracking-tight">
                        {formattedAmounts[currentIndex] || "0"}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-5">
                  <div className="text-right">
                    <div className="text-gray-800 font-medium text-xs uppercase tracking-wider">Estimated Value</div>
                    <div className="text-lg font-bold text-gray-900 tracking-tight">-</div>
                  </div>
                  {coinsInVault.length > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={goToPrevious}
                        className="text-gray-700 hover:text-indigo-600 transition-all p-1 rounded-full hover:bg-white/80 active:scale-95"
                        aria-label="Previous asset"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                        </svg>
                      </button>
                      <div className="flex space-x-1">
                        {coinsInVault.map((_, index) => (
                          <div
                            key={index}
                            className={`h-1.5 rounded-full transition-all duration-500 ${
                              index === currentIndex
                                ? "w-4 bg-gradient-to-r from-indigo-400 to-indigo-600 shadow-sm"
                                : "w-1.5 bg-gray-300/70 hover:bg-gray-400/80 cursor-pointer"
                            }`}
                            onClick={() => {
                              if (index !== currentIndex) {
                                setManualControl(true);
                                setAnimating(true);
                                setTimeout(() => {
                                  setCurrentIndex(index);
                                  setAnimating(false);
                                }, 700);
                                setTimeout(() => setManualControl(false), 6000);
                              }
                            }}
                          ></div>
                        ))}
                      </div>
                      <button
                        onClick={goToNext}
                        className="text-gray-700 hover:text-indigo-600 transition-all p-1 rounded-full hover:bg-white/80 active:scale-95"
                        aria-label="Next asset"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center px-6">
            <div className="bg-gradient-to-br from-gray-100/80 to-white/90 rounded-full w-10 h-10 flex items-center justify-center text-gray-400 text-xl mr-4 backdrop-blur-sm shadow-inner">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <div>
              <p className="text-gray-700 font-semibold">No assets in your vault</p>
              <p className="text-gray-500 text-xs">Add assets to see them</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ContractAlterScroll;