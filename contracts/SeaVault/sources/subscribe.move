module smartwill::subscribe {

     use sui::tx_context::{Self, TxContext};
     use sui::balance::{Self, Balance};
     use sui::coin::{Self, Coin};
     use std::string::{Self, String};
     use sui::object::{Self, UID, ID};
     use sui::clock::{Self, Clock};
     use SeaWallet::seaVault::{Self, vaultID, Vault};
     use sui::dynamic_object_field as dof;
     const EDeductDateNotPassed: u64 = 0;
     const EWrongVaultId: u64 = 1;
     const EWrongServiceId: u64 = 2;

    public struct DeductCap has key, store {
        id: UID,
        serviceID: ID,
        deductDate: u64,
        vaultId: ID,
        paddr: address
    }

    public struct AutoDeductSystemCap has key {
        id: UID,
    }

    public struct SubControler has key {
        id: UID,
        serviceID: ID
    }

    public struct SubProof has key, store {
        id: UID,
        serviceID: ID,
        expireDate: u64,
    }

    public struct Service<phantom CoinType> has key {
        id: UID,
        price: u64,
        coin: Balance<CoinType>,
        name: String,
        serviceAddress: address,
        yearlyDiscount: u8
    }

    public fun createService<CoinType>(service: &Service<CoinType>, price: u64, name: String, serviceAddr: address, yDiscount: u8, ctx: &mut TxContext) {
        let service = Service{
            id: object::new(ctx),
            price: price,
            coin: balance::zero<CoinType>(),
            name: name,
            serviceAddress: serviceAddr,
            yearlyDiscount: yDiscount
        };
        transfer::share_object(service);
    }

    public fun subscribeMonthly<CoinType>(service: &Service<CoinType>, mut coin: Coin<CoinType>, vault: &SeaVault, ctx: &mut TxContext) {
        let coin_to_service = coin::split<CoinType>(&mut coin, service.price, ctx);
        transfer::public_transfer(coin_to_service, service.serviceAddress);
        let deductCap = DeductCap {
            id: object::new(ctx),
            serviceID: object::id(service),
            deductDate: tx_context::epoch_timestamp_ms(ctx) + 30 * 24 * 60 * 60 * 1000,
            vaultId: object::id(vault),
            paddr: ctx.sender()
        };
        let subproof = SubProof {
            id: object::new(ctx),
            serviceID: object::id(service),
            expireDate: tx_context::epoch_timestamp_ms(ctx) + 30 * 24 * 60 * 60 * 1000
        };
        transfer::public_transfer(subproof, ctx.sender());
        transfer::public_transfer(deductCap, service.serviceAddress);
        transfer::public_transfer(coin,service.serviceAddress);
    }

    public fun subscribeYearly<CoinType>(service: &Service<CoinType>, mut coin: Coin<CoinType>, vault: &SeaVault, ctx: &mut TxContext) {
        let coin_to_service = coin::split<CoinType>(&mut coin, service.price * 12 * (service.yearlyDiscount as u64) / 100, ctx);
        transfer::public_transfer(coin_to_service, service.serviceAddress);
        let deductCap = DeductCap {
            id: object::new(ctx),
            serviceID: object::id(service),
            deductDate: tx_context::epoch_timestamp_ms(ctx) + 365 * 24 * 60 * 60 * 1000,
            vaultId: object::id(vault),
            paddr: ctx.sender()
        };
        let subproof = SubProof {
            id: object::new(ctx),
            serviceID: object::id(service),
            expireDate: tx_context::epoch_timestamp_ms(ctx) + 365 * 24 * 60 * 60 * 1000
        };
        transfer::public_transfer(subproof, ctx.sender());
        transfer::public_transfer(deductCap, service.serviceAddress);
        transfer::public_transfer(coin, service.serviceAddress);
    }

    public fun deduct<CoinType>(service: &mut Service<CoinType>, cap: &mut DeductCap, vault: &mut SeaVault, asset_name: vector<u8>, ctx: &mut TxContext) {
        assert!(cap.deductDate < tx_context::epoch_timestamp_ms(ctx), EDeductDateNotPassed);
        assert!(seaVault::vaultID(vault) == cap.vaultId, EWrongVaultId);
        assert!(object::id(service) == cap.serviceID, EWrongVaultId);
        let coin_from_vault = dof::borrow_mut<vector<u8>, Coin<CoinType>>(&mut vault.id, asset_name);
        let coin_splited = coin::split<CoinType>(coin_from_vault, service.price, ctx);
        balance::join<CoinType>(&mut service.coin, coin::into_balance(coin_splited));
        cap.deductDate = tx_context::epoch_timestamp_ms(ctx) + 30 * 24 * 60 * 60 * 1000;
        let subproof = SubProof {
            id: object::new(ctx),
            serviceID: object::id(service),
            expireDate: tx_context::epoch_timestamp_ms(ctx) + 30 * 24 * 60 * 60 * 1000
        };
        transfer::public_transfer(subproof, cap.paddr);
    }

}
