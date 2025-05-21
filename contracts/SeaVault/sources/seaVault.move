module SeaWallet::seaVault {
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
    use SeaWallet::subscription::{Service, Receipt, create_receipt, get_service_price};
    use SeaWallet::subscription;
    
    const EChargeDateNotPassed: u64 = 0;
    const EWrongVaultId: u64 = 1;
    const EWrongServiceId: u64 = 2;
    const ELocked: u64 = 4;
    const ENotYourVault: u64 = 5;
    const ECapNotFound: u64 = 6;
    const ETotalPercentageNot100: u64 = 7;
    const ENotEnough: u64 = 8; // Error code for insufficient amount
    const EAlreadyWithdrawn: u64 = 9;

    const TWO_MINUTES: u64 = 2 * 60 * 1000;
    const SIX_MONTHS: u64 = 6 * 30 * 24 * 60 * 60 * 1000;
    const SEVEN_DAYS: u64 = 7 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS: u64 = 30 * 24 * 60 * 60 * 1000;
    const THREE_SIX_FIVE_DAYS: u64 = 365 * 24 * 60 * 60 * 1000;

    public struct SeaVault has key {
        id: UID, // vault ID
        last_update: u64, // last update time
        time_left: u64, // time left till inherit
        is_warned: bool, // is warned for inactivity
        cap_percentage: VecMap<u8, u8>, // capID: percentage
        cap_activated: VecMap<u8, bool>, // capID: isActivated
        asset_sum: Table<String, u64>, // asset_name: amount
        asset_withdrawn: Table<String, vector<u8>>// asset_name: withdrawn capIDs
    }
    
    public struct OwnerCap has key, store {
        id: UID,
        vaultID: ID
    }

    public struct MemberCap has key, store {
        id: UID,
        vaultID: ID,
        capID: u8,
        withdrawn_count: u8,
    }

    public struct ChargeCap has key, store {
        id: UID,
        vaultID: ID,
        serviceID: ID,
        charge_date: u64,
        is_year: bool,
        subscriber: address,
    }

    /// create a new SeaVault
    #[allow(lint(self_transfer))]
    public fun create_vault(ctx: &mut TxContext) {
        let vault = SeaVault {
            id: object::new(ctx),
            last_update: tx_context::epoch_timestamp_ms(ctx),
            time_left: TWO_MINUTES,
            is_warned: false,
            cap_percentage: vec_map::empty<u8, u8>(),
            cap_activated: vec_map::empty<u8, bool>(),
            asset_sum: table::new<String, u64>(ctx),
            asset_withdrawn: table::new<String, vector<u8>>(ctx),
        };
        let ownerCap = OwnerCap {
            id: object::new(ctx),
            vaultID: object::id(&vault),
        };
        transfer::share_object(vault);
        transfer::public_transfer(ownerCap, ctx.sender());
    }

    /// add multiple members by addresses vector
    public fun add_member_by_addresses(cap: &OwnerCap, vault: &mut SeaVault, address_list: vector<address>, percentage_list: vector<u8>, ctx: &mut TxContext) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        let mut i = 0;
        let mut capCount = (vault.cap_percentage.size() as u8);
        while (i < address_list.length()) {
            let addrCap = MemberCap {
                id: object::new(ctx),
                vaultID: object::id(vault),
                capID: capCount,
                withdrawn_count: 0,
            };
            
            transfer::public_transfer(addrCap, address_list[i]);
            vault.cap_percentage.insert(capCount, percentage_list[i]);
            vault.cap_activated.insert(capCount, true);

            capCount = capCount + 1;
            i = i + 1;
        };
    }

    /// add single member by an email string
    public fun add_member_by_email(cap: &OwnerCap, vault: &mut SeaVault, _email: String, percentage: u8, ctx: &mut TxContext): MemberCap {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        let capCount = (vault.cap_percentage.size() as u8);
        let emailCap = MemberCap {
            id: object::new(ctx),
            vaultID: object::id(vault),
            capID: capCount,
            withdrawn_count: 0,
        };
        vault.cap_percentage.insert(capCount, percentage);
        vault.cap_activated.insert(capCount, true);
        emailCap
    }

    /// modify percentage and activated status of a cap
    public fun modify_member_cap(cap: &OwnerCap, vault: &mut SeaVault, capID: u8, percentage: u8, activated: bool) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        assert!(vec_map::contains(&vault.cap_percentage, &capID), ECapNotFound);
        let capPercentage_mut = vec_map::get_mut(&mut vault.cap_percentage, &capID);
        *capPercentage_mut = percentage;
        let capActivated_mut = vec_map::get_mut(&mut vault.cap_activated, &capID);
        *capActivated_mut = activated;
    }

    /// check if the total percentage of all caps is 100
    /// call everytime modifying caps percentage
    public fun check_percentage(cap: &OwnerCap, vault: &mut SeaVault) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        let mut i: u8 = 0;
        let length = vault.cap_percentage.size() as u8;
        let mut totalPercentage = 0;
        while (i < length) {
            let percentage = *vec_map::get(&vault.cap_percentage, &i);
            totalPercentage = totalPercentage + percentage;
            i = i + 1;
        };
        assert!(totalPercentage == 100, ETotalPercentageNot100);
    }

    /// add non-coin asset to vault
    public fun add_asset<Asset: key + store>(cap: &OwnerCap, vault: &mut SeaVault, asset: Asset, name: String, _ctx: &mut TxContext) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        dof::add(&mut vault.id, name, asset);
    }

    /// add coin asset to vault (when the coinType isn't added before)
    public fun add_coin<Asset>(cap: &OwnerCap, vault: &mut SeaVault, asset_name: String, asset: Coin<Asset>) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        // update table amount
        let amount = coin::value<Asset>(&asset);
        table::add(&mut vault.asset_sum, asset_name, amount);
        table::add(&mut vault.asset_withdrawn, asset_name, vector::empty<u8>());

        // add coin to vault
        dof::add(&mut vault.id, asset_name, asset);
    }

    /// add more coin asset to vault (when the coinType is already added before)
    public fun organize_coin<Asset>(cap: &OwnerCap, vault: &mut SeaVault, asset_name: String, asset: Coin<Asset>) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        // update table amount
        let added_amount = coin::value<Asset>(&asset);
        let amount_mut = table::borrow_mut<String, u64>(&mut vault.asset_sum, asset_name);
        *amount_mut = *amount_mut + added_amount;

        // add coin to vault
        let coin_from_vault = dof::borrow_mut<String, Coin<Asset>>(&mut vault.id, asset_name);
        coin::join<Asset>(coin_from_vault, asset);
    }

    /// for owner to take a certain amount of coin
    #[allow(lint(self_transfer))]
    public fun take_coin<CoinType>(cap: &OwnerCap, vault: &mut SeaVault, asset_name: String, amount: u64, ctx: &mut TxContext) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        assert!(amount <= *table::borrow(&vault.asset_sum, asset_name), ENotEnough);
        // update table amount
        let amount_mut = table::borrow_mut<String, u64>(&mut vault.asset_sum, asset_name);
        *amount_mut = *amount_mut - amount;

        // take coin from vault
        let coin_from_vault = dof::borrow_mut<String, Coin<CoinType>>(&mut vault.id, asset_name);
        let coin = coin::split(coin_from_vault, amount, ctx);
        transfer::public_transfer(coin, ctx.sender());
    }

    /// for owner to reclaim asset (NFT or all coins at once)
    public fun reclaim_asset<Asset: key + store>(cap: &OwnerCap, vault: &mut SeaVault, asset_name: String, ctx: &mut TxContext) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        // remove from table
        if(vault.asset_sum.contains(asset_name)) {
            table::remove(&mut vault.asset_sum, asset_name);
        };

        // remove from vault
        let asset = dof::remove<String, Asset>(&mut vault.id, asset_name);
        transfer::public_transfer(asset, ctx.sender());
    }

    /// update the last update time
    /// if the vault is warned, reset the time left to 6 months, and set is_warned to false
    public fun update_time(cap: &OwnerCap, vault: &mut SeaVault, clock: &Clock) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        vault.last_update = clock.timestamp_ms();
        if (vault.is_warned) {
            vault.time_left = TWO_MINUTES;
            vault.is_warned = false;
        }
    }

    /// for member to withdraw their share of asset, withdraw one coinType at a time
    #[allow(lint(self_transfer))]
    public fun member_withdraw<CoinType>(
        cap: &mut MemberCap,
        vault: &mut SeaVault,

        clock: &Clock,
        asset_name: String,
        ctx: &mut TxContext
    ) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        // check if the vault is locked
        let current_time = clock.timestamp_ms();
        assert!(current_time - vault.last_update >= vault.time_left, ELocked);
        if (!vault.is_warned) {
            return grace_period(cap, vault, clock) // do not add a fucking semicolon here
        };

        // check if the member has already withdrawn
        let withdrawn_list = table::borrow_mut(&mut vault.asset_withdrawn, asset_name);
        assert!(!vector::contains(withdrawn_list, &cap.capID), EAlreadyWithdrawn);
        vector::push_back(withdrawn_list, cap.capID);
        cap.withdrawn_count = cap.withdrawn_count + 1;

        // calculate the amount to withdraw
        let full_amount = *table::borrow(&vault.asset_sum, asset_name);
        let percentage = *vec_map::get(&vault.cap_percentage, &cap.capID) as u64;
        let amount = full_amount * percentage / 100;
        
        // transfer the asset
        let asset = dof::borrow_mut<String, Coin<CoinType>>(&mut vault.id, asset_name);
        let coin = coin::split(asset, amount, ctx);
        transfer::public_transfer(coin, ctx.sender());
    }

    /// grace period - 7 days grace period for owner to confirm their aliveness
    fun grace_period(cap: &MemberCap, vault: &mut SeaVault, clock: &Clock) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);
        vault.last_update = clock.timestamp_ms();
        vault.time_left = TWO_MINUTES;
        vault.is_warned = true;
    }

    /// getter functions
    public(package) fun get_vaultID(vault: &SeaVault): ID {
        object::id(vault)
    }

    /// for owner to use vault to pay (can only be used within seaVault)
    /// coin need to be processed within the vault
    public(package) fun sea_pay<CoinType>(vault: &mut SeaVault, asset_name: String, amount: u64, ctx: &mut TxContext) : Coin<CoinType> {
        assert!(amount <= *table::borrow(&vault.asset_sum, asset_name), ENotEnough);
        // update table amount
        let amount_mut = table::borrow_mut<String, u64>(&mut vault.asset_sum, asset_name);
        *amount_mut = *amount_mut - amount;

        // pay from vault
        let coin_from_vault = dof::borrow_mut<String, Coin<CoinType>>(&mut vault.id, asset_name);
        coin::split(coin_from_vault, amount, ctx)
    }

    /// subscribe to a service
    #[allow(lint(self_transfer))]
    public fun subscribe<CoinType>(cap: &OwnerCap, vault: &mut SeaVault, service: &Service<CoinType>, is_year: bool, ctx: &mut TxContext) {
        assert!(cap.vaultID == object::id(vault), ENotYourVault);

        // pay frist month or first year
        let mut payment_amount = service.get_service_price();
        let mut next_date: u64 = ctx.epoch_timestamp_ms();
        if (is_year) {
            payment_amount = payment_amount * 12 * (service.get_yearly_discount() as u64) / 100;
            next_date = next_date + THREE_SIX_FIVE_DAYS;
        } else {
            next_date = next_date + THIRTY_DAYS;
        };
        let payment: Coin<CoinType> = sea_pay(vault, service.get_service_asset_name(), payment_amount, ctx);
        transfer::public_transfer(payment, service.get_service_owner());

        // create ChargeCap for service owner
        let chargeCap = ChargeCap {
            id: object::new(ctx),
            vaultID: object::id(vault),
            serviceID: object::id(service),
            charge_date: next_date,
            is_year: is_year,
            subscriber: ctx.sender(),
        };
        transfer::public_transfer(chargeCap, service.get_service_owner());

        // create Receipt for user
        let receipt: Receipt<CoinType> = subscription::create_receipt(service, payment_amount, next_date, ctx);
        transfer::public_transfer(receipt, ctx.sender());
    }

    /// for service owner to charge fee
    public fun charge_fee<CoinType>(chargeCap: &mut ChargeCap, vault: &mut SeaVault, service: & Service<CoinType>, ctx: &mut TxContext) {
        assert!(ctx.epoch_timestamp_ms() > chargeCap.charge_date, EChargeDateNotPassed);
        assert!(chargeCap.vaultID == object::id(vault), ENotYourVault);
        assert!(chargeCap.serviceID == object::id(service), EWrongServiceId);

        let mut payment_amount = service.get_service_price();
        if (chargeCap.is_year) {
            payment_amount = payment_amount * 12 * (service.get_yearly_discount() as u64) / 100;
            chargeCap.charge_date = chargeCap.charge_date + THREE_SIX_FIVE_DAYS;
        } else {
            chargeCap.charge_date = chargeCap.charge_date + THIRTY_DAYS;
        };

        let payment: Coin<CoinType> = sea_pay(vault, service.get_service_asset_name(), payment_amount,ctx);
        transfer::public_transfer(payment, service.get_service_owner());
        
        let receipt: Receipt<CoinType> = subscription::create_receipt(service, service.get_service_price(), chargeCap.charge_date, ctx);
        transfer::public_transfer(receipt, chargeCap.subscriber);
    }

}