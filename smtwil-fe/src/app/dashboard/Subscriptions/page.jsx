"use client";

import { useState, useEffect } from 'react';

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
    const [selectedService, setSelectedService] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [filterType, setFilterType] = useState('all'); // 'all', 'deducted', 'notDeducted'
    const [currentTime, setCurrentTime] = useState(Date.now());
    
    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000);
        
        return () => clearInterval(interval);
    }, []);
    
    // Calculate statistics
    const calculateStats = () => {
        let totalMonthly = 0;
        let deductedAmount = 0;
        let pendingAmount = 0;
        
        exampleService.forEach(service => {
            Object.entries(service.products).forEach(([productName, [price, currency, days]]) => {
                const monthlyPrice = (price * 30) / days;
                totalMonthly += monthlyPrice;
                
                if (service.status === 'active') {
                    deductedAmount += monthlyPrice;
                } else {
                    pendingAmount += monthlyPrice;
                }
            });
        });
        
        return { totalMonthly, deductedAmount, pendingAmount };
    };
    
    const stats = calculateStats();
    
    // Filter services based on selected filter
    const getFilteredServices = () => {
        if (filterType === 'deducted') {
            return exampleService.filter(service => service.status === 'active');
        } else if (filterType === 'notDeducted') {
            return exampleService.filter(service => service.status === 'due');
        }
        return exampleService;
    };
    
    // Calculate payment countdown
    const calculateCountdown = (days) => {
        // Simulate next payment time based on billing cycle
        const hoursInCycle = days < 24 ? days : days * 24;
        const millisecondsInCycle = hoursInCycle * 60 * 60 * 1000;
        
        // Assume subscription started at a random time in the past
        const subscriptionStartTime = currentTime - (millisecondsInCycle * 0.7); // 70% through the cycle
        const nextPaymentTime = subscriptionStartTime + millisecondsInCycle;
        
        const timeUntilPayment = nextPaymentTime - currentTime;
        
        if (timeUntilPayment <= 0) {
            return { days: 0, hours: 0, minutes: 0 };
        }
        
        const daysUntil = Math.floor(timeUntilPayment / (1000 * 60 * 60 * 24));
        const hoursUntil = Math.floor((timeUntilPayment % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutesUntil = Math.floor((timeUntilPayment % (1000 * 60 * 60)) / (1000 * 60));
        
        return { days: daysUntil, hours: hoursUntil, minutes: minutesUntil };
    };
    
    // Button handlers (留空，可以根據需求實作)
    const handleUpgrade = () => {
        console.log('Upgrade clicked for:', selectedProduct?.name);
        // 實作升級邏輯
    };
    
    const handleUnsubscribe = () => {
        console.log('Unsubscribe clicked for:', selectedProduct?.name);
        // 實作取消訂閱邏輯
    };

    return (
        <div className="h-screen bg-gray-100 p-4 flex flex-col text-black">
            {/* Top container with statistics */}
            <div className="bg-white rounded-lg p-4 shadow-md mb-4">
                <div className="flex space-x-4">
                    <button
                        onClick={() => setFilterType('all')}
                        className={`flex-1 p-3 rounded-lg text-center transition-all ${
                            filterType === 'all' 
                                ? 'bg-blue-500 text-white' 
                                : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                        <div className="text-sm font-medium">Total deduct this month</div>
                        <div className="text-lg font-bold">{stats.totalMonthly.toFixed(0)} SUI</div>
                    </button>
                    
                    <button
                        onClick={() => setFilterType('deducted')}
                        className={`flex-1 p-3 rounded-lg text-center transition-all ${
                            filterType === 'deducted' 
                                ? 'bg-green-500 text-white' 
                                : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                        <div className="text-sm font-medium">Deducted amount</div>
                        <div className="text-lg font-bold">{stats.deductedAmount.toFixed(0)} SUI</div>
                    </button>
                    
                    <button
                        onClick={() => setFilterType('notDeducted')}
                        className={`flex-1 p-3 rounded-lg text-center transition-all ${
                            filterType === 'notDeducted' 
                                ? 'bg-red-500 text-white' 
                                : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                    >
                        <div className="text-sm font-medium">Haven't deducted</div>
                        <div className="text-lg font-bold">{stats.pendingAmount.toFixed(0)} SUI</div>
                    </button>
                </div>
            </div>
            
            {/* Bottom container with services and info */}
            <div className="flex-1 flex space-x-4 min-h-0">
                {/* Left column - Services */}
                <div className="w-1/3 bg-white rounded-lg p-4 shadow-md">
                    <h2 className="text-xl font-bold mb-4">Services</h2>
                    <div className="space-y-3 overflow-y-auto max-h-full">
                        {getFilteredServices().map((service, index) => (
                            <div 
                                key={index}
                                onClick={() => {
                                    setSelectedService(index);
                                    setSelectedProduct(null);
                                }}
                                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                    selectedService === index 
                                        ? 'border-blue-500 bg-blue-50' 
                                        : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                        <img src={service.icon} alt={service.name} className="w-6 h-6" />
                                        <div>
                                            <div className="font-medium">{service.name}</div>
                                            <div className="text-xs text-gray-500">{formatAddress(service.address)}</div>
                                        </div>
                                    </div>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        service.status === 'active' ? 'bg-green-100 text-green-800' : 
                                        'bg-red-100 text-red-800'
                                    }`}>
                                        {service.status}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Right column - Info */}
                <div className="flex-1 bg-white rounded-lg p-4 shadow-md">
                    <h2 className="text-xl font-bold mb-4">Info</h2>
                    
                    {selectedService !== null ? (
                        <div className="grid grid-cols-2 gap-4 h-full">
                            {/* Products list */}
                            <div className="border-r pr-4">
                                <h3 className="text-lg font-semibold mb-3">Products</h3>
                                <div className="space-y-2">
                                    {Object.entries(exampleService[selectedService].products).map(([productName, [price, currency, days]], index) => (
                                        <div 
                                            key={index}
                                            onClick={() => setSelectedProduct({name: productName, price, currency, days, serviceName: exampleService[selectedService].name})}
                                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                                                selectedProduct?.name === productName 
                                                    ? 'border-blue-500 bg-blue-50' 
                                                    : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                        >
                                            <div className="font-medium">{productName}</div>
                                            <div className="text-sm text-gray-600">
                                                {price} {currency.split('::').pop()} / {days < 24 ? `${days}h` : `${days / 24}d`}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Product details */}
                            <div className="pl-4">
                                <h3 className="text-lg font-semibold mb-3">Details</h3>
                                {selectedProduct ? (
                                    <div className="space-y-3">
                                        <div>
                                            <div className="text-sm text-gray-500">Product Name</div>
                                            <div className="font-medium">{selectedProduct.name}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">Service</div>
                                            <div className="font-medium">{selectedProduct.serviceName}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">Price</div>
                                            <div className="font-medium">{selectedProduct.price} {selectedProduct.currency.split('::').pop()}</div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">Billing Cycle</div>
                                            <div className="font-medium">
                                                {selectedProduct.days < 24 
                                                    ? `${selectedProduct.days} hours` 
                                                    : `${selectedProduct.days / 24} days`}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-sm text-gray-500">Monthly Cost</div>
                                            <div className="font-medium">
                                                {((selectedProduct.price * 30) / selectedProduct.days).toFixed(2)} SUI
                                            </div>
                                        </div>
                                        
                                        {/* Payment Countdown */}
                                        <div>
                                            <div className="text-sm text-gray-500">Next Payment In</div>
                                            <div className="font-medium text-blue-600">
                                                {(() => {
                                                    const countdown = calculateCountdown(selectedProduct.days);
                                                    if (countdown.days === 0 && countdown.hours === 0 && countdown.minutes === 0) {
                                                        return "Payment due";
                                                    }
                                                    return `${countdown.days}d ${countdown.hours}h ${countdown.minutes}m`;
                                                })()}
                                            </div>
                                        </div>
                                        
                                        {/* Action Buttons */}
                                        <div className="pt-4 space-y-2">
                                            <button
                                                onClick={handleUpgrade}
                                                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                            >
                                                Upgrade
                                            </button>
                                            <button
                                                onClick={handleUnsubscribe}
                                                className="w-full py-2 px-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
                                            >
                                                Unsubscribe
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 italic">Select a product to view details</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <p className="text-gray-500 italic">Select a service to view information</p>
                    )}
                </div>
            </div>
        </div>
    );
}