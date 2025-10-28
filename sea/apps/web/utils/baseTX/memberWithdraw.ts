import { Transaction } from "@mysten/sui/transactions";
import { package_addr } from "../package";
import { bcs } from "@mysten/sui/bcs";

// Add memberWithdrawTx implementation
export const memberWithdraw = (capId, vaultId, assetNames, coinTypes) => {
    // Verify arrays have same length
    if (assetNames.length !== coinTypes.length) {
      throw new Error(
        "Asset names and coin types arrays must have the same length"
      );
    }

    const tx = new Transaction();

    // Get system clock object ID
    const clockObjectId = "0x6";

    // Process each asset withdrawal
    for (let i = 0; i < assetNames.length; i++) {
      // BCS-serialize the asset name string
      const nameBC = bcs.string().serialize(assetNames[i]).toBytes();

      // Call the Move function to withdraw coins as an heir
      tx.moveCall({
        target: `${package_addr}::sea_vault::member_withdraw`,
        arguments: [
          tx.object(capId),
          tx.object(vaultId),
          tx.object(clockObjectId),
          tx.pure(nameBC),
        ],
        typeArguments: [coinTypes[i]],
      });
    }

    return tx;
}