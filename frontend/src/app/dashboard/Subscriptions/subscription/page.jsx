"use client";

import { ConnectButton, useCurrentAccount, useSignAndExecuteTransaction, useSuiClientQuery, useSuiClient } from "@mysten/dapp-kit";
import { useState, useEffect, useMemo } from "react";
import { useSubscribeStore } from "@/store/subscribeStore";
import { useVaultAndOwnerCap } from "@/utils/vaultUtils";
import useMoveStore from "@/store/moveStore";
const exampleService = [
  {
    name: "Cold Storage Protection",
    description: "the smart safeguard your business can't afford to ignore",
    icon: "/sui.svg",
    address: "0x2",
    status: "active",
    products: {
      GetDrop: [100, "0x2::sui::SUI", 24],
      GetDrop2: [200, "0x2::sui::SUI", 48],
    },
    nextPaymentDate: "May 29, 2025",
  },
  {
    name: "Multi Signature Security",
    description: "the smart safeguard your business can't afford to ignore",
    icon: "/sui.svg",
    address:
      "0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac",
    status: "active",
    products: {
      CoolDrop: [100, "0x2::sui::SUI", 24 * 30],
    },
    nextPaymentDate: "May 29, 2025",
  },
  {
    name: "Smart Contract Monitoring",
    description: "the smart safeguard your business can't afford to ignore",
    icon: "/sui.svg",
    address:
      "0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac",
    status: "deactivated",
    products: {
      MonitorContract: [150, "0x2::sui::SUI", 24 * 30],
    },
    nextPaymentDate: "Apr 14, 2025",
  },
  {
    name: "Cold Storage Protection",
    description: "the smart safeguard your business can't afford to ignore",
    icon: "/sui.svg",
    address: "0x2",
    status: "deactivated",
    products: {
      GetDrop: [100, "0x2::sui::SUI", 24],
    },
    nextPaymentDate: "Mar 30, 2025",
  },
  {
    name: "Multi Signature Security",
    description: "the smart safeguard your business can't afford to ignore",
    icon: "/sui.svg",
    address:
      "0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac",
    status: "deactivated",
    products: {
      CoolDrop: [100, "0x2::sui::SUI", 24 * 30],
    },
    nextPaymentDate: "Apr 5, 2025",
  },
  {
    name: "Smart Contract Monitoring",
    description: "the smart safeguard your business can't afford to ignore",
    icon: "/sui.svg",
    address: 
      "0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac",
    status: "active",
    products: {
      MonitorContract: [150, "0x2::sui::SUI", 24 * 30],
    },
    nextPaymentDate: "Jun 12, 2025",
  },
];

// Format address to show first 7 and last 5 characters
const formatAddress = (address) => {
  if (!address || address.length <= 12) return address;
  return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`;
};

// 計算每月費用
const calculateMonthlyCost = (price, days) => {
  return ((price * 30) / days).toFixed(2);
};

export default function Subscriptions() {
  const [activeTab, setActiveTab] = useState("mySubscriptions");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);  
  const [subscriptionDetails, setSubscriptionDetails] = useState({
    serviceAddress: "",
    billingCycle: false, // false = monthly, true = yearly
  });  const [isProcessing, setIsProcessing] = useState(false);
  const account = useCurrentAccount();
  const packageName = useMoveStore((state) => state.packageName);
  const SubService = useSubscribeStore((state) => state.subscribeTo);
  const [assetName, setAssetName] = useState("");
  // Get vault and owner cap information
  const { ownerCapId, vaultID } = useVaultAndOwnerCap(
    account?.address,
    packageName
  );
  const client = useSuiClient();
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
    execute: async ({ bytes, signature }) =>
      await client.executeTransactionBlock({
        transactionBlock: bytes,
        signature,
        options: {
          showEffects: true,
          showEvents: true,
          showObjectChanges: true,
          showBalanceChanges: true,
          showRawEffects: true,
        },
      }),
  });  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  // Log vault and owner cap information when available
  useEffect(() => {
    if (ownerCapId && vaultID) {
      console.log("Vault and Owner Cap information available:");
      console.log("Owner Cap ID:", ownerCapId);
      console.log("Vault ID:", vaultID);
    }
  }, [ownerCapId, vaultID]);
  // Filter services based on selected filter
  const getFilteredServices = () => {
    let filteredServices = servicesToDisplay;

    // Apply status filter
    if (filterValue === "active") {
      filteredServices = filteredServices.filter(
        (service) => service.status === "active"
      );
    } else if (filterValue === "deactivated") {
      filteredServices = filteredServices.filter(
        (service) => service.status === "deactivated"
      );
    }

    // Apply search filter
    if (searchQuery) {
      filteredServices = filteredServices.filter((service) =>
        service.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filteredServices;
  };
  useEffect(() => {
    const content = getSubscriptionDetails.data?.data?.content;
    if (content && content.dataType === "moveObject" && content.fields?.asset_name) {
      const assetName = content.fields.asset_name;
      setAssetName(assetName);
      console.log("Asset Name:", assetName);
    }
  }, [subscriptionDetails.serviceAddress]);

  // Calculate payment countdown
  const calculateCountdown = (days) => {
    // Simulate next payment time based on billing cycle
    const hoursInCycle = days < 24 ? days : days * 24;
    const millisecondsInCycle = hoursInCycle * 60 * 60 * 1000;

    // Assume subscription started at a random time in the past
    const subscriptionStartTime = currentTime - millisecondsInCycle * 0.7; // 70% through the cycle
    const nextPaymentTime = subscriptionStartTime + millisecondsInCycle;

    const timeUntilPayment = nextPaymentTime - currentTime;

    if (timeUntilPayment <= 0) {
      return { days: 0, hours: 0, minutes: 0 };
    }

    const daysUntil = Math.floor(timeUntilPayment / (1000 * 60 * 60 * 24));
    const hoursUntil = Math.floor(
      (timeUntilPayment % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
    );
    const minutesUntil = Math.floor(
      (timeUntilPayment % (1000 * 60 * 60)) / (1000 * 60)
    );

    return { days: daysUntil, hours: hoursUntil, minutes: minutesUntil };
  };
  // 獲取產品的月費用
  const getMonthlyCostForService = (service) => {
    let monthlyCost = 0;
    Object.entries(service.products).forEach(
      ([key, [price, quantity, days]]) => {
        monthlyCost += parseFloat(calculateMonthlyCost(price, days));
      }
    );
    return monthlyCost.toFixed(2);
  };
  // Handle subscription modal input changes
  const handleSubscriptionInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "billingCycle") {
      // Convert the value to boolean: 'true' -> true, 'false' -> false
      setSubscriptionDetails(prev => ({
        ...prev,
        [name]: value === 'true'
      }));
    } else {
      setSubscriptionDetails(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };
  // Close subscribe modal
  const closeSubscribeModal = () => {
    setShowSubscribeModal(false);
    setSubscriptionDetails({
      serviceAddress: "",
      billingCycle: false, // false = monthly, true = yearly
    });
    setIsProcessing(false);
  };  // Handle subscribe form submission
  const handleSubscribeSubmit = async (e) =>{
    e.preventDefault();
    setIsProcessing(true);
    console.log("Subscribing to service:", subscriptionDetails);
    
    // Check if we have the required vault and owner cap values
    if (!ownerCapId || !vaultID) {
      console.error("Missing vault or owner cap information");
      setIsProcessing(false);
      return;
    }    // Create the transaction for subscription
    const tx = await SubService(
      ownerCapId, // ownerCap object format
      vaultID, // vault ID
      subscriptionDetails.serviceAddress,
      subscriptionDetails.billingCycle,
      assetName
    );
    
    
    signAndExecuteTransaction(
      {
        transaction: tx,
        chain: "sui:testnet",
      },
      {
        onSuccess: (response) => {
          console.log("Transaction successful:", response);
          setTimeout(() => {
            setIsProcessing(false);
            closeSubscribeModal();
            // You could add a success notification here
          }, 1500);
        },
        onError: (error) => {
          console.error("Transaction failed:", error);
          setIsProcessing(false);
          // You could add an error notification here
        }
      }
    );
  };

  const getSubscriptionDetails = useSuiClientQuery(
    "getObject",
    {
      id: subscriptionDetails.serviceAddress,
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!subscriptionDetails.serviceAddress,
    },
  );
  const recepList = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: account?.address,
      options: { showType: true, showContent: true },
    },
    {
      enabled: !!account,
    }
  );

  // Filter subscription receipts and extract serviceIDs
  const subscriptionReceipts = recepList.data?.data
    ?.filter(item => 
      item.data.type && 
      item.data.type.includes("::subscription::Receipt")
    )
    .map(receipt => ({
      serviceId: receipt.data.content.fields.serviceID,
      expireDate: receipt.data.content.fields.expire_date,
      isActive: receipt.data.content.fields.is_active,
      receiptOwner: receipt.data.content.fields.receipt_owner,
      paidAmount: receipt.data.content.fields.paid_amount
    })) || [];  const serviceContent = useSuiClientQuery("multiGetObjects",{
    ids: subscriptionReceipts.map(item => item.serviceId),
    options: { showType: true, showContent: true },
  }, {
    enabled: !!subscriptionReceipts.length,
  });
  
  // Process real service data
  const realServices = useMemo(() => {
    if (!serviceContent.data || !subscriptionReceipts.length) return [];
    
    return serviceContent.data.map(service => {
      // Find the matching receipt for this service
      const receipt = subscriptionReceipts.find(r => r.serviceId === service.data?.objectId);
      
      if (!service.data || !service.data.content || !service.data.content.fields || !receipt) {
        return null;
      }
      
      const serviceFields = service.data.content.fields;
      
      // Format expire date
      const expireDate = new Date(Number(receipt.expireDate));
      const formattedDate = expireDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
      
      // Extract asset name (coin type)
      const assetName = serviceFields.asset_name.split('::').pop();
      
      // Convert price from smallest units (assuming 6 decimal places)
      const price = Number(serviceFields.price) / 1000000;
      
      return {
        receiptId: receipt.serviceId,
        name: serviceFields.service_name,
        description: `Subscription service for ${assetName}`,
        icon: "/sui.svg",
        address: serviceFields.service_owner,
        status: receipt.isActive ? "active" : "deactivated",
        yearlyDiscount: serviceFields.yearly_discount,
        assetName: assetName,
        price: price,
        nextPaymentDate: formattedDate,
        paidAmount: receipt.paidAmount,
      };
    }).filter(Boolean); // Remove any null entries
  }, [serviceContent.data, subscriptionReceipts]);
  
  // Use real services if available, otherwise use example data
  const servicesToDisplay = realServices.length > 0 ? realServices : exampleService;
  



  return (
    <div className="p-6 ml-8 mx-auto bg-white/40 text-black">      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription</h1>
          <p className="text-gray-800">
            Manage your active service subscriptions and collect monthly fees
            from your subscribers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setShowSubscribeModal(true)}
            className="px-4 py-2 bg-blue-600/70 text-white rounded-md hover:bg-blue-700/80 transition-colors"
          >
            Subscribe to New Service
          </button>
          <ConnectButton />
        </div>
      </div>{" "}
      {/* Tabs */}
      <div className="mb-6">
        <div className="flex space-x-4 mb-6">
          <button
            className={`px-4 py-1.5 ${activeTab === "mySubscriptions" ? "border-b-2 border-black font-medium" : "text-gray-800"}`}
            onClick={() => setActiveTab("mySubscriptions")}
          >
            My Subscriptions
          </button>{" "}
          <a
            href="/dashboard/Subscriptions/subscriber"
            className="px-4 py-1.5 text-gray-800 hover:text-gray-900"
          >
            My Subscribers
          </a>
        </div>
      </div>
      {/* Filter and Search */}
      <div className="flex justify-between mb-4">
        <div className="w-32">
          <select
            className="w-full border border-gray-300 rounded-md py-2 px-3 text-sm"
            value={filterValue}
            onChange={(e) => setFilterValue(e.target.value)}
          >
            <option value="all">Select filter</option>
            <option value="active">Active</option>
            <option value="deactivated">Deactivated</option>
          </select>
        </div>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg
              className="h-5 w-5 text-gray-400"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <input
            type="text"
            className="bg-white border border-gray-300 rounded-md py-2 pl-10 pr-4 text-sm w-64"
            placeholder="Search by keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>
      {/* Subscription Cards Grid */}      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {getFilteredServices().map((service, index) => {
          const isActive = service.status === "active";
          // For example services, use the getMonthlyCost function, for real services use the price directly
          const monthlyCost = service.price !== undefined ? service.price : getMonthlyCostForService(service);
          return (
            <div
              key={index}
              className={`rounded-lg overflow-hidden shadow-md ${isActive ? "bg-gradient-to-br from-blue-300 to-blue-400" : "bg-gradient-to-br from-red-300 to-red-400"}`}
            >
              <div className="px-4 pt-4 pb-2 text-black">
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="text-sm my-2 text-black/90">{service.description}</p>
                
                {/* Show service owner */}
                <div className="text-xs text-gray-800 mb-1">
                  <span className="opacity-80">Provider: </span>
                  {formatAddress(service.address)}
                </div>
                
                {/* Show receipt ID if available */}
                {service.receiptId && (
                  <div className="text-xs text-gray-800 mb-1">
                    <span className="opacity-80">Receipt ID: </span>
                    {formatAddress(service.receiptId)}
                  </div>
                )}
                
                {/* Show yearly discount badge if available */}
                {service.yearlyDiscount > 0 && (
                  <div className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded mt-1">
                    {service.yearlyDiscount}% yearly discount available
                  </div>
                )}
              </div>
              
              <div className="flex justify-between items-center px-4 py-3">
                {isActive
                  ? service.nextPaymentDate && (
                      <div className="items-start text-black">
                        <p className="text-xs opacity-80">Next Payment Date:</p>
                        <p className="text-sm">{service.nextPaymentDate}</p>
                      </div>
                    )
                  : service.nextPaymentDate && (
                      <div className="items-start text-black">
                        <p className="text-xs opacity-80">Last Payment Date:</p>
                        <p className="text-sm">{service.nextPaymentDate}</p>
                      </div>
                    )}
                <div className="text-sm flex flex-col font-medium items-end">
                  <span
                    className={`inline-block py-1 rounded text-xs font-light ${isActive ? "text-white" : "text-white"}`}
                  >
                    {isActive ? "Active" : "Deactivated"}
                  </span>
                  <div className="text-white-900 font-light">
                    {service.assetName ? `${monthlyCost} ${service.assetName}/mo` : `$${monthlyCost}/mo`}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Modal for subscribing to a new service */}
      {showSubscribeModal && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Subscribe to New Service</h2>
              <button
                onClick={closeSubscribeModal}
                disabled={isProcessing}
                className={`text-gray-500 hover:text-gray-700 ${isProcessing ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubscribeSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="serviceAddress"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Service Address
                </label>
                <input
                  type="text"
                  id="serviceAddress"
                  name="serviceAddress"
                  value={subscriptionDetails.serviceAddress}
                  onChange={handleSubscriptionInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0x..."
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Enter the address of the service you want to subscribe to
                </p>
              </div>
              
              <div className="mb-6">
                <label
                  htmlFor="billingCycle"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Billing Cycle
                </label>                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="billingCycle"
                      value="false"
                      checked={subscriptionDetails.billingCycle === false}
                      onChange={handleSubscriptionInputChange}
                      className="mr-2"
                    />
                    <span>Monthly</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="billingCycle"
                      value="true"
                      checked={subscriptionDetails.billingCycle === true}
                      onChange={handleSubscriptionInputChange}
                      className="mr-2"
                    />
                    <span>Yearly (Discount may apply)</span>
                  </label>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeSubscribeModal}
                  disabled={isProcessing}
                  className={`px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100 ${
                    isProcessing ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md ${
                    isProcessing
                      ? "opacity-70 cursor-wait"
                      : "hover:bg-blue-700"
                  }`}
                >
                  {isProcessing ? (
                    <>
                      <span className="inline-block animate-spin mr-2">↻</span>
                      Processing...
                    </>
                  ) : (
                    "Subscribe Now"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
