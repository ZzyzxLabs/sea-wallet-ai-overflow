import { ZkSendLinkBuilder } from "@mysten/zksend";

export const zkTransaction = async (sender, network, item, objectType, tx) => {
      const zktx = new ZkSendLinkBuilder({
        sender: sender,
        network: network,
      });
      zktx.addClaimableObjectRef(item, objectType);
      console.log(4);
      const url = zktx.getLink();
      await zktx.createSendTransaction({ transaction: tx });
      console.log(5);
      return url;
}