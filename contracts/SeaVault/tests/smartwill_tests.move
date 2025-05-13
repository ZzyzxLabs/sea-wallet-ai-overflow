#[test_only]
module SeaWallet::smartwill_tests;
// Import necessary modules and dependencies
use SeaWallet::seaVault::{Self, SeaVault, OwnerCap, MemberCap};
use sui::{
    dynamic_object_field as dof,
    balance::{Self, Balance},
    coin::{Self, Coin},
    object::{Self, UID, ID},
    transfer,
    tx_context::{Self, TxContext, epoch_timestamp_ms},
    vec_map::{Self, VecMap},
    sui::SUI,
    clock::{Self, Clock},
    table::{Table, Self},
    event::emit,
    test_scenario::{Self as ts, Scenario},
};
use std::{
    string::{Self, String},
    vector,
    debug,
    type_name::{Self, TypeName},
};
use usdc::usdc::USDC;
use std::address::length;
use std::unit_test::assert_eq;
    
const ALICE: address = @0xA;
const BOB: address = @0xB;
const CHARLIE: address = @0xC;
const DAVE: address = @0xD;
const FRED: address = @0xF;

const Error: u64 = 444;

#[test_only]
fun test_sui(ts: &mut Scenario): Coin<SUI> {
    coin::mint_for_testing(42, ts.ctx())
}

#[test_only]
fun test_usdc(ts: &mut Scenario): Coin<USDC> {
    coin::mint_for_testing(42, ts.ctx())
}

#[test]
fun test_init_member() {
   let mut scenario = ts::begin(@0x0);
    {
        scenario.next_tx(ALICE);
        seaVault::createVault(scenario.ctx());
    };

    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();

        // add BOB and CHARLIE by address
        let mut address_list = vector::empty<address>();
        let mut percentage_list = vector::empty<u8>();
        address_list.push_back(BOB);
        percentage_list.push_back(10);
        address_list.push_back(CHARLIE);
        percentage_list.push_back(20);
        seaVault::addMemberByAddresses(&ownerCap, &mut vault, address_list, percentage_list, scenario.ctx());

        // add DAVE and FRED by email
        let emailDave = string::utf8(b"Dave@seawallet.ai");
        let percentageDave = 30;
        let capDave = seaVault::addMemberByEmail(&ownerCap, &mut vault, emailDave, percentageDave, scenario.ctx());
        transfer::public_transfer(capDave, DAVE);

        let emailFred = string::utf8(b"Fred@seawallet.ai");
        let percentageFred = 40;
        let capFred = seaVault::addMemberByEmail(&ownerCap, &mut vault, emailFred, percentageFred, scenario.ctx());
        transfer::public_transfer(capFred, FRED);

        // check percentage
        seaVault::checkPercentage(&ownerCap, &mut vault);
        
        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    ts::end(scenario); 
}

#[test]
fun test_add_reclaim() {
    let mut scenario = ts::begin(@0x1);
    {
        debug::print(& b"test_add_reclaim");
        scenario.next_tx(ALICE);
        seaVault::createVault(scenario.ctx());
    };

    // test deposit coins (use add_coin, oraganize_coin)
    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();

        let sui_coin: Coin<SUI> = test_sui(&mut scenario);
        seaVault::add_coin(&ownerCap, &mut vault, b"SUI", sui_coin);
        
        let more_sui_coin: Coin<SUI> = test_sui(&mut scenario);
        seaVault::organize_coin(&ownerCap, &mut vault, b"SUI", more_sui_coin);
        
        let usdc_coin: Coin<USDC> = test_usdc(&mut scenario);
        seaVault::add_coin(&ownerCap, &mut vault, b"USDC", usdc_coin);

        let more_usdc_coin: Coin<USDC> = test_usdc(&mut scenario);
        seaVault::organize_coin(&ownerCap, &mut vault, b"USDC", more_usdc_coin);
        debug::print(&vault);
        
        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    // test owner withdraw (reclaim_asset, take_coin)
    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();

        // take some SUI
        seaVault::take_coin<SUI>(&ownerCap, &mut vault, b"SUI", 20, scenario.ctx());

        // take some USDC
        seaVault::take_coin<USDC>(&ownerCap, &mut vault, b"USDC", 20, scenario.ctx());

        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();

        // check the SUI amount taken from last tx
        let some_sui: Coin<SUI> = scenario.take_from_sender();
        assert_eq!(some_sui.value(), 20);
        ts::return_to_sender(&scenario, some_sui);

        // check the USDC amount taken from last tx
        let some_usdc: Coin<USDC> = scenario.take_from_sender();
        assert_eq!(some_usdc.value(), 20);
        ts::return_to_sender(&scenario, some_usdc);

        // take all SUI and check the amount
        seaVault::reclaim_asset<Coin<SUI>>(&ownerCap, &mut vault, b"SUI", scenario.ctx());

        // take all USDC and check the amount
        seaVault::reclaim_asset<Coin<USDC>>(&ownerCap, &mut vault, b"USDC", scenario.ctx());

        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    {
        scenario.next_tx(ALICE);
        // check all the SUI amount reclaimed
        let all_sui: Coin<SUI> = scenario.take_from_sender();
        assert_eq!(all_sui.value(), 64);
        ts::return_to_sender(&scenario, all_sui);

        // check all the USDC amount reclaimed
        let all_usdc: Coin<USDC> = scenario.take_from_sender();
        assert_eq!(all_usdc.value(), 64);
        ts::return_to_sender(&scenario, all_usdc);
    };

    ts::end(scenario);
}


