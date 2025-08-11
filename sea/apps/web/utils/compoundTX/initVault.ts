import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";
import { initVault } from "../baseTX/initVault";
import { mintCapAddr } from "../baseTX/mintCapAddr";
import { mintCapMail } from "../baseTX/mintCapmail";
import { zkTransaction } from "../baseTX/zkSend";
import { sendEmail } from "../mailService/sendMail";

type PendingEmail = { email: string; link: string };

export const initVaultTX = async (
  addrList: Map<string, number>,
  emailList: Map<string, number>,
  sender: string
) => {
  const tx = new Transaction();
  const [vault, cap] = initVault(tx);

  // Addresses -> mint caps
  for (const [addr, pct] of addrList) {
    mintCapAddr(cap, vault, addr, pct, tx);
  }

  // Collect email -> link first (do not send yet)
  const pendingEmails: PendingEmail[] = [];
  for (const [email, pct] of emailList) {
    const mailCap = mintCapMail(cap, vault, email, pct, tx);
    const link = zkTransaction(
      sender,
      "testnet",
      mailCap,
      `${package_addr}::seaVault::mailCap`,
      tx
    );
    pendingEmails.push({ email, link });
  }

  // Finalize tx objects
  tx.transferObjects([cap!], sender);
  tx.moveCall({
    target: `0x2::transfer::share_object`,
    arguments: [vault!],
    typeArguments: [`${package_addr}::seaVault::SeaVault`],
  });

  // Send all emails together at the end
  const results = await Promise.allSettled(
    pendingEmails.map(({ email, link }) => sendEmail(email, link))
  );

  // Optional: log failures (won't block returning tx)
  const failed = results
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => r.status === "rejected")
    .map(({ i }) => pendingEmails[i]);
  if (failed.length > 0) {
    console.error("Failed to send some emails:", failed);
  }

  return tx;
};
