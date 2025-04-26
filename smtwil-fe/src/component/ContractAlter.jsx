import React from "react";
const coinlistExample = [
  ["SUI", "0x2::sui::SUI", 100],
  ["USDC", "0x3::usdc::usdc", 100],
  ["SeWa", "0x4::sewa::sewa", 100],
];
import { useCurrentAccount, useSuiClientQuery } from "@mysten/dapp-kit";
import ButtonInContractAlter from "./ButtonInContractAlter";
const ContractAlter = () => {
return (
    <div className="flex justify-center items-center w-full h-fit bg-white">
        <div className="rounded-lg bg-white shadow-md p-4 mb-4 w-1/2">
            <h3 className="text-lg font-medium mb-3 text-center">YOUR WILL CONTENT</h3>
            <div className="grid grid-cols-2 -gap-2">
                <div className="text-black font-medium">Coin Type</div>
                <div className="text-black font-medium">Amount</div>

                {coinlistExample.map((coin, index) => (
                    <React.Fragment key={index}>
                        <div className="py-2 border-t text-black dark:border-gray-700">
                            {coin[0]}{" "}
                            <span className="text-xs text-gray-500">{coin[1]}</span>
                        </div>
                        <div className="py-2 border-t text-black dark:border-gray-700">
                            {coin[2]}
                        </div>
                    </React.Fragment>
                ))}
            </div>
        </div>
        <ButtonInContractAlter />
    </div>
);
};

export default ContractAlter;
