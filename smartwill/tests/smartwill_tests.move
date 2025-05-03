#[test_only]
module smartwill::smartwill_tests;
use smartwill::vault::{Self, Vault, OwnerCap, MemberCap};
use sui::test_scenario::{Self as ts, Scenario};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::vec_map::{Self, VecMap};
use std::string::{Self, String};

const ENotImplemented: u64 = 0;
const ALICE: address = @0xA;
const BOB: address = @0xB;
const CHARLIE: address = @0xC;
const DAVE: address = @0xD;

#[test_only]
fun test_coin(ts: &mut Scenario): Coin<SUI> {
    coin::mint_for_testing(42, ts.ctx())
}

#[test]
fun test_countdown() {
    let mut scenario = ts::begin(@0x0);
    {
        scenario.next_tx(ALICE);
        let coin = test_coin(&mut scenario);
        vault::createVault(scenario.ctx());
        coin::burn_for_testing(coin);
    };

    {
        scenario.next_tx(ALICE);
        let ownerCap: OwnerCap = scenario.take_from_sender();
        let mut vault: Vault = scenario.take_shared();
        let addrPer: VecMap<address, u8> = vec_map::empty<address, u8>();
        
        &mut addrPer.insert(BOB, 30);
        addrPer.insert(CHARLIE, 40);
        addrPer.insert(DAVE, 30);
        let emailPer: VecMap<String, u8> = vec_map::empty<String, u8>();
        let memCap: VecMap<String, MemberCap> = vault::initMember(&ownerCap, &mut vault, addrPer, emailPer, scenario.ctx());
        // finish and return used stuff
        ts::return_to_sender(&scenario, ownerCap);
        ts::return_shared(vault);
    };

    ts::end(scenario);
}