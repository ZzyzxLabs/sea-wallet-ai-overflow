"use client";
import { useState } from 'react';

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
  const [filter, setFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

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
  return (
    <div className="p-6 max-w-[1200px] mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Subscription</h1>
          <p className="text-gray-600">
            Manage your active service subscriptions and collect monthly fees from your subscribers
          </p>
        </div>
        <button className="flex items-center space-x-2 border border-gray-300 rounded-lg px-4 py-2 bg-white">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2"></rect>
            <path d="M12 12h4"></path>
            <path d="M12 16h4"></path>
            <path d="M12 8h4"></path>
            <path d="M6 16h.01"></path>
            <path d="M6 12h.01"></path>
            <path d="M6 8h.01"></path>
          </svg>
          <span>Wallet</span>
        </button>
      </div>
      
      <div className="mb-6">
        <div className="flex space-x-4 mb-6">
          <button 
            className={`px-4 py-1.5 ${filter === 'My Subscribers' ? 'border-b-2 border-black font-medium' : 'text-gray-600'}`}
            onClick={() => setFilter('My Subscribers')}
          >
            My Subscribers
          </button>
          <button 
            className={`px-4 py-1.5 ${filter === 'My Subscriptions' ? 'border-b-2 border-black font-medium' : 'text-gray-600'}`}
            onClick={() => {setFilter('My Subscriptions');}}
          >
            My Subscriptions
          </button>
        </div>        <div className="flex justify-between items-center">
          <div className="flex flex-wrap gap-2">
            <button
              className={`px-4 py-1.5 rounded-full text-sm ${
                filter === 'All' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-800 border border-gray-300'
              }`}
              onClick={() => setFilter('All')}
            >
              All
            </button>
            <button
              className={`px-4 py-1.5 rounded-full text-sm ${
                filter === 'ShitCoin Generator' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-800 border border-gray-300'
              }`}
              onClick={() => setFilter('ShitCoin Generator')}
            >
              ShitCoin Generator
            </button>
            <button
              className={`px-4 py-1.5 rounded-full text-sm ${
                filter === 'Multi-sign Security' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-800 border border-gray-300'
              }`}
              onClick={() => setFilter('Multi-Signature Security')}
            >
              Multi-sign Security
            </button>
            <button
              className={`px-4 py-1.5 rounded-full text-sm ${
                filter === 'Web3 CRM' 
                  ? 'bg-blue-500 text-white' 
                  : 'bg-white text-gray-800 border border-gray-300'
              }`}
              onClick={() => setFilter('Web3 CRM')}
            >
              Web3 CRM
            </button>
          </div>
          
          <div className="relative">
            <input
              type="text"
              placeholder="Search by keyword..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-full w-64"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <div className="absolute left-3 top-2.5 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSubscribers.map((subscriber, index) => (
          <div key={index} className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-5 flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg">{subscriber.name}</h3>
                <p className="text-gray-600 text-sm">{subscriber.email}</p>
              </div>
              <button 
                className={`px-4 py-1 rounded-md ${
                  subscriber.status === 'collected' 
                    ? 'bg-gray-500 text-white cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                disabled={subscriber.status === 'collected'}
              >
                {subscriber.status === 'collected' ? 'Collected' : 'Collect'}
              </button>
            </div>
            
            <div className="px-5 py-2 bg-gray-50">
              <p className="text-sm font-medium text-blue-600">{subscriber.service}</p>
            </div>
            
            <div className="p-5 flex justify-between items-center">
              <div>
                <p className="text-xs text-gray-500">Subscribed on</p>
                <p className="text-sm">{subscriber.subscribedOn}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-right text-gray-500">{subscriber.tier}</p>
                <p className="text-lg font-bold">{subscriber.price}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {filteredSubscribers.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">No subscribers found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}