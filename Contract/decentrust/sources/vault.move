module aitrust::vault {
    use sui::dynamic_object_field as dof;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct AImanagercap has key, store {
        id: UID
    }

    public struct TrustVault has key {
        id: UID
    }

    public struct VAULT has drop {}

    fun init(otw: VAULT, ctx: &mut TxContext) {
        let aicap = AImanagercap {
            id: object::new(ctx)
        };
        let trustpool = TrustVault {
            id: object::new(ctx)
        };
        transfer::share_object(trustpool);
        transfer::public_transfer(aicap, ctx.sender());
    }

    public fun add_trust_asset<Asset: key + store>(cap: &AImanagercap vault: &mut TrustVault, asset: Asset, name: vector<u8>, ctx: &mut TxContext) {
        dof::add(
            &mut vault.id,
            name,
            asset
        )
    }

    public fun add_trust_asset_coin<Asset>(cap: &AImanagercap vault: &mut TrustVault, asset: Coin<Asset>, name: vector<u8>, ctx: &mut TxContext) {
        dof::add(
            &mut vault.id,
            name,
            asset
        );
    }

    public fun reclaim_trust_asset<Asset: key + store>(cap: &AImanagercap vault: &mut TrustVault, asset_name: vector<u8>, ctx: &mut TxContext) {
        let asset = dof::remove<vector<u8>, Asset>(
            &mut vault.id,
            asset_name,
        );
        transfer::public_transfer(asset, ctx.sender());
    }

    public fun organize_trust_asset<Asset: key + store>(cap: &AImanagercap vault: &mut TrustVault, asset_name: vector<u8>, asset: Coin<Asset>, ctx: &mut TxContext) {
        let coin_from_vault = dof::borrow_mut<vector<u8>, Coin<Asset>>(
            &mut vault.id,
            asset_name
        );
        coin::join<Asset>(coin_from_vault, asset);
    }
}