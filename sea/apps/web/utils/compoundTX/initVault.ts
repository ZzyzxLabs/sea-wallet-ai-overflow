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
    for (let i = 0; i < addrList.size; i++) {
        mintCapAddr(cap, vault, addrList.keys[i], addrList.values[i], tx);
    }
    for (let i = 0; i < emailList.size; i++) {
        const mailCap = mintCapMail(cap, vault, emailList.keys[i], emailList.values[i], tx);
        const link = zkTransaction(sender, "testnet", mailCap, `${package_addr}::seaVault::mailCap`, tx);
        await sendEmail(emailList.keys[i], link);
    }
    tx.transferObjects([cap!], sender);
    tx.moveCall({
        target: `0x2::transfer::share_object`,
        arguments: [vault!],
        typeArguments: [`${package_addr}::seaVault::SeaVault`]
    })
    return tx;
}