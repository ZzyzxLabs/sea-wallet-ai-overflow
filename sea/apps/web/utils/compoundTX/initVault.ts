import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";
import { initVault } from "../baseTX/initVault";
import { mintCapAddr } from "../baseTX/mintCapAddr";
import { mintCapMail } from "../baseTX/mintCapmail";
import { zkTransaction } from "../baseTX/zkSend";

export type Invitation = { email: string; link: string };

export const initVaultTX = async (
  addrList: Map<string, number>,
  emailList: Map<string, number>,
  sender: string
): Promise<{ tx: Transaction; invitations: Invitation[] }> => {
  const tx = new Transaction();
  const [vault, cap] = initVault(tx);
  console.log(1)
  // address allocations
  for (const [address, amount] of addrList.entries()) {
    mintCapAddr(cap, vault, address, amount, tx);
  }
  console.log(2)
  // collect email->link pairs (do NOT send here; only build)
  const invitations: Invitation[] = [];
  for (const [email, amount] of emailList.entries()) {
    const mailCap = mintCapMail(cap, vault, email, amount, tx);
    console.log(3)
    const link = await zkTransaction(
      sender,
      "testnet",
      mailCap,
      `${package_addr}::sea_vault::MemberCap`,
      tx
    );
    invitations.push({ email, link });

  }

  // hand back the OwnerCap & share the SeaVault to sender
  tx.transferObjects([cap!], sender);
  console.log(6)
  tx.moveCall({
    target: `${package_addr}::sea_vault::share_vault`,
    arguments: [vault!]
  });
  console.log(7)
  return { tx, invitations };
};
