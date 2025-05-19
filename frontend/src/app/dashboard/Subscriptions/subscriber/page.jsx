"use client";
import { useState } from "react";
import {
  ConnectButton,
  useSuiClientQuery,
  useSuiClient,
} from "@mysten/dapp-kit";
import "@mysten/dapp-kit/dist/index.css";
import { useSubscribeStore } from "../../../../store/subscribeStore";
import {
  useSignAndExecuteTransaction,
  useCurrentAccount,
} from "@mysten/dapp-kit";

// Format address to show first 7 and last 5 characters
const formatAddress = (address) => {
  if (!address || address.length <= 12) return address;
  return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`;
};

// Format price with currency symbol
const formatPrice = (price) => {
  return price ? `$${Number(price).toFixed(2)}/mo` : "$0.00/mo";
};

export default function ServiceDirectory() {
  const acc = useCurrentAccount();
  const client = useSuiClient();
  const [copiedAddressId, setCopiedAddressId] = useState(null);

  // Function to copy text to clipboard and show animation
  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedAddressId(id);
      setTimeout(() => setCopiedAddressId(null), 2000); // Reset after 2 seconds
    });
  };

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
  });
  const [filter, setFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [errorr, setErrorr] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [transactionDigest, setTransactionDigest] = useState("");
  const [newService, setNewService] = useState({
    name: "",
    coinType: "0x2::sui::SUI",
    price: "",
    serviceAddress: "",
    yearlyDiscount: "0",
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
  );  const getObjectt = useSuiClientQuery(
    "getOwnedObjects",
    {
      owner: acc?.address,
      options: {
        showContent: true,
        showType: true,
      },
    },
    {
      enabled: !!acc?.address,
      staleTime: 10000,
    }
  );
  console.log("getObjectt", getObjectt.data);
  // Extract service IDs from ServiceCap objects
  const serviceCapObjects = getObjectt.data?.data?.filter(obj => {
    return obj?.data?.type && obj?.data?.type.includes("::subscription::ServiceCap");
  }) || [];
  
  // Get the service_id from each ServiceCap object
  const serviceIds = serviceCapObjects.map(capObj => 
    capObj?.data?.content?.fields?.service_id
  ).filter(Boolean);
  
  console.log("Service IDs:", serviceIds);
  
  // Query the actual Service objects using the IDs
  const serviceObjectsQuery = useSuiClientQuery(
    "multiGetObjects",
    {
      ids: serviceIds,
      options: {
        showContent: true,
        showType: true,
      }
    },
    {
      enabled: serviceIds.length > 0,
      staleTime: 10000,
    }
  );
    console.log("Service Objects:", serviceObjectsQuery.data);
    // Extract service data from the query results
  const servicesData = serviceObjectsQuery.data?.map(obj => {
    if (obj?.data?.content?.fields) {
      const fields = obj.data.content.fields;
      return {
        service: fields.service_name,
        serviceDescription: `${fields.service_name} Subscription Service`,
        coinType: fields.asset_name,
        price: parseInt(fields.price) / 1000000000, // Convert from smallest unit to SUI
        yearlyDiscount: fields.yearly_discount,
        serviceAddress: fields.service_owner,
        objectId: obj.data.objectId,
        status: "active", // Assuming all services are active by default
        tier: "Standard" // Default tier
      };
    }
    return null;
  }).filter(Boolean) || [];
  
  console.log("Processed Services Data:", servicesData);
  
  const subscriptionServices = getObjectt.data?.data?.filter(obj => {
    // Check if object type contains "subscription::Service"
    return obj?.data?.type && obj?.data?.type.includes("::subscription::Service");
  }) || [];
    console.log("Subscription Services:", subscriptionServices);
  
  // Get unique service names for the filter dropdown
  const services = [
    "All",
    ...new Set(servicesData.map(service => service.service).filter(Boolean))
  ];
  
  // Filter services based on selected service type and search query
  const filteredSubscribers = servicesData.filter((service) => {
    const matchesFilter = filter === "All" || service.service === filter;
    const matchesSearch =
      searchQuery === "" ||
      service.service.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.serviceDescription
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      service.coinType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (service.tier && service.tier.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesFilter && matchesSearch;
  });
  // Handle input changes for the new service form
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewService((prev) => ({ ...prev, [name]: value }));
  };  // Function to close the modal with animation
  const closeModal = () => {
    // Clear any error messages
    setErrorr("");
    setTransactionDigest("");
    setIsProcessing(false);

    // Close the modal
    setShowModal(false);
    
    // Refetch the service data
    getObjectt.refetch();
    
    // Refetch service objects if there are service IDs
    if (serviceIds.length > 0) {
      serviceObjectsQuery.refetch();
    }
  }; // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    // Clear previous errors and set processing state
    setErrorr("");
    setIsProcessing(true);
    setTransactionDigest("");

    try {
      // Get the decimals for the selected coin type
      const decimals = coinMetadata.data?.decimals || 9; // Default to 9 if not available

      // Convert price to smallest unit by multiplying by 10^decimals
      const priceInSmallestUnit = Math.floor(
        parseFloat(newService.price) * Math.pow(10, decimals)
      );

      console.log("New service data:", {
        ...newService,
        priceInSmallestUnit,
        decimals,
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
          chain: "sui:testnet",
        },        {
          onSuccess: (result) => {
            console.log("Transaction executed successfully", result);
            setTransactionDigest(result.digest);
            setIsProcessing(false);

            // Refetch the service data immediately after transaction success
            getObjectt.refetch();

            // Reset form values
            setNewService({
              name: "",
              coinType: "0x2::sui::SUI",
              price: "",
              serviceAddress: "",
              yearlyDiscount: "0",
            });

            // Don't close modal immediately to show the transaction digest
            setTimeout(() => {
              closeModal();
            }, 5000); // Show transaction result for 5 seconds before closing
          },
          onError: (error) => {
            console.error("Transaction error:", error);
            setErrorr(
              "Transaction failed: " + (error.message || "Unknown error")
            );
            setIsProcessing(false);
          },
        }
      );
    } catch (error) {
      console.error("Error creating service:", error);
      setErrorr("Error: " + (error.message || "An unexpected error occurred"));
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 ml-8 mx-auto bg-white text-black">
      {" "}
      {/* Header */}{" "}
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Service Directory</h1>
          <p className="text-gray-600">
            Browse available services and manage subscriptions
          </p>
        </div>
        <ConnectButton />
      </div>
      <div className="mb-6">
        {" "}
        {/* Tabs */}
        <div className="flex space-x-4 mb-6">
          <a
            href="/dashboard/Subscriptions/subscription"
            className="px-4 py-1.5 text-gray-600 hover:text-gray-900"
          >
            My Subscriptions
          </a>
          <button className="px-4 py-1.5 border-b-2 border-black font-medium">
            My Subscribers
          </button>
        </div>
        {/* Filter and Search */}
        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            {" "}
            <select
              className="w-40 border border-gray-300 rounded-md py-2 px-3 text-sm"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              {services.map((service, index) => (
                <option key={index} value={service}>
                  {service}
                </option>
              ))}
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
      </div>      {/* Subscription Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {filteredSubscribers.map((subscriber, index) => {
          const isActive = subscriber.status === "active";
          const tier = subscriber.tier || "Standard";
          return (
            <div
              key={index}
              className={`rounded-lg overflow-hidden shadow-md ${
                isActive
                  ? "bg-gradient-to-br from-blue-400 to-blue-600"
                  : "bg-gradient-to-br from-gray-400 to-gray-600"
              }`}
            >
              <div className="px-4 pt-4 pb-2 text-white">
                <h3 className="text-lg font-semibold">{subscriber.service}</h3>
                <p className="text-sm text-white/90">
                  {subscriber.serviceDescription}
                </p>
              </div>              <div className="px-4 py-2">
                <div className="flex items-baseline">
                  <p className="text-sm font-medium text-white">
                    Service Address:
                  </p>
                  <button 
                    onClick={() => copyToClipboard(subscriber.serviceAddress, `address-${index}`)}
                    className="text-xs text-white/80 ml-2 hover:text-white cursor-pointer flex items-center"
                    title="Click to copy address"
                  >
                    {formatAddress(subscriber.serviceAddress)}
                    {copiedAddressId === `address-${index}` ? (
                      <span className="ml-2 text-green-300 transition-opacity duration-300">
                        ✓ Copied!
                      </span>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>                {subscriber.objectId && (
                  <div className="flex items-baseline mt-1">
                    <p className="text-sm font-medium text-white">
                      Object ID:
                    </p>
                    <button 
                      onClick={() => copyToClipboard(subscriber.objectId, `object-${index}`)}
                      className="text-xs text-white/80 ml-2 hover:text-white cursor-pointer flex items-center"
                      title="Click to copy object ID"
                    >
                      {formatAddress(subscriber.objectId)}
                      {copiedAddressId === `object-${index}` ? (
                        <span className="ml-2 text-green-300 transition-opacity duration-300">
                          ✓ Copied!
                        </span>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-between items-center px-4 py-3">
                <div className="flex flex-col text-white">
                  <p className="text-xs opacity-80 mb-1">Coin Type:</p>
                  <p className="text-sm font-medium">
                    {typeof subscriber.coinType === 'string' ? 
                      subscriber.coinType.split("::").pop() : 
                      'SUI'}
                  </p>
                </div>
                <div className="text-sm flex flex-col items-end">
                  <span
                    className={`inline-block py-1 px-2 rounded-full text-xs font-medium bg-white/20 text-white mb-1`}
                  >
                    {tier}
                  </span>
                  <div className="text-white font-bold">
                    {formatPrice(subscriber.price)}
                  </div>
                  {subscriber.yearlyDiscount > 0 && (
                    <div className="text-xs text-white/80 mb-2">
                      {subscriber.yearlyDiscount}% yearly discount
                    </div>
                  )}
                  <button
                    className={`mt-1 px-4 py-1 rounded-md ${
                      subscriber.status === "collected"
                        ? "bg-gray-700 text-white/70 cursor-not-allowed"
                        : "bg-white text-blue-600 hover:bg-blue-50"
                    }`}
                    disabled={subscriber.status === "collected"}
                  >
                    {subscriber.status === "collected"
                      ? "Collected"
                      : "Collect"}
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white">Add New Service</h3>
            <p className="text-sm mt-2 text-white/80">
              Create a new subscription service
            </p>
          </div>
        </div>
      </div>{" "}
      {/* Empty state */}
      {filteredSubscribers.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg shadow-sm">
          <p className="text-gray-500">
            No services found matching your criteria.
          </p>
        </div>
      )}
      {/* Modal for Add New Service */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            {" "}
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Add New Service</h2>
              <button
                onClick={closeModal}
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
            {errorr && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded-md text-sm">
                {errorr}
              </div>
            )}
            {transactionDigest && (
              <div className="mb-4 p-3 bg-green-100 text-green-700 rounded-md">
                <p className="font-medium">Transaction successful!</p>
                <p className="text-xs break-all mt-1">
                  Digest: {transactionDigest}
                </p>
              </div>
            )}
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
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
                <label
                  htmlFor="coinType"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
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
                <p className="text-xs text-gray-500 mt-1">
                  Format: 0x00000::cointype::coinname (e.g., 0x2::sui::SUI)
                </p>
              </div>

              <div className="mb-4">
                <label
                  htmlFor="price"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Price (per month)
                </label>
                <div className="relative">
                  {" "}
                  <input
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
                    {coinMetadata.data?.symbol ||
                      newService.coinType.split("::").pop()}
                  </span>
                </div>
              </div>

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
                  value={newService.serviceAddress}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0x..."
                  required
                />
              </div>

              <div className="mb-6">
                <label
                  htmlFor="yearlyDiscount"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
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
                  onClick={closeModal}
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
                    "Create Service"
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
