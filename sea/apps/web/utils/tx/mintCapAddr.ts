import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const initVault = (ownerCap, seaVault, address, percentage) => {
    let tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::seaVault::add_member_by_address`,
        arguments: [
            tx.object(ownerCap),
            tx.object(seaVault),
            tx.pure(address),
            tx.pure(percentage)
        ]
    })
    return tx;
};
