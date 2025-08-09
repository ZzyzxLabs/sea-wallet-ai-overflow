"use client"

import { ConnectButton } from '@mysten/dapp-kit';
import React from 'react';

const Header = () => {
    return (
        <header className="sticky top-0 w-full p-4 backdrop-blur-md bg-white/50 z-[1000] flex justify-center items-center">
            <nav className="flex items-center space-x-8 mx-12">
                <a 
                    href="/dashboard" 
                    className="font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                >
                    Dashboard
                </a>
                <a 
                    href="/sub" 
                    className="font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                >
                    Subscription
                </a>
                <a 
                    href="/will" 
                    className="font-medium text-gray-700 hover:text-blue-600 transition-colors duration-200 cursor-pointer"
                >
                    Will
                </a>
            </nav>
            <ConnectButton />
        </header>
    );
};

export default Header;
