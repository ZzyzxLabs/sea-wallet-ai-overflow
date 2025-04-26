module smartwill::vault {
    use sui::dynamic_object_field as dof;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::vec_map::{Self, VecMap};
    use std::address;
    use sui::sui::SUI;

    public struct Vault has key {
        id: UID,
        last_time: u64,
        warned: bool,
        timeleft: u64,
        heirs: VecMap<address, u8>,
    }
    
    // The owner of the vault, he/she can deposit, withdraw, and send assets
    public struct OwnerCap has key, store {
        id: UID,
    }

    // The ai agent that helps owner to stake/loan assets
    // public struct AICap has key, store {
    //     id: UID,
    // }

    // Heirs are who can validate the deathness of the owner, and withdraw assets if the owner is dead
    public struct HeirCap has key, store {
        id: UID,
        percentage: u8

    }

    // public struct VAULT has drop {}

    fun init(ctx: &mut TxContext) {
        let ownerCap = OwnerCap {
            id: object::new(ctx)
        };
        let vault = Vault {
            id: object::new(ctx),
            last_time: ctx.epoch_timestamp_ms(),
            warned: false,
            timeleft: 6 * 30 * 24 * 60 * 60 * 1000,
            heirs: vec_map::empty<address, u8>(),
        };
        transfer::share_object(vault);
        transfer::public_transfer(ownerCap, ctx.sender());
    }

    // initialization of heirs
    public fun initHeirs(_cap: &OwnerCap, vault: &mut Vault, heirs: VecMap<address, u8>, ctx: &mut TxContext) {
        vault.heirs = heirs;
        while (!heirs.is_empty()) {
            let (heir, percentage) = heirs.pop();
            let heirCap = HeirCap {
                id: object::new(ctx),
                percentage: percentage,
            };
            transfer::public_transfer(heirCap, heir);
        }
    }

    // add heir by address
    public fun addHeirByAddress(_cap: &OwnerCap, vault: &mut Vault, heir: address, percentage: u8, ctx: &mut TxContext) {
        let heirCap = HeirCap {
            id: object::new(ctx),
            percentage: percentage,
        };
        vault.heirs.insert(heir, percentage);
        transfer::public_transfer(heirCap, heir);
    }

    // add heir by email (use zk)
    public fun addHeirByEmail(_cap: &OwnerCap, vault: &mut Vault, email: vector<u8>, percentage: u8, ctx: &mut TxContext) : HeirCap{
        let heirCap = HeirCap {
            id: object::new(ctx),
            percentage: percentage,
        }
        
    }

    // change heirs
    public fun changeHeirs(_cap: &OwnerCap, vault: &mut Vault, heirs: VecMap<address, u8>, ctx: &mut TxContext) {
        initHeirs(_cap, vault, heirs, ctx);
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