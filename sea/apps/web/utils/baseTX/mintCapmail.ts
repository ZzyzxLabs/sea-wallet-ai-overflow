import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";
import { bcs } from "@mysten/sui/bcs";
export const mintCapMail = (ownerCap, seaVault, email, percentage, tx) => {
    const mailCap = tx.moveCall({
        target: `${package_addr}::seaVault::add_member_by_email`,
        arguments: [
            tx.object(ownerCap),
            tx.object(seaVault),
            tx.pure.string(email),
            tx.pure.u8(percentage)
        ]
    })
    return mailCap;
};
