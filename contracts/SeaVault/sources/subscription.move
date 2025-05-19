module SeaWallet::subscription {
     use std::{
        string::{Self, String},
        vector,
        type_name::{Self, TypeName},
    };
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
    };

    const EChargeDateNotPassed: u64 = 0;
    const EWrongServiceId: u64 = 1;

    public struct ServiceCap has key, store {
        id: UID,
        service_id: ID
    }

    public struct Service<phantom CoinType> has key {
        id: UID,
        price: u64,
        coin_type: Balance<CoinType>,
        asset_name: String,
        service_name: String,
        service_owner: address,
        yearly_discount: u8,
    }

    public struct Receipt<phantom CoinType> has key, store {
        id: UID,
        serviceID: ID,
        expire_date: u64,
        is_active: bool,
        receipt_owner: address,
        paid_amount: u64,
        coin_type: Balance<CoinType>,
    }

    /// create a subscription service
    public fun create_service<CoinType>(price: u64, service_name: String, asset_name: String, service_owner: address, yearly_discount: u8, ctx: &mut TxContext) {
        let service = Service{
            id: object::new(ctx),
            price: price,
            coin_type: balance::zero<CoinType>(),
            asset_name: asset_name,
            service_name: service_name,
            service_owner: service_owner,
            yearly_discount: yearly_discount
        };
        let service_cap = ServiceCap{ 
            id: object::new(ctx),
            service_id: object::id(&service)
        };
        transfer::public_transfer(service_cap, service_owner);
        transfer::share_object(service);
    }

    // /// cancel service
    // public fun cancel_service<CoinType>(service: Service<CoinType>) {
    //     let Service<CoinType> {id, price: _, coin_type: coin_type, asset_name: _, service_name: _, service_owner: _, yearly_discount: _} = service;
    //     balance::destroy_zero(coin_type);
    //     object::delete(id);
    // }

    /// create receipt
    public(package) fun create_receipt<CoinType>(service: & Service<CoinType>, paid_amount: u64, expire_date: u64, ctx: &mut TxContext): Receipt<CoinType> {
        let receipt = Receipt<CoinType>{
            id: object::new(ctx),
            serviceID: object::id(service),
            is_active: true,
            receipt_owner: ctx.sender(),
            expire_date: expire_date,
            paid_amount: paid_amount,
            coin_type: balance::zero<CoinType>(),
        };
        receipt
    }

    /// refund
    // public fun refund_receipt<CoinType>(receipt: &mut Receipt<CoinType>, coin: Coin<CoinType>) {
    //     assert!(receipt.is_active, EChargeDateNotPassed);
    //     assert!(coin.value() >= receipt.paid_amount, EWrongServiceId);
    //     receipt.is_active = false;
    //     transfer::public_transfer(coin, receipt.receipt_owner);
    // }

    /// confirm subscription

    public fun get_service_price<CoinType>(service: &Service<CoinType>): u64 {
        service.price
    }

    public fun get_service_asset_name<CoinType>(service: &Service<CoinType>): String {
        service.asset_name
    }

    public fun get_service_name<CoinType>(service: &Service<CoinType>): String {
        service.service_name
    }

    public fun get_service_owner<CoinType>(service: &Service<CoinType>): address {
        service.service_owner
    }

    public fun get_yearly_discount<CoinType>(service: &Service<CoinType>): u8 {
        service.yearly_discount
    }
}
