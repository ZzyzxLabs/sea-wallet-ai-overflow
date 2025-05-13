module SeaWallet::smartwill_tests;
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
const SIX_MONTHS: u64 = 6 * 30 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS: u64 = 7 * 24 * 60 * 60 * 1000;

const Error: u64 = 444;

#[test_only]
fun test_sui(ts: &mut Scenario): Coin<SUI> {
    coin::mint_for_testing(100, ts.ctx())
}

#[test_only]
fun test_usdc(ts: &mut Scenario): Coin<USDC> {
    coin::mint_for_testing(100, ts.ctx())
}

// TODO: test modifyMemberCap
// TODO: test addAsset
// TODO: test update_time
// TODO: test member_withdraw

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
        seaVault::check_percentage(&ownerCap, &mut vault);
        
        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    ts::end(scenario); 
}

#[test]
fun test_deposit_withdraw() {
    let mut scenario = ts::begin(@0x1);
    {
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
        // debug::print(&vault);
        
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
        assert_eq!(all_sui.value(), 180);
        ts::return_to_sender(&scenario, all_sui);

        // check all the USDC amount reclaimed
        let all_usdc: Coin<USDC> = scenario.take_from_sender();
        assert_eq!(all_usdc.value(), 180);
        ts::return_to_sender(&scenario, all_usdc);
    };

    ts::end(scenario);
}


#[test]
#[expected_failure]
fun test_first_withdraw_failure() {
    let mut scenario = ts::begin(@0x0);
    {
        scenario.next_tx(ALICE);
        seaVault::createVault(scenario.ctx());
    };

    // init member and deposit
    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();
        
         // add BOB by address
        let mut address_list = vector::empty<address>();
        let mut percentage_list = vector::empty<u8>();
        address_list.push_back(BOB);
        percentage_list.push_back(100);
        seaVault::addMemberByAddresses(&ownerCap, &mut vault, address_list, percentage_list, scenario.ctx());

        // deposit
        let coin: Coin<SUI> = test_sui(&mut scenario);
        seaVault::add_coin(&ownerCap, &mut vault, b"SUI", coin);

        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    {
        scenario.next_tx(BOB);
        let memberCap: MemberCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();
        let clock: Clock = clock::create_for_testing(scenario.ctx());

        // expect failure
        seaVault::member_withdraw<SUI>(&memberCap, &mut vault, &clock, b"SUI", scenario.ctx());

        // finish and return used stuff
        ts::return_to_sender(&scenario, memberCap);
        ts::return_shared(vault);
        clock::destroy_for_testing(clock);
    };

    ts::end(scenario);
}

