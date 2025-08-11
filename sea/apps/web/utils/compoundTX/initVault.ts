import { Transaction } from "@mysten/sui/transactions";
import { bcs } from "@mysten/sui/bcs";
import { package_addr } from "../package";
import { initVault } from "../baseTX/initVault";
import { mintCapAddr } from "../baseTX/mintCapAddr";
import { mintCapMail } from "../baseTX/mintCapmail";
import { zkTransaction } from "../baseTX/zkSend";
import { sendEmail } from "../mailService/sendMail";

export const initVaultTX = async (addrList: Map<string, number>, emailList: Map<string, number>, sender: string) => {
    const tx = new Transaction();
    const [vault, cap] = initVault(tx);
    for (const [address, amount] of addrList.entries()) {
        mintCapAddr(cap, vault, address, amount, tx);
    }
    for (const [email, amount] of emailList.entries()) {
        const mailCap = mintCapMail(cap, vault, email, amount, tx);
        const link = zkTransaction(sender, "testnet", mailCap, `${package_addr}::sea_vault::mailCap`, tx);
        await sendEmail(email, link);
    }
    tx.transferObjects([cap!], sender);
    tx.moveCall({
        target: `0x2::transfer::public_share_object`,
        arguments: [vault!],
        typeArguments: [`${package_addr}::sea_vault::SeaVault`]
    })
    return tx;
}