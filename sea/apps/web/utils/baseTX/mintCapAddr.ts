import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";
import { bcs } from "@mysten/sui/bcs";

export const mintCapAddr = (ownerCap, seaVault, address, percentage, tx) => {
    const addressS = bcs.Address.serialize(address);
    const percentageS = bcs.U8.serialize(percentage);
    console.log(address)
    tx.moveCall({
        target: `${package_addr}::seaVault::add_member_by_address`,
        arguments: [
            tx.object(ownerCap),
            tx.object(seaVault),
            tx.pure(addressS),
            tx.pure(percentageS)
        ]
    })
};