// #[test]
// #[expected_failure]
// fun test_first_withdraw_failure() {
//     let mut scenario = ts::begin(@0x0);
//     {
//         scenario.next_tx(ALICE);
//         vault::createVault(scenario.ctx());
//         debug::print(& b"first stage passed");
//     };

//     // init member and deposit
//     {
//         scenario.next_tx(ALICE);
//         let ownerCap: OwnerCap = scenario.take_from_sender();
//         let mut vault: Vault = scenario.take_shared();
//         debug::print(&vault);

//         // init member
//         let mut address_list = vector::empty<address>();
//         let mut percentage_list = vector::empty<u8>();
//         address_list.push_back(BOB);
//         percentage_list.push_back(50);
//         let mut emailList = vector::empty<String>();
//         emailList.push_back(string::utf8(b"charlie@seawallet.ai"));
//         let mut emailPer = vector::empty<u8>();
//         emailPer.push_back(50);
//         let mut emailCaps: vector<MemberCap> = vault::initMember(&ownerCap, &mut vault, address_list, percentage_list, emailList, emailPer, scenario.ctx());
//         let emailCap = emailCaps.pop_back();
//         transfer::public_transfer(emailCap, CHARLIE);
//         emailCaps.destroy_empty();

//         // deposit
//         let coin: Coin<SUI> = test_sui(&mut scenario);
//         vault::add_trust_asset_coin(&ownerCap, &mut vault, coin, b"SUI", scenario.ctx());

//         // finish and return used stuff
//         ts::return_to_sender(&scenario, ownerCap);
//         ts::return_shared(vault);
//         debug::print(& b"second stage passed");
//     };

//     {
//         scenario.next_tx(BOB);
//         let mut vault: Vault = scenario.take_shared();
//         let memberCap: MemberCap = scenario.take_from_sender();
//         let clock: Clock = clock::create_for_testing(scenario.ctx());
//         let mut assetVec: vector<vector<u8>> = vector::empty<vector<u8>>();
//         assetVec.push_back(b"SUI");
//         vault::member_withdraw<SUI>(&memberCap, &mut vault, &clock, assetVec, scenario.ctx());
//         ts::return_to_sender(&scenario, memberCap);
//         ts::return_shared(vault);
//         clock::destroy_for_testing(clock);
//     };

//     ts::end(scenario);
// }

// #[test]
// fun test_withdraw() {
//     let mut scenario = ts::begin(@0x0);
//     {
//         scenario.next_tx(ALICE);
//         let coin = test_sui(&mut scenario);
//         vault::createVault(scenario.ctx());
//         coin::burn_for_testing(coin);
//     };

//     {
//         scenario.next_tx(ALICE);
//         let ownerCap: OwnerCap = scenario.take_from_sender();
//         let mut vault: Vault = scenario.take_shared();
//         let mut address_list = vector::empty<address>();
//         let mut percentage_list = vector::empty<u8>();
//         address_list.push_back(BOB);
//         percentage_list.push_back(30);
//         address_list.push_back(CHARLIE);
//         percentage_list.push_back(40);
//         let email = string::utf8(b"x@seawallet.ai");
//         let mut emailList = vector::empty<String>();
//         emailList.push_back(email);
//         let mut emailPer = vector::empty<u8>();
//         emailPer.push_back(30);
//         let mut emailCaps: vector<MemberCap> = vault::initMember(&ownerCap, &mut vault, address_list, percentage_list, emailList,  emailPer, scenario.ctx());
//         // finish and return used stuff
//         ts::return_to_sender(&scenario, ownerCap);
//         ts::return_shared(vault);
//         let emailCap = emailCaps.pop_back();
//         transfer::public_transfer(emailCap, DAVE);
//         emailCaps.destroy_empty();
//     };

//     {
//         scenario.next_tx(BOB);
//         let mut vault: Vault = scenario.take_shared();
//         let memberCap: MemberCap = scenario.take_from_sender();
//         let clock: Clock = clock::create_for_testing(scenario.ctx());
//         let mut assetVec: vector<vector<u8>> = vector::empty<vector<u8>>();
//         assetVec.push_back(b"SUI");
//         // assert!(memberCap.capid == 0, )
//         vault::member_withdraw<SUI>(&memberCap, & mut vault, &clock, assetVec, scenario.ctx());
//         scenario.return_to_sender(memberCap);
//         ts::return_shared(vault);
//         clock::destroy_for_testing(clock);
//     };

//     ts::end(scenario);
// }