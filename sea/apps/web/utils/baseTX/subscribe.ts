import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const subscribe = (ownerCap, seaVault, service, isYear) => {
    const tx = new Transaction();
    tx.moveCall({
        target: `${package_addr}::sea_vault::subscribe`,
        arguments: [
            tx.object(ownerCap),
            tx.object(seaVault),
            tx.object(service),
            tx.pure.bool(isYear)
        ],
        typeArguments: [] // Assuming ownerCap has a type field
    })

    return tx;
};
