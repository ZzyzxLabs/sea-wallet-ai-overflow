module smartwill::subscribe {

    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use std::string::{Self, String};
    use sui::object::{Self, UID, ID};
    use sui::clock::{Self, Clock};

    public struct DeductCap has key, store {
        id: UID,
        serviceID: ID,
        deductDate: u64,
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

    public struct Service has key {
        id: UID,
        price: u64,
        name: String,
        serviceAddress: address,
        yearlyDiscount: u8
    }

    public fun createService(service: &Service, price: u64, name: String, serviceAddr: address, yDiscount: u8, ctx: &mut TxContext) {
        let service = Service{
            id: object::new(ctx),
            price: price,
            name: name,
            serviceAddress: serviceAddr,
            yearlyDiscount: yDiscount
        };
        transfer::share_object(service);
    }

    public fun subscribeMonthly<CoinType>(service: &Service, mut coin: Coin<CoinType>, ctx: &mut TxContext) {
        let coin_to_service = coin::split<CoinType>(&mut coin, service.price, ctx);
        transfer::public_transfer(coin_to_service, service.serviceAddress);
        let deductCap = DeductCap {
            id: object::new(ctx),
            serviceID: object::id(service),
            deductDate: tx_context::epoch_timestamp_ms(ctx) + 30 * 24 * 60 * 60 * 1000
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

    public fun subscribeYearly<CoinType>(service: &Service, mut coin: Coin<CoinType>, ctx: &mut TxContext) {
        let coin_to_service = coin::split<CoinType>(&mut coin, service.price * 12 * (service.yearlyDiscount as u64) / 100, ctx);
        transfer::public_transfer(coin_to_service, service.serviceAddress);
        let deductCap = DeductCap {
            id: object::new(ctx),
            serviceID: object::id(service),
            deductDate: tx_context::epoch_timestamp_ms(ctx) + 365 * 24 * 60 * 60 * 1000
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
}
