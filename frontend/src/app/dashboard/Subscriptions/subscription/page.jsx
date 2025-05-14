"use client";

import { ConnectButton, ConnectModal } from '@mysten/dapp-kit';
import { useState, useEffect } from 'react';

const exampleService = [
    {
        name: 'Cold Storage Protection',
        description: 'the smart safeguard your business can\'t afford to ignore',
        icon: '/sui.svg',
        address: '0x2',
        status: 'active',
        products:{
            'GetDrop':[100,'0x2::sui::SUI',24],
            'GetDrop2':[200,'0x2::sui::SUI',48],
        },
        nextPaymentDate: 'May 29, 2025'
    },
    {
        name: 'Multi Signature Security',
        description: 'the smart safeguard your business can\'t afford to ignore',
        icon: '/sui.svg',
        address: '0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac',
        status: 'active',
        products:{
            'CoolDrop':[100,'0x2::sui::SUI',24*30],
        },
        nextPaymentDate: 'May 29, 2025'
    },
    {
        name: 'Smart Contract Monitoring',
        description: 'the smart safeguard your business can\'t afford to ignore',
        icon: '/sui.svg',
        address: '0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac',
        status: 'deactivated',
        products:{
            'MonitorContract':[150,'0x2::sui::SUI',24*30],
        },
        nextPaymentDate: null
    },
    {
        name: 'Cold Storage Protection',
        description: 'the smart safeguard your business can\'t afford to ignore',
        icon: '/sui.svg',
        address: '0x2',
        status: 'deactivated',
        products:{
            'GetDrop':[100,'0x2::sui::SUI',24],
        },
        nextPaymentDate: null
    },
    {
        name: 'Multi Signature Security',
        description: 'the smart safeguard your business can\'t afford to ignore',
        icon: '/sui.svg',
        address: '0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac',
        status: 'deactivated',
        products:{
            'CoolDrop':[100,'0x2::sui::SUI',24*30],
        },
        nextPaymentDate: null
    },
    {
        name: 'Smart Contract Monitoring',
        description: 'the smart safeguard your business can\'t afford to ignore',
        icon: '/sui.svg',
        address: '0x93b236ec83f8b308e077a09c77394d642e15f42d5f3c92b121723eac2045adac',
        status: 'active',
        products:{
            'MonitorContract':[150,'0x2::sui::SUI',24*30],
        },
        nextPaymentDate: 'Jun 12, 2025'
    }
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
    const [searchQuery, setSearchQuery] = useState('');
    const [filterValue, setFilterValue] = useState('all');
    const [currentTime, setCurrentTime] = useState(Date.now());
    const [selectedService, setSelectedService] = useState(null);
    const [selectedProduct, setSelectedProduct] = useState(null);
    
    // Update current time every minute
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentTime(Date.now());
        }, 60000);
        
        return () => clearInterval(interval);
    }, []);
    
    // Filter services based on selected filter
    const getFilteredServices = () => {
        let filteredServices = exampleService;
        
        // Apply status filter
        if (filterValue === 'active') {
            filteredServices = filteredServices.filter(service => service.status === 'active');
        } else if (filterValue === 'deactivated') {
            filteredServices = filteredServices.filter(service => service.status === 'deactivated');
        }
        
        // Apply search filter
        if (searchQuery) {
            filteredServices = filteredServices.filter(service => 
                service.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }
        
        return filteredServices;
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
    };    // 獲取產品的月費用
    const getMonthlyCostForService = (service) => {
        let monthlyCost = 0;
        Object.entries(service.products).forEach(([productName, [price, currency, days]]) => {
            monthlyCost += parseFloat(calculateMonthlyCost(price, days));
        });
        return monthlyCost.toFixed(2);
    };

    return (
        <div className="bg-white ml-8 px-4 pt-6 h-full text-black">
            {/* Header */}
            <div className="flex justify-between items-center mb-2">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Subscriptions</h1>
                    <p className="text-sm text-gray-600">Manage your active service subscriptions and collect monthly fees from your subscribers</p>
                </div>
            <ConnectButton />
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
                        <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

            {/* Subscription Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
                {getFilteredServices().map((service, index) => {
                    const isActive = service.status === 'active';
                    const monthlyCost = getMonthlyCostForService(service);

                    return (
                        <div 
                            key={index}
                            className={`rounded-lg overflow-hidden shadow-sm ${isActive ? 'bg-blue-500' : 'bg-red-500'}`}
                        >
                            <div className="px-4 pt-4 pb-2 text-white">
                                <h3 className="text-lg font-semibold">{service.name}</h3>
                                <p className="text-sm text-white/90">{service.description}</p>
                            </div>
                            
                            {isActive && service.nextPaymentDate && (
                                <div className="px-4 pb-3 text-white">
                                    <p className="text-xs opacity-80">Next Payment Date:</p>
                                    <p className="text-sm">{service.nextPaymentDate}</p>
                                </div>
                            )}
                            
                            <div className="flex justify-between items-center px-4 py-2 bg-white">
                                <div className="text-sm font-medium">
                                    <span className={`mr-2 inline-block px-2 py-1 rounded text-xs font-medium ${isActive ? 'bg-blue-100 text-blue-800' : 'bg-red-100 text-red-800'}`}>
                                        {isActive ? 'Active' : 'Deactivated'}
                                    </span>
                                </div>
                                <div className="text-gray-900 font-bold">
                                    ${monthlyCost}/mo
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}