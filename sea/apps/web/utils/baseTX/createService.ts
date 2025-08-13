import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const createService = (price, name, serviceAddr, yDiscount, coinType) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::subscription::create_service`,
        arguments: [
            tx.pure.u64(price),
            tx.pure.string(name),
            tx.pure.string(coinType),
            tx.pure.address(serviceAddr),
            tx.pure.u8(yDiscount),
        ],
        typeArguments: [coinType],
    });
    return tx;
};