#[test]
fun test_withdraw_percentage() {
    let mut scenario = ts::begin(@0x0);
    {
        scenario.next_tx(ALICE);
        seaVault::createVault(scenario.ctx());
    };

    // init member and deposit
    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();
        
         // add BOB and by address
        let mut address_list = vector::empty<address>();
        let mut percentage_list = vector::empty<u8>();
        address_list.push_back(BOB);
        percentage_list.push_back(20);
        seaVault::addMemberByAddresses(&ownerCap, &mut vault, address_list, percentage_list, scenario.ctx());

        // add DAVE by email
        let emailDave = string::utf8(b"Dave@seawallet.ai");
        let percentageDave = 80;
        let capDave = seaVault::addMemberByEmail(&ownerCap, &mut vault, emailDave, percentageDave, scenario.ctx());
        transfer::public_transfer(capDave, DAVE);

        // deposit
        let coin_sui: Coin<SUI> = test_sui(&mut scenario);
        seaVault::add_coin(&ownerCap, &mut vault, b"SUI", coin_sui);
        let coin_usdc: Coin<USDC> = test_usdc(&mut scenario);
        seaVault::add_coin(&ownerCap, &mut vault, b"USDC", coin_usdc);
        let more_coin_usdc: Coin<USDC> = test_usdc(&mut scenario);
        seaVault::organize_coin(&ownerCap, &mut vault, b"USDC", more_coin_usdc);

        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    // locked -> grace period
    {
        scenario.next_tx(BOB);
        let memberCap: MemberCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();
        let mut clock: Clock = clock::create_for_testing(scenario.ctx());
        clock.set_for_testing(SIX_MONTHS+1);

        seaVault::member_withdraw<SUI>(&memberCap, &mut vault, &clock, b"SUI", scenario.ctx());
        assert!(seaVault::is_warned(&vault) == true);

        // finish and return used stuff
        ts::return_to_sender(&scenario, memberCap);
        ts::return_shared(vault);
        clock::destroy_for_testing(clock);
    };

    // grace period -> BOB withdraw
    {
        scenario.next_tx(BOB);
        let memberCap: MemberCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();
        let mut clock: Clock = clock::create_for_testing(scenario.ctx());
        clock.set_for_testing(SIX_MONTHS+1+SEVEN_DAYS+1);

        seaVault::member_withdraw<SUI>(&memberCap, &mut vault, &clock, b"SUI", scenario.ctx());
        seaVault::member_withdraw<USDC>(&memberCap, &mut vault, &clock, b"USDC", scenario.ctx());

        // finish and return used stuff
        ts::return_to_sender(&scenario, memberCap);
        ts::return_shared(vault);
        clock::destroy_for_testing(clock);
    };

    // DAVE success to withdraw
    {
        scenario.next_tx(DAVE);
        let memberCap: MemberCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();
        let mut clock: Clock = clock::create_for_testing(scenario.ctx());
        clock.set_for_testing(SIX_MONTHS+1+SEVEN_DAYS+1);
        seaVault::member_withdraw<SUI>(&memberCap, &mut vault, &clock, b"SUI", scenario.ctx());
        seaVault::member_withdraw<USDC>(&memberCap, &mut vault, &clock, b"USDC", scenario.ctx());

        // finish and return used stuff
        ts::return_to_sender(&scenario, memberCap);
        ts::return_shared(vault);
        clock::destroy_for_testing(clock);
    };

    // confirm Bob's withdraw
    {
        scenario.next_tx(BOB);
        let coin_sui: Coin<SUI> = scenario.take_from_sender();
        assert_eq!(coin_sui.value(), 20);
        ts::return_to_sender(&scenario, coin_sui);
        let coin_usdc: Coin<USDC> = scenario.take_from_sender();
        assert_eq!(coin_usdc.value(), 40);
        ts::return_to_sender(&scenario, coin_usdc);

    };

    {
        scenario.next_tx(DAVE);
        let coin_sui: Coin<SUI> = scenario.take_from_sender();
        assert_eq!(coin_sui.value(), 80);
        ts::return_to_sender(&scenario, coin_sui);
        let coin_usdc: Coin<USDC> = scenario.take_from_sender();
        assert_eq!(coin_usdc.value(), 160);
        ts::return_to_sender(&scenario, coin_usdc);
    };

    ts::end(scenario);
}


#[test]
#[expected_failure]
fun test_member_withdraw_same_asset_twice() {
    let mut scenario = ts::begin(@0x0);
    {
        scenario.next_tx(ALICE);
        seaVault::createVault(scenario.ctx());
    };

    // init member and deposit
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

        // deposit
        let coin: Coin<SUI> = test_sui(&mut scenario);
        seaVault::add_coin(&ownerCap, &mut vault, b"SUI", coin);

        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    {
        scenario.next_tx(BOB);
        let memberCap: MemberCap = scenario.take_from_sender();
        let mut vault: SeaVault = scenario.take_shared();
        let clock: Clock = clock::create_for_testing(scenario.ctx());

        // expect failure
        seaVault::member_withdraw<SUI>(&memberCap, &mut vault, &clock, b"SUI", scenario.ctx());

        // finish and return used stuff
        ts::return_to_sender(&scenario, memberCap);
        ts::return_shared(vault);
        clock::destroy_for_testing(clock);
    };

    ts::end(scenario);
}

// test (member_withdraw and owner update_time) and (member_withdraw and owner reclaim_asset)