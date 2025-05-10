#[test_only]
module smartwill::smartwill_tests;
use smartwill::vault::{Self, Vault, OwnerCap, MemberCap};
use sui::dynamic_object_field as dof;
use sui::test_scenario::{Self as ts, Scenario};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::vec_map::{Self, VecMap};
use std::string::{Self, String};
use sui::clock::{Self, Clock};
use sui::bcs;
use std::vector;
use std::debug;
use usdc::usdc::USDC;
use std::type_name::{Self, TypeName};

// const ENotImplemented: u64 = 0;
const ALICE: address = @0xA;
const BOB: address = @0xB;
const CHARLIE: address = @0xC;
const DAVE: address = @0xD;
const Error: u64 = 444;
const FRED: address = @0xF;
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
        let coin = test_sui(&mut scenario);
        vault::createVault(scenario.ctx());
        coin::burn_for_testing(coin);
    };

    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: Vault = scenario.take_shared();
        let mut addrList = vector::empty<address>();
        let mut addrPer = vector::empty<u8>();
        addrList.push_back(BOB);
        addrPer.push_back(25);
        addrList.push_back(CHARLIE);
        addrPer.push_back(25);
        let emailDave = string::utf8(b"Dave@seawallet.ai");
        let emailFred = string::utf8(b"Fred@seawallet.ai");
        let mut emailList = vector::empty<String>();
        emailList.push_back(emailDave);
        emailList.push_back(emailFred);
        let mut emailPer = vector::empty<u8>();
        emailPer.push_back(25);
        emailPer.push_back(25);
        let mut emailCaps: vector<MemberCap> = vault::initMember(&ownerCap, &mut vault, addrList, addrPer, emailList,  emailPer, scenario.ctx());
        // debug::print(&emailCaps);
        assert!(!emailCaps.is_empty(), Error);
        let emailDaveCap = emailCaps.pop_back();
        let emailFredCap = emailCaps.pop_back();

        // finish and return used stuff
        transfer::public_transfer(emailDaveCap, DAVE);
        transfer::public_transfer(emailFredCap, FRED);
        emailCaps.destroy_empty();
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };
    ts::end(scenario); 
}

#[test]
fun test_add_member_by_address() {
    let mut scenario = ts::begin(@0x0);
    {
        scenario.next_tx(ALICE);
        let coin = test_sui(&mut scenario);
        vault::createVault(scenario.ctx());
        coin::burn_for_testing(coin);
    };
        {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: Vault = scenario.take_shared();
        
        vault::addMemberByAddress(&ownerCap, &mut vault, BOB, 50, scenario.ctx());
        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };
    {
        scenario.next_tx(BOB);
        let memberCap: MemberCap = scenario.take_from_sender();

        // finish and return used stuff
        ts::return_to_sender(&scenario, memberCap);
    };
    ts::end(scenario);
}

#[test]
fun test_add_member_by_email() {
    let mut scenario = ts::begin(@0x0);
    {
        scenario.next_tx(ALICE);
        let coin = test_sui(&mut scenario);
        vault::createVault(scenario.ctx());
        coin::burn_for_testing(coin);
    };
        {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: Vault = scenario.take_shared();
        
        let emailCap: MemberCap = vault::addMemberByEmail(&ownerCap, &mut vault, b"BOB@seawallet.ai".to_string(), 50, scenario.ctx());
        // debug::print(&emailCap);
        transfer::public_transfer(emailCap, BOB);
        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };
    {
        scenario.next_tx(BOB);
        let memberCap: MemberCap = scenario.take_from_sender();

        // finish and return used stuff
        ts::return_to_sender(&scenario, memberCap);
    };
    ts::end(scenario);
}

#[test]
fun test_add_reclaim() {
    let mut scenario = ts::begin(@0x1);
    {
        debug::print(& b"test_add_reclaim");
        scenario.next_tx(ALICE);
        vault::createVault(scenario.ctx());
    };

    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: Vault = scenario.take_shared();
        let coin: Coin<SUI> = test_sui(&mut scenario);
        vault::add_trust_asset_coin(&ownerCap, &mut vault, coin, b"SUI", scenario.ctx());
        
        let coin2: Coin<SUI> = test_sui(&mut scenario);
        vault::organize_coin_asset(&ownerCap, &mut vault, b"SUI", coin2, scenario.ctx());
        debug::print(&vault);
        
        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };
    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: Vault = scenario.take_shared();
        vault::reclaim_trust_asset<Coin<SUI>>(&ownerCap, &mut vault, b"SUI", scenario.ctx());
        
        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };
    {
        scenario.next_tx(ALICE);
        let mergedCoin: Coin<SUI> = scenario.take_from_sender();
        debug::print(&mergedCoin);
        ts::return_to_sender(&scenario, mergedCoin);
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
//         let mut addrList = vector::empty<address>();
//         let mut addrPer = vector::empty<u8>();
//         addrList.push_back(BOB);
//         addrPer.push_back(50);
//         let mut emailList = vector::empty<String>();
//         emailList.push_back(string::utf8(b"charlie@seawallet.ai"));
//         let mut emailPer = vector::empty<u8>();
//         emailPer.push_back(50);
//         let mut emailCaps: vector<MemberCap> = vault::initMember(&ownerCap, &mut vault, addrList, addrPer, emailList, emailPer, scenario.ctx());
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
//         let mut addrList = vector::empty<address>();
//         let mut addrPer = vector::empty<u8>();
//         addrList.push_back(BOB);
//         addrPer.push_back(30);
//         addrList.push_back(CHARLIE);
//         addrPer.push_back(40);
//         let email = string::utf8(b"x@seawallet.ai");
//         let mut emailList = vector::empty<String>();
//         emailList.push_back(email);
//         let mut emailPer = vector::empty<u8>();
//         emailPer.push_back(30);
//         let mut emailCaps: vector<MemberCap> = vault::initMember(&ownerCap, &mut vault, addrList, addrPer, emailList,  emailPer, scenario.ctx());
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