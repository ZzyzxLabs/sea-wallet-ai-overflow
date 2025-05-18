// SPDX-License-Identifier: Apache-2.0

module willservice::will {
    use std::string::String;
    use sui::dynamic_field as df;

    const EInvalidCap: u64 = 0;
    const ENoAccess: u64 = 1;
    const MARKER: u64 = 2;

    public struct Service has key {
        id: UID,
        owner: address,
        name: String,
    }

    // Access NFT: possession grants access
    public struct AccessNFT has key {
        id: UID,
        service_id: ID,
    }

    public struct Cap has key {
        id: UID,
        service_id: ID,
    }

    //////////////////////////////////////////
    /////// Service creation and cap
    
    public fun create_service(name: String, ctx: &mut TxContext): Cap {
        let service = Service {
            id: object::new(ctx),
            owner: ctx.sender(),
            name,
        };
        let cap = Cap {
            id: object::new(ctx),
            service_id: object::id(&service),
        };
        transfer::share_object(service);
        cap
    }

    entry fun create_service_entry(name: String, ctx: &mut TxContext) {
        transfer::transfer(create_service(name, ctx), ctx.sender());
    }

    //////////////////////////////////////////
    /////// Granting access via NFT

    // Mint an AccessNFT to a user; only service owner (via cap) can call
    entry fun grant_access(recipient: address, service: &Service, cap: &Cap, ctx: &mut TxContext) {
        assert!(cap.service_id == object::id(service), EInvalidCap);
        let nft = AccessNFT {
            id: object::new(ctx),
            service_id: object::id(service),
        };
        transfer::transfer(nft, recipient);
    }

    //////////////////////////////////////////
    /////// Access control

    // Only holder of a valid AccessNFT can approve
    fun approve_internal(id: vector<u8>, nft: &AccessNFT, service: &Service): bool {
        // Check NFT matches service
        object::id(service) == nft.service_id
    }

    entry fun seal_approve(id: vector<u8>, nft: &AccessNFT, service: &Service) {
        assert!(approve_internal(id, nft, service), ENoAccess);
    }

    //////////////////////////////////////////
    /// Publishing content

    public fun publish(service: &mut Service, cap: &Cap, blob_id: String) {
        assert!(cap.service_id == object::id(service), EInvalidCap);
        df::add(&mut service.id, blob_id, MARKER);
    }

    #[test_only]
    public fun destroy_for_testing(ser: Service, nft: AccessNFT) {
        let Service { id, .. } = ser;
        object::delete(id);
        let AccessNFT { id, .. } = nft;
        object::delete(id);
    }
}