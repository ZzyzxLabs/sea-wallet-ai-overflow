    // // initMember, return vector of caps for email members, (test only because it's hard to process emailCap in frontend)
    // #[test_only]
    // public fun initMember(_cap: &OwnerCap, vault: &mut SeaVault, address_list: vector<address>, percentage_list: vector<u8>, emailList: vector<String>, emailPer: vector<u8>, ctx: &mut TxContext): vector<MemberCap> {
    //     assert!(address_list.length() == percentage_list.length(), EMisMatch);
    //     assert!(emailList.length() == emailPer.length(), EMisMatch);
    //     let mut capCount: u8 = 0;

    //     // Handle addresses
    //     let mut i = 0;
    //     while (i < address_list.length()) {
    //         let addrCap = MemberCap {
    //             id: object::new(ctx),
    //             vaultID: object::id(vault),
    //             capID: capCount,
    //         };
            
    //         transfer::public_transfer(addrCap, address_list[i]);
    //         vault.cap_percentage.insert(capCount, percentage_list[i]);
    //         vault.cap_activated.insert(capCount, true);

    //         capCount = capCount + 1;
    //         i = i + 1;
    //     };

    //     // Handle emails
    //     let mut emailCaps = vector::empty<MemberCap>();
    //     let mut j = 0;

    //     while (j < emailList.length()) {
    //         let emailCap = MemberCap {
    //             id: object::new(ctx),
    //             vaultID: object::id(vault),
    //             capID: capCount,
    //         };
            
    //         emailCaps.push_back(emailCap);
    //         vault.cap_percentage.insert(capCount, emailPer[j]);
    //         vault.cap_activated.insert(capCount, true);

    //         capCount = capCount + 1;
    //         j = j + 1;
    //     };

    //     emailCaps
    // }

    // #[test_only]
    // public fun addMemberByAddress(_cap: &OwnerCap, vault: &mut SeaVault, member: address, percentage: u8, ctx: &mut TxContext) {
    //     // let x = (vec_map::size(&vault.cap_percentage) as u8);
    //     let capCount = (vault.cap_percentage.size() as u8);
    //     let memberCap = MemberCap {
    //         id: object::new(ctx),
    //         vaultID: object::id(vault),
    //         capID: capCount,
    //     };
    //     vault.cap_percentage.insert(capCount, percentage);
    //     vault.cap_activated.insert(capCount, true);
    //     transfer::public_transfer(memberCap, member);
    // }

    // #[test]
// fun test_add_member_by_address() {
//     let mut scenario = ts::begin(@0x0);
//     {
//         scenario.next_tx(ALICE);
//         let coin = test_sui(&mut scenario);
//         vault::createVault(scenario.ctx());
//         coin::burn_for_testing(coin);
//     };
//         {
//         scenario.next_tx(ALICE);
//         let ownerCap: OwnerCap = scenario.take_from_sender();
//         let mut vault: Vault = scenario.take_shared();
        
//         vault::addMemberByAddress(&ownerCap, &mut vault, BOB, 50, scenario.ctx());
//         // finish and return used stuff
//         ts::return_to_sender(&scenario, ownerCap);
//         ts::return_shared(vault);
//     };
//     {
//         scenario.next_tx(BOB);
//         let memberCap: MemberCap = scenario.take_from_sender();

//         // finish and return used stuff
//         ts::return_to_sender(&scenario, memberCap);
//     };
//     ts::end(scenario);
// }

// #[test]
// fun test_add_member_by_email() {
//     let mut scenario = ts::begin(@0x0);
//     {
//         scenario.next_tx(ALICE);
//         let coin = test_sui(&mut scenario);
//         vault::createVault(scenario.ctx());
//         coin::burn_for_testing(coin);
//     };
//         {
//         scenario.next_tx(ALICE);
//         let ownerCap: OwnerCap = scenario.take_from_sender();
//         let mut vault: Vault = scenario.take_shared();
        
//         let emailCap: MemberCap = vault::addMemberByEmail(&ownerCap, &mut vault, b"BOB@seawallet.ai".to_string(), 50, scenario.ctx());
//         // debug::print(&emailCap);
//         transfer::public_transfer(emailCap, BOB);
//         // finish and return used stuff
//         ts::return_to_sender(&scenario, ownerCap);
//         ts::return_shared(vault);
//     };
//     {
//         scenario.next_tx(BOB);
//         let memberCap: MemberCap = scenario.take_from_sender();

//         // finish and return used stuff
//         ts::return_to_sender(&scenario, memberCap);
//     };
//     ts::end(scenario);
// }


    // fun pay_charge<CoinType>(cap: &ChargeCap, vault: &mut SeaVault, service: &Service<CoinType>, asset_name: vector<u8>, ctx: &mut TxContext) : Coin<CoinType> {
    //     assert!(cap.vaultID == object::id(vault), ENotYourVault);
    //     let amount = service.get_service_price();
    //     assert!(amount <= *table::borrow(&vault.asset_sum, asset_name), ENotEnough);
    //     // update table amount
    //     let amount_mut = table::borrow_mut<vector<u8>, u64>(&mut vault.asset_sum, asset_name);
    //     *amount_mut = *amount_mut - amount;

    //     // pay from vault
    //     let coin_from_vault = dof::borrow_mut<vector<u8>, Coin<CoinType>>(&mut vault.id, asset_name);
    //     coin::split(coin_from_vault, amount, ctx)
    // }