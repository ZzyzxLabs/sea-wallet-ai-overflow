import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";

export const mintCapMail = (ownerCap, seaVault, email, percentage, tx) => {
    const mailCap = tx.moveCall({
        target: `${package_addr}::seaVault::add_member_by_email`,
        arguments: [
            tx.object(ownerCap),
            tx.object(seaVault),
            tx.pure(email),
            tx.pure(percentage)
        ]
    })
    return mailCap;
};
