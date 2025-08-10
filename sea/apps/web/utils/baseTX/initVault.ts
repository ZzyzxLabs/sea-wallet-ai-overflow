import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { package_addr } from "../package";

export const initVault = (tx: Transaction) => {
    const [SeaVault, OwnerCap] = tx.moveCall({
        target: `${package_addr}::seaVault::create_vault`
    });
    return [SeaVault, OwnerCap];
};
