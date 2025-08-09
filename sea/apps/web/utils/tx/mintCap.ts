  async mintCap(cap, vault, sui, email, senderAddress) {
    const addressList = bcs.vector(bcs.Address).serialize(sui.keys).toBytes();
    const addressPer = bcs.vector(bcs.u8()).serialize(sui.values).toBytes();
    const emailList = bcs.vector(bcs.String).serialize(email.keys).toBytes();
    const emailPer = bcs.vector(bcs.u8()).serialize(email.values).toBytes();
    const tx = new Transaction();
    tx.setSender(senderAddress);
    console.log(email)
    // handle addresses
    tx.moveCall({
      target: `${get().packageName}::seaVault::add_member_by_addresses`,
      arguments: [
        tx.object(cap),
        tx.object(vault),
        tx.pure(addressList),
        tx.pure(addressPer),
      ],
    });

    // handle emails
    const links = [];
    for (let i = 0; i < email.keys.length; i++) {
      const link = new ZkSendLinkBuilder({
        sender: get().walletOwner,
        network: "testnet",
      });
      let emailCap = tx.moveCall({
        target: `${get().packageName}::seaVault::add_member_by_email`,
        arguments: [
          tx.object(cap),
          tx.object(vault),
          tx.pure.string(email.keys[i]),
          tx.pure.u8(email.values[i]),
        ],
      });

      link.addClaimableObjectRef(
        emailCap,
        `${get().packageName}::seaVault::MemberCap`
      );
      await link.createSendTransaction({
        transaction: tx,
      });
      links.push(link);
    }
    const urls = links.map((link) => link.getLink());
    // console.log("Generated links:", urls);
    const sendEmail = get().sendEmail;
    for (let i = 0; i < urls.length; i++) {
      await sendEmail(email.keys[i], urls[i]);
      // console.log("sendEmail", email.keys[i], urls[i]);
    }
    return tx;
  },

  async zkTransaction(sender, network, prope) {
    const urls = [];
    const txs = [];
    for (let i = 0; i < prope.length; i++) {
      const zelda = new ZkSendLinkBuilder({
        sender: sender,
        network: network,
      });
      zelda.addClaimableObject(prope[i]);
      const url = zelda.getLink();
      const tx = await zelda.createSendTransaction();
      urls.push(url);
      txs.push(tx);
    }

    return { urls, tx: txs };
  },
  async sendEmail(to, url) {
    try {
      const response = await fetch("../api/mailService", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ to, url }),
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("發送請求失敗:", error);
      throw error;
    }
  },