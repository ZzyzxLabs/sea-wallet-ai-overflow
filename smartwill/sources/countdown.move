// module smartwill::countdown;

// use sui::clock::{Self, Clock};
// use sui::tx_context::epoch_timestamp_ms;
// use smartwill::vault::{OwnerCap, HeirCap};
// use sui::vec_map::{Self, VecMap};

// public struct COUNTDOWN has drop {}

// const ELocked: u64 = 0;
// const SixMonths: u64 = 6 * 30 * 24 * 60 * 60 * 1000;
// const SevenDays: u64 = 7 * 24 * 60 * 60 * 1000;
// // vault
// public struct Vault has key, store {
//     id: UID,
//     last_time: u64,
//     warned: bool,
//     timeleft: u64,
//     heirs: VecMap<address, u8>,
// }

// // public struct OwnerCap has key, store {
// //     id: UID,


// // public struct HeirCap has key, store {
// //     id: UID,
// // }

// // // init
// // fun init(_otw: COUNTDOWN, ctx: &mut TxContext) {
// //     let vault = Vault {
// //         id: object::new(ctx),
// //         last_time: ctx.epoch_timestamp_ms(),
// //         warned: false,
// //         timeleft: SixMonths,
// //     };

// //     let ownerCap = OwnerCap {
// //         id: object::new(ctx)
// //     };

// //     transfer::public_share_object(vault);
// //     transfer::public_transfer(ownerCap, ctx.sender());
// // }

// // #[allow(lint(self_transfer))]
// // public fun create(ctx: &mut TxContext) {
// //     let vault = Vault {
// //         id: object::new(ctx),
// //         last_time: ctx.epoch_timestamp_ms(),
// //         warned: false,
// //         timeleft: SixMonths
// //     };

// //     let ownerCap = OwnerCap {
// //         id: object::new(ctx)
// //     };

// //     transfer::public_share_object(vault);
// //     transfer::public_transfer(ownerCap, ctx.sender());
// // }

// // update time - update the last time of the vault
// public fun update_time(_cap: &OwnerCap, vault: &mut Vault, clock: &Clock) {
//     vault.last_time = clock.timestamp_ms();
//     if (vault.warned) {
//         vault.timeleft = SixMonths; 
//         vault.warned = false;
//     }
// }

// // grace period - 7 days grace period for owner to confirm their aliveness
// fun grace_period(_cap: &HeirCap, vault: &mut Vault, clock: &Clock) {
//     vault.last_time = clock.timestamp_ms();
//     vault.timeleft = SevenDays; // 7 days
//     vault.warned = true;
// }

// // withdraw after 6 months
// public fun heir_withdraw(heirCap: &HeirCap, vault: &mut Vault, clock: &Clock, ctx: &mut TxContext): bool {
//     let current_time = clock.timestamp_ms();
//     assert!(current_time - vault.last_time >= vault.timeleft, ELocked);
//     if (!vault.warned) {
//         grace_period(heirCap, vault, clock);
//         return false
//     };
//     // transfer::transfer(vault.id, ctx.sender());
//     true
// }


// // #[test_only]
// // use sui::test_scenario::{Self as ts};
// // #[test_only]
// // const ALICE: address = @0xA;

// // #[test]
// // fun testCountdown() {
// //     let mut ts = ts::begin(@0x0);
// //     let mut test_clock = clock::create_for_testing(ts.ctx());

// //     {
// //         ts.next_tx(ALICE);
// //         // let vault = Vault {
// //         //     id: object::new(ts.ctx()),
// //         //     last_time: clock::timestamp_ms(&test_clock)
// //         // };
// //         // let ownerCap = OwnerCap {
// //         //     id: object::new(ts.ctx())
// //         // };
// //         // transfer::public_share_object(vault);
// //         // transfer::public_transfer(ownerCap, ALICE);
// //         create(ts.ctx());
// //     };

// //     {
// //         ts.next_tx(ALICE);
// //         let mut vault: Vault = ts.take_shared();
// //         let ownerCap: OwnerCap = ts.take_from_sender();
// //         let tick = 6 * 30 * 24 * 60 * 60 * 1000 + 1;
// //         clock::increment_for_testing(&mut test_clock, tick);
// //         let success: bool = withdraw(&ownerCap, &mut vault, &test_clock);
// //         assert!(!success, ELocked);
// //         let tick: u64 = 7 * 24 * 60 * 60 * 1000 + 1;
// //         clock::increment_for_testing(&mut test_clock, tick);
// //         let success: bool = withdraw(&ownerCap, &mut vault, &test_clock);
// //         assert!(success, ELocked);
// //         ts::return_to_sender(&ts, ownerCap);
// //         ts::return_shared(vault);
// //     };

// //     clock::destroy_for_testing(test_clock);
// //     ts::end(ts);
// // }
