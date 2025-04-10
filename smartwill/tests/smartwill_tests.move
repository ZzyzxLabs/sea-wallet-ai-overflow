#[test_only]
module smartwill::smartwill_tests;
use smartwill::vault;
use sui::test_scenario::{Self as ts};
use sui::coin;
use sui::sui::SUI;

const ENotImplemented: u64 = 0;

#[test]
fun test_smartwill() {
    let owner = @0x1;
    let mut scenario_val = ts::begin(owner);
    let scenario = &mut scenario_val;
    {
        vault::test_init(scenario.ctx());
    };
    ts::next_tx(scenario, owner);
    {
        let deposit =  coin::mint_for_testing<SUI>(10000, scenario.ctx());
        
    };
    ts::end(scenario_val);
}

#[test, expected_failure(abort_code = ::smartwill::smartwill_tests::ENotImplemented)]
fun test_smartwill_fail() {
    abort ENotImplemented
}
