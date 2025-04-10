module smartwill::vault {
    use sui::dynamic_object_field as dof;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};

    public struct Vault has key {
        id: UID
    }
    
    // The owner of the vault, he/she can deposit, withdraw, and send assets
    public struct OwnerCap has key, store {
        id: UID,
    }

    // The ai agent that helps owner to stake/loan assets
    public struct AICap has key, store {
        id: UID,
    }

    // Validator are who can validate the deathness of the owner
    public struct ValidatorCap has key, store {
        id: UID,
    }

    // public struct VAULT has drop {}

    fun init(ctx: &mut TxContext) {
        let ownerCap = OwnerCap {
            id: object::new(ctx)
        };
        let vault = Vault {
            id: object::new(ctx)
        };
        transfer::share_object(vault);
        transfer::public_transfer(ownerCap, ctx.sender());
    }

    public fun add_trust_asset<Asset: key + store>(cap: &OwnerCap, vault: &mut Vault, asset: Asset, name: vector<u8>, ctx: &mut TxContext) {
        dof::add(
            &mut vault.id,
            name,
            asset
        )
    }

    public fun add_trust_asset_coin<Asset>(cap: &OwnerCap, vault: &mut Vault, asset: Coin<Asset>, name: vector<u8>, ctx: &mut TxContext) {
        dof::add(
            &mut vault.id,
            name,
            asset
        );
    }

    public fun reclaim_trust_asset<Asset: key + store>(cap: &OwnerCap, vault: &mut Vault, asset_name: vector<u8>, ctx: &mut TxContext) {
        let asset = dof::remove<vector<u8>, Asset>(
            &mut vault.id,
            asset_name,
        );
        transfer::public_transfer(asset, ctx.sender());
    }

    public fun organize_trust_asset<Asset: key + store>(cap: &OwnerCap, vault: &mut Vault, asset_name: vector<u8>, asset: Coin<Asset>, ctx: &mut TxContext) {
        let coin_from_vault = dof::borrow_mut<vector<u8>, Coin<Asset>>(
            &mut vault.id,
            asset_name
        );
        coin::join<Asset>(coin_from_vault, asset);
    }

    #[test_only]
    public fun test_init(ctx: &mut TxContext) {
        init( ctx);
    }
}