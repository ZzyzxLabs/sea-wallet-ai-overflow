"use client";
import { useState } from 'react';
import { ConnectButton, useSuiClientQuery } from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { useSubscribeStore } from '../../../../store/subscribeStore';
import { useSignAndExecuteTransaction } from "@mysten/dapp-kit";
// Sample data based on the screenshot
const subscriberData = [
  {
    name: 'Alex Johnson',
    email: 'alex@example.com',
    service: 'Web3 CRM',
    subscribedOn: 'Jan 15, 2025',
    price: '$5.99/mo',
    tier: 'Starter',
    status: 'active',
  },
  {
    name: 'Sara Williams',
    email: 'sarah@example.com',
    service: 'Web3 CRM',
    subscribedOn: 'Sep 6, 2024',
    price: '$9.99/mo',
    tier: 'Team',
    status: 'collected',
  },
  {
    name: 'Mike Brown',
    email: 'michael@example.com',
    service: 'Multi-Signature Security',
    subscribedOn: 'Jan 15, 2025',
    price: '$14.99/mo',
    tier: 'Enterprise',
    status: 'active',
  },
  {
    name: 'Alex Johnson',
    email: 'alex@example.com',
    service: 'Web3 CRM',
    subscribedOn: 'Jan 15, 2025',
    price: '$5.99/mo',
    tier: 'Starter',
    status: 'active',
  },
  {
    name: 'Sara Williams',
    email: 'sarah@example.com',
    service: 'ShitCoin Generator',
    subscribedOn: 'Sep 6, 2024',
    price: '$5.99/mo',
    tier: 'Starter',
    status: 'collected',
  },
];

// Format address to show first 7 and last 5 characters
const formatAddress = (address) => {
  if (!address || address.length <= 12) return address;
  return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`;
};

export default function Subscribers() {
  const { mutate: signAndExecuteTransaction } = useSignAndExecuteTransaction({
      execute: async ({ bytes, signature }) =>
        await suiClient.executeTransactionBlock({
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
    }); 
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);  const [newService, setNewService] = useState({
    name: '',
    coinType: '0x2::sui::SUI',
    price: '',
    serviceAddress: '',
    yearlyDiscount: '0'
  });
  
  const createService = useSubscribeStore((state) => state.createService);
  
  // Query coin metadata to get decimals
  const coinMetadata = useSuiClientQuery(
    "getCoinMetadata",
    {
      coinType: newService.coinType,
    },
    {
      enabled: !!newService.coinType,
      staleTime: 10000,
    }
  );
  // Get unique service types for filtering
  const services = ['All', ...new Set(subscriberData.map(sub => sub.service))];

  // Filter subscribers based on selected service type and search query
  const filteredSubscribers = subscriberData.filter(subscriber => {
    const matchesFilter = filter === 'All' || subscriber.service === filter;
    const matchesSearch = searchQuery === '' || 
      subscriber.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscriber.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      subscriber.service.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });
  
  // Handle input changes for the new service form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewService(prev => ({ ...prev, [name]: value }));
  };
    // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Get the decimals for the selected coin type
      const decimals = coinMetadata.data?.decimals || 9; // Default to 9 if not available
      
      // Convert price to smallest unit by multiplying by 10^decimals
      const priceInSmallestUnit = Math.floor(parseFloat(newService.price) * Math.pow(10, decimals));
      
      console.log('New service data:', {
        ...newService,
        priceInSmallestUnit,
        decimals
      });
      
      // Create the service with price in smallest units
      const tx = await createService(
        newService.coinType, 
        priceInSmallestUnit, 
        newService.name, 
        newService.serviceAddress, 
        parseInt(newService.yearlyDiscount)
      );
      signAndExecuteTransaction(
        {
          transaction: tx,
          chain: "sui:testnet"
        },
        {
          onSuccess: (result) => {
            console.log("Transaction executed successfully", result);
            setTransactionDigest(result.digest);
            setTransactionStatus("Success");
            setErrorr("");
            // Don't close modal immediately to show the transaction digest
        setTimeout(() => {
          closeModal();
        }, 5000); // Show transaction result for 5 seconds before closing
            // You can do additional operations with the result here
            // Such as showing transaction details or refreshing data
          },
          onError: (error) => {
            console.error("Transaction error:", error);
            setTransactionStatus("Failed");
            setErrorr("Transaction failed: " + (error.message || "Unknown error"));
            setIsProcessing(false);
          }
        }
      );
      // Reset form and close modal
      setNewService({
        name: '',
        coinType: '0x2::sui::SUI',
        price: '',
        serviceAddress: '',
        yearlyDiscount: '0'
      });
      setShowModal(false);
    } catch (error) {
      console.error("Error creating service:", error);
      // You could add error handling UI here
    }
  };
  
  return (
    <div className="p-6 ml-8 mx-auto bg-white text-black">      {/* Header */}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription</h1>
          <p className="text-gray-600">
            Manage your active service subscriptions and collect monthly fees from your subscribers
          </p>
        </div>
        <ConnectButton />
      </div>
        <div className="mb-6">        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <a href="/dashboard/Subscriptions/subscription"
            className="px-4 py-1.5 text-gray-600 hover:text-gray-900"
          >
            My Subscriptions
          </a>
          <button 
            className="px-4 py-1.5 border-b-2 border-black font-medium"
          >
            My Subscribers
          </button>
        </div>        {/* Filter and Search */}
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            <select
              className="w-32 border border-gray-300 rounded-md py-2 px-3 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="All">All</option>
              <option value="ShitCoin Generator">ShitCoin Generator</option>
              <option value="Multi-Signature Security">Multi-sign Security</option>
              <option value="Web3 CRM">Web3 CRM</option>
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
              placeholder="Search by keyword..."
              className="bg-white border border-gray-300 rounded-md py-2 pl-10 pr-4 text-sm w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>
        {/* Subscription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {filteredSubscribers.map((subscriber, index) => {
          const isActive = subscriber.status === 'active';
          return (
            <div key={index} 
            className={`rounded-lg overflow-hidden shadow-md ${
              isActive 
                ? "bg-gradient-to-br from-blue-400 to-blue-600" 
                : "bg-gradient-to-br from-gray-400 to-gray-600"
            }`}>
              <div className="px-4 pt-4 pb-2 text-white">
                <h3 className="text-lg font-semibold">{subscriber.name}</h3>
                <p className="text-sm text-white/90">{subscriber.email}</p>
              </div>
              
              <div className="px-4 py-2">
                <p className="text-sm font-medium text-white">{subscriber.service}</p>
              </div>
              
              <div className="flex justify-between items-center px-4 py-3">
                <div className="px-0 pb-1 text-white">
                  <p className="text-xs opacity-80">Subscribed on</p>
                  <p className="text-sm">{subscriber.subscribedOn}</p>
                </div>
                <div className="text-sm flex flex-col font-medium items-end">
                  <span
                    className="inline-block py-1 rounded text-xs font-light text-white"
                  >
                    {subscriber.tier}
                  </span>
                  <div className="text-white font-bold">{subscriber.price}</div>
                  <button 
                    className={`mt-2 px-4 py-1 rounded-md ${
                      subscriber.status === 'collected' 
                        ? 'bg-gray-700 text-white/70 cursor-not-allowed' 
                        : 'bg-white text-blue-600 hover:bg-blue-50'
                    }`}
                    disabled={subscriber.status === 'collected'}
                  >
                    {subscriber.status === 'collected' ? 'Collected' : 'Collect'}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        
        {/* Add New Service Card */}
        <div 
          onClick={() => setShowModal(true)}
          className="rounded-lg overflow-hidden shadow-md bg-gradient-to-br from-green-400 to-green-600 flex flex-col justify-center items-center cursor-pointer h-full min-h-[200px] hover:shadow-lg transition-shadow"
        >
          <div className="text-center p-6">
            <div className="bg-white rounded-full p-3 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className="h-10 w-10 text-green-500" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Add New Service</h3>
            <p className="text-sm mt-2 text-white/80">Create a new subscription service</p>
          </div>
        </div>
      </div>
        {/* Empty state */}
      {filteredSubscribers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg shadow-sm">
          <p className="text-gray-500">No subscribers found matching your criteria.</p>
        </div>
      )}

      {/* Modal for Add New Service */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Service</h2>
              <button 
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-6 w-6" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Name
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={newService.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g. Web3 CRM"
                  required
                />
              </div>
                <div className="mb-4">
                <label htmlFor="coinType" className="block text-sm font-medium text-gray-700 mb-1">
                  Coin Type
                </label>
                <input
                  type="text"
                  id="coinType"
                  name="coinType"
                  value={newService.coinType}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0x2::sui::SUI"
                  required
                  pattern="0x[0-9a-fA-F]+::[a-zA-Z0-9_]+::[a-zA-Z0-9_]+"
                  title="Format should be 0x00000::cointype::coinname"
                />
                <p className="text-xs text-gray-500 mt-1">Format: 0x00000::cointype::coinname (e.g., 0x2::sui::SUI)</p>
              </div>
              
              <div className="mb-4">
                <label htmlFor="price" className="block text-sm font-medium text-gray-700 mb-1">
                  Price (per month)
                </label>
                <div className="relative">                  <input
                    type="number"
                    id="price"
                    name="price"
                    value={newService.price}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                  <span className="absolute right-3 top-2 text-gray-500">
                    {coinMetadata.data?.symbol || newService.coinType.split('::').pop()}
                  </span>
                </div>
              </div>
              
              <div className="mb-4">
                <label htmlFor="serviceAddress" className="block text-sm font-medium text-gray-700 mb-1">
                  Service Address
                </label>
                <input
                  type="text"
                  id="serviceAddress"
                  name="serviceAddress"
                  value={newService.serviceAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0x..."
                  required
                />
              </div>
              
              <div className="mb-6">
                <label htmlFor="yearlyDiscount" className="block text-sm font-medium text-gray-700 mb-1">
                  Yearly Discount (%)
                </label>
                <input
                  type="number"
                  id="yearlyDiscount"
                  name="yearlyDiscount"
                  value={newService.yearlyDiscount}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  min="0"
                  max="100"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Create Service
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}