"use client";

import { useState } from 'react';

const exampleService = [
    {
        name: 'Water faucet',
        icon: '/sui.svg',
        address: '0x2',
        status: 'due',
        products:{
            'GetDrop':[100,'0x2::sui::SUI',24],
            'GetDrop2':[200,'0x2::sui::SUI',48],
        }
    },
    {
        name: 'OnlyDrops',
        icon: '/sui.svg',
        address: '0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac',
        status: 'active',
        products:{
            'CoolDrop':[100,'0x2::sui::SUI',24*30],
        }
    }
]

// Format address to show first 7 and last 5 characters
const formatAddress = (address) => {
  if (!address || address.length <= 12) return address;
  return `${address.substring(0, 7)}...${address.substring(address.length - 5)}`;
};

export default function Subscriptions() {
    // State to track selected subscription
    const [selectedService, setSelectedService] = useState(null);
    
    // Get products for display - either from selected service or all services
    const getDisplayedProducts = () => {
        if (selectedService !== null) {
            return [exampleService[selectedService]];
        }
        return exampleService;
    };

    return (
        <div className="h-screen flex flex-col overflow-hidden">
            {/* Top subscription section */}
            <div className="bg-amber-400 p-3 flex-shrink-0">
                <h1 className="text-2xl font-bold mb-3 text-gray-800 text-center">Your Subscriptions</h1>
                <div className="overflow-x-auto pb-2">
                    <div className="flex space-x-4 min-w-max justify-center">
                        {exampleService.map((service, index) => (
                            <div 
                                key={index} 
                                className={`bg-white rounded-lg shadow-md p-3 hover:shadow-lg transition-all duration-300 flex flex-col items-center min-w-[180px] cursor-pointer
                                    ${selectedService === index ? 'ring-3 ring-blue-500 shadow-blue-300' : ''}`}
                                onClick={() => setSelectedService(index === selectedService ? null : index)}
                            >
                                <div className="w-5 h-5 mb-2 flex items-center justify-center">
                                    <img src={service.icon} alt={`${service.name} icon`} className="max-w-full max-h-full" />
                                </div>
                                <h2 className="text-lg font-semibold text-gray-800 mb-1">{service.name}</h2>
                                <p className="text-xs text-gray-600 mb-2">Address: {formatAddress(service.address)}</p>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    service.status === 'active' ? 'bg-green-100 text-green-800' : 
                                    service.status === 'due' ? 'bg-red-100 text-red-800' : 
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                    {service.status}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Bottom content area */}
            <div className="flex-1 flex gap-4 p-4 min-h-0">
                {/* Left column - Products list */}
                <div className="w-1/2 bg-white rounded-lg shadow-lg p-4 flex flex-col">
                    <h2 className="text-xl font-bold mb-3 text-gray-800 flex-shrink-0">
                        {selectedService !== null ? `${exampleService[selectedService].name}` : 'All Products'}
                    </h2>
                    
                    <div className="flex-1 overflow-y-auto pr-2">
                        {getDisplayedProducts().map((service, serviceIndex) => (
                            <div key={serviceIndex} className="mb-4">
                                <h3 className="text-lg font-semibold text-gray-700 mb-2">{service.name}</h3>
                                <div className="grid grid-cols-1 gap-3">
                                    {Object.entries(service.products).map(([productName, [price, currency, days]], productIndex) => (
                                        <div 
                                            key={productIndex}
                                            className="border rounded-lg p-3 hover:bg-blue-50 cursor-pointer transition-all duration-200 hover:shadow-md"
                                            onClick={() => {
                                                console.log(`Selected ${productName} from ${service.name}`);
                                            }}
                                        >
                                            <div className="flex justify-between items-center">
                                                <span className="text-base text-black font-medium">{productName}</span>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                    service.status === 'active' ? 'bg-green-100 text-green-800' : 
                                                    service.status === 'due' ? 'bg-red-100 text-red-800' : 
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                    {service.status}
                                                </span>
                                            </div>
                                            <div className="mt-1 text-sm text-gray-600">
                                                <p>Price: {price} {currency.split('::').pop()}</p>
                                                <p>Billing Cycle: {days < 24 ? `${days} hours` : `${days / 24} days`}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right column - Service details */}
                <div className="w-1/2 bg-white rounded-lg shadow-lg p-4 flex flex-col">
                    <h2 className="text-xl font-bold mb-3 text-gray-800 flex-shrink-0">
                        {selectedService !== null ? 'Service Details' : 'Product Details'}
                    </h2>
                    
                    <div className="flex-1 overflow-y-auto">
                        {selectedService !== null ? (
                            <div>
                                <div className="mb-3">
                                    <h3 className="text-base font-semibold text-gray-700">Service Name</h3>
                                    <p className="text-gray-800">{exampleService[selectedService].name}</p>
                                </div>
                                
                                <div className="mb-3">
                                    <h3 className="text-base font-semibold text-gray-700">Contract Address</h3>
                                    <p className="text-sm text-gray-800 break-all">{exampleService[selectedService].address}</p>
                                </div>
                                
                                <div className="mb-3">
                                    <h3 className="text-base font-semibold text-gray-700">Status</h3>
                                    <span className={`inline-block px-2 py-1 rounded-full text-sm font-medium ${
                                        exampleService[selectedService].status === 'active' ? 'bg-green-100 text-green-800' : 
                                        exampleService[selectedService].status === 'due' ? 'bg-red-100 text-red-800' : 
                                        'bg-gray-100 text-gray-800'
                                    }`}>
                                        {exampleService[selectedService].status}
                                    </span>
                                </div>
                                
                                <div className="mb-3">
                                    <h3 className="text-base font-semibold text-gray-700">Total Products</h3>
                                    <p className="text-gray-800">{Object.keys(exampleService[selectedService].products).length}</p>
                                </div>
                                
                                <div className="mt-4 pt-3 border-t">
                                    <p className="text-sm text-gray-500">
                                        Click on any product in the left panel to view more details
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <p className="text-gray-500 italic">Select a subscription or product to view details</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}