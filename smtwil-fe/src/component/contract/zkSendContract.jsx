import { ZkSendLinkBuilder } from "@mysten/zksend"

const zkSendContract = (sender, network, prope) => {
    const link = new ZkSendLinkBuilder({
        sender: sender,
        network: network,
    })
}