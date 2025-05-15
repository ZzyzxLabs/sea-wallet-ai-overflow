module SeaWallet::subscription {
    use sui::tx_context::{Self, TxContext};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use std::string::{Self, String};
    use sui::object::{Self, UID, ID};
    use sui::clock::{Self, Clock};
    use sui::dynamic_object_field as dof;
    const EDeductDateNotPassed: u64 = 0;
    const EWrongVaultId: u64 = 1;
    const EWrongServiceId: u64 = 2;
    use std::type_name::{Self, TypeName};

    public struct AutoDeductSystemCap has key {
        id: UID,
    }

    public struct SubControler has key {
        id: UID,
        serviceID: ID
    }

    

    public struct Service<phantom CoinType> has key {
        id: UID,
        price: u64,
        coin_type: Balance<CoinType>,
        assert_name: String,
        service_name: String,
        service_owner: address,
        yearly_discount: u8,
    }

    

    public fun create_service<CoinType>(price: u64, service_name: String, asset_name: String, service_owner: address, yearly_discount: u8, ctx: &mut TxContext) {
        let service = Service{
            id: object::new(ctx),
            price: price,
            coin_type: balance::zero<CoinType>(),
            assert_name: asset_name,
            service_name: service_name,
            service_owner: service_owner,
            yearly_discount: yearly_discount
        };
        transfer::share_object(service);
    }

    public fun get_service_price<CoinType>(service: &Service<CoinType>): u64 {
        service.price
    }

    public fun get_asset_name<CoinType>(service: &Service<CoinType>): String {
        service.assert_name
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

    // public fun subscribe<CoinType>(service: &Service<CoinType>, mut coin: Coin<CoinType>, vault: &SeaVault, ctx: &mut TxContext) {
    //     let receipt = Receipt{
    //         id: object::new(ctx),
    //         serviceID: service.id,
    //         expireDate: clock::now() + 365 * 24 * 60 * 60,
    //     };
    //     transfer::share_object(receipt);
    // }
}
