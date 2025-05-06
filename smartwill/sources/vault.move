module smartwill::vault {
    use sui::dynamic_object_field as dof;
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::vec_map::{Self, VecMap};
    use std::string::{Self, String};
    use sui::sui::SUI;
    use sui::clock::{Self, Clock};
    use sui::tx_context::epoch_timestamp_ms;
    use sui::table::{Table, Self};
    use std::vector;
    
    const EDeductDateNotPassed: u64 = 0;
    const EWrongVaultId: u64 = 1;
    const EWrongServiceId: u64 = 2;
    const ELocked: u64 = 4;
    const EMisMatch: u64 = 5;

    public struct Vault has key {
        id: UID,
        last_time: u64,
        warned: bool,
        timeleft: u64,
        capPercentage: VecMap<u8, u8>,
        capBool: VecMap<u8, bool>, 
        withdraw_table: Table<vector<u8>, u64>,
    }
    
    public struct OwnerCap has key, store {
        id: UID,
        vaultID: ID
    }

    public struct MemberCap has key, store {
        id: UID,
        vaultID: ID,
        capID: u8,
    }

    #[allow(lint(self_transfer))]
    public fun createVault(ctx: &mut TxContext) {
        let vault = Vault {
            id: object::new(ctx),
            last_time: tx_context::epoch_timestamp_ms(ctx),
            warned: false,
            timeleft: 6 * 30 * 24 * 60 * 60 * 1000,
            capPercentage: vec_map::empty<u8, u8>(),
            capBool: vec_map::empty<u8, bool>(),
            withdraw_table: table::new<vector<u8>, u64>(ctx),
        };
        let ownerCap = OwnerCap {
            id: object::new(ctx),
            vaultID: object::id(&vault),
        };
        transfer::share_object(vault);
        transfer::public_transfer(ownerCap, tx_context::sender(ctx));
    }

    // initMember, return vector of caps for email members
    // TODO: return <email, cap> map
    public fun initMember(_cap: &OwnerCap, vault: &mut Vault, addrList: vector<address>, addrPer: vector<u8>, emailList: vector<String>, emailPer: vector<u8>, ctx: &mut TxContext): vector<MemberCap> {
        assert!(addrList.length() == addrPer.length(), EMisMatch);
        assert!(emailList.length() == emailPer.length(), EMisMatch);
        let mut capCount: u8 = 0;

        // Handle addresses
        let mut i = 0;
        while (i < addrList.length()) {
            let addrCap = MemberCap {
                id: object::new(ctx),
                vaultID: object::id(vault),
                capID: capCount,
            };
            
            transfer::public_transfer(addrCap, addrList[i]);
            vault.capPercentage.insert(capCount, addrPer[i]);
            vault.capBool.insert(capCount, true);

            capCount = capCount + 1;
            i = i + 1;
        };

        // Handle emails
        let mut emailCaps = vector::empty<MemberCap>();
        let mut j = 0;

        while (j < emailList.length()) {
            let emailCap = MemberCap {
                id: object::new(ctx),
                vaultID: object::id(vault),
                capID: capCount,
            };
            
            emailCaps.push_back(emailCap);
            vault.capPercentage.insert(capCount, emailPer[j]);
            vault.capBool.insert(capCount, true);

            capCount = capCount + 1;
            j = j + 1;
        };

        emailCaps
    }

    public fun addMemberByAddress(_cap: &OwnerCap, vault: &mut Vault, member: address, percentage: u8, ctx: &mut TxContext) {
        // let x = (vec_map::size(&vault.capPercentage) as u8);
        let capCount = (vault.capPercentage.size() as u8);
        let memberCap = MemberCap {
            id: object::new(ctx),
            vaultID: object::id(vault),
            capID: capCount,
        };
        vault.capPercentage.insert(capCount, percentage);
        vault.capBool.insert(capCount, true);
        transfer::public_transfer(memberCap, member);
    }

    public fun addMemberByAddresses(_cap: &OwnerCap, vault: &mut Vault, addrList: vector<address>, addrPer: vector<u8>, ctx: &mut TxContext) {
        // let x = (vec_map::size(&vault.capPercentage) as u8);
        let mut i = 0;
        let mut capCount = (vault.capPercentage.size() as u8);
        while (i < addrList.length()) {
            let addrCap = MemberCap {
                id: object::new(ctx),
                vaultID: object::id(vault),
                capID: capCount,
            };
            
            transfer::public_transfer(addrCap, addrList[i]);
            vault.capPercentage.insert(capCount, addrPer[i]);
            vault.capBool.insert(capCount, true);

            capCount = capCount + 1;
            i = i + 1;
        };
    }

    public fun addMemberByEmail(_cap: &OwnerCap, vault: &mut Vault, _email: String, percentage: u8, ctx: &mut TxContext): MemberCap {
        let capCount = (vault.capPercentage.size() as u8);
        let memberCap = MemberCap {
            id: object::new(ctx),
            vaultID: object::id(vault),
            capID: capCount,
        };
        vault.capPercentage.insert(capCount, percentage);
        vault.capBool.insert(capCount, true);
        memberCap
    }

    public fun add_trust_asset<Asset: key + store>(cap: &OwnerCap, vault: &mut Vault, asset: Asset, name: vector<u8>, ctx: &mut TxContext) {
        dof::add(&mut vault.id, name, asset);
    }
    //put coinType into vault
    public fun add_trust_asset_coin<Asset>(cap: &OwnerCap, vault: &mut Vault, asset: Coin<Asset>, name: vector<u8>, ctx: &mut TxContext) {
        // let name = string::utf8(name);
        // if (dof::exists_with_type<String, Coin<Asset>>(&vault.id, name)) {
        //     organize_trust_asset(&cap, &mut vault, name, asset, ctx);
        //     return
        // }
        let amount = coin::value<Asset>(&asset);
        table::add(&mut vault.withdraw_table, name, amount);
        dof::add(&mut vault.id, name, asset);
    }

    public fun reclaim_trust_asset<Asset: key + store>(cap: &OwnerCap, vault: &mut Vault, asset_name: vector<u8>, ctx: &mut TxContext) {
        let asset = dof::remove<vector<u8>, Asset>(&mut vault.id, asset_name);
        transfer::public_transfer(asset, tx_context::sender(ctx));
    }

    public fun organize_coin_asset<Asset>(cap: &OwnerCap, vault: &mut Vault, asset_name: vector<u8>, asset: Coin<Asset>, ctx: &mut TxContext) {
        let coin_from_vault = dof::borrow_mut<vector<u8>, Coin<Asset>>(&mut vault.id, asset_name);
        let amount = coin::value<Asset>(coin_from_vault); // Fixed: removed the extra &
        let amount_mut = table::borrow_mut<vector<u8>, u64>(&mut vault.withdraw_table, asset_name);
        *amount_mut = *amount_mut + amount;
        coin::join<Asset>(coin_from_vault, asset);
    }


    public fun organize_trust_asset<Asset>(cap: &OwnerCap, vault: &mut Vault, asset_name: vector<u8>, asset: Coin<Asset>, ctx: &mut TxContext) {
        let coin_from_vault = dof::borrow_mut<vector<u8>, Coin<Asset>>(&mut vault.id, asset_name);
        let amount = coin::value<Asset>(coin_from_vault); // Fixed: removed the extra &
        let amount_mut = table::borrow_mut<vector<u8>, u64>(&mut vault.withdraw_table, asset_name);
        *amount_mut = *amount_mut + amount;
        coin::join<Asset>(coin_from_vault, asset);
    }

    public fun update_time(_cap: &OwnerCap, vault: &mut Vault, clock: &Clock, ctx: &mut TxContext) {
        vault.last_time = clock.timestamp_ms();
        if (vault.warned) {
            vault.timeleft = 6 * 30 * 24 * 60 * 60 * 1000;
            vault.warned = false;
        }
    }

    // grace period - 7 days grace period for owner to confirm their aliveness
    fun grace_period(_cap: &MemberCap, vault: &mut Vault, clock: &Clock, ctx: &mut TxContext) {
        vault.last_time = clock.timestamp_ms();
        vault.timeleft = 7 * 24 * 60 * 60 * 1000;
        vault.warned = true;
    }

    // withdraw after 6 months; 
    public fun member_withdraw<CoinType>(
        cap: &MemberCap,
        vault: &mut Vault,
        clock: &Clock,
        assetVec: vector<vector<u8>>,
        ctx: &mut TxContext
    ) {
        let current_time = clock.timestamp_ms();
        assert!(current_time - vault.last_time >= vault.timeleft, ELocked);
        if (!vault.warned) {
            grace_period(cap, vault, clock, ctx);
        };
        let mut x = 0;
        while (x < vector::length(&assetVec)) {
            let asset_name = *vector::borrow(&assetVec, x);
            let full_amount = table::borrow(&vault.withdraw_table, asset_name);
            let asset = dof::borrow_mut<vector<u8>, Coin<CoinType>>(&mut vault.id, asset_name);
            let percentage = *vec_map::get(&vault.capPercentage, &cap.capID);
            let amount = *full_amount * (percentage as u64) / 100;
            let coin = coin::split(asset, amount, ctx);
            transfer::public_transfer(coin, ctx.sender());
            x = x + 1;
        }
    }

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

    public fun subscribeMonthly<CoinType>(service: &Service<CoinType>, mut coin: Coin<CoinType>, vault: &Vault, ctx: &mut TxContext) {
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

    public fun subscribeYearly<CoinType>(service: &Service<CoinType>, mut coin: Coin<CoinType>, vault: &Vault, ctx: &mut TxContext) {
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

    public fun deduct<CoinType>(service: &mut Service<CoinType>, cap: &mut DeductCap, vault: &mut Vault, asset_name: vector<u8>, ctx: &mut TxContext) {
        assert!(cap.deductDate < tx_context::epoch_timestamp_ms(ctx), EDeductDateNotPassed);
        assert!(object::id(vault) == cap.vaultId, EWrongVaultId);
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