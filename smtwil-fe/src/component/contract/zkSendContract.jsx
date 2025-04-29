import { ZkSendLinkBuilder } from "@mysten/zksend"

export const zkSendOneLink = (sender, network, prope) => {
	const link = new ZkSendLinkBuilder({
		sender: sender,
		network: network,
	})
	link.addClaimableObject(prope)
	return(link.getLink())
}

export const zkSendMultipleLink = async (sender, network, prope, count) => {
	const links = [];
 
	for (let i = 0; i < count; i++) {
		const link = new ZkSendLinkBuilder({
			sender: sender,
			network: network,
		});
	 
		link.addClaimableObject(prope[i])
		links.push(link);
	}
	 
	const urls = links.map((link) => link.getLink());
	 
	const tx = await ZkSendLinkBuilder.createLinks({
		links,
	});
	
	return { urls, tx };
}