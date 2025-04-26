module smartwill::dao {
    use sui::vec_set::{Self, VecSet};
    use std::string::{Self, String};

    const EwrongBallot: u64 = 1;

    public struct DAO_ME has drop {} //one-time witness

    public struct Dao has key {
        id: UID,
        member: VecSet<address>,
    }

    public struct WillerCap has key {
        id: UID
    }

    public struct  Ballot has key {
        id: UID,
        proposal_id: ID
    }

    public struct TicketBox has key {
        id: UID,
        threshold: u16,
        approve_count: u16,
        reject_count: u16,
    }

    fun init(_otw: DAO_ME, ctx: &mut TxContext) {
        let dao = Dao {
            id: object::new(ctx),
            member: vec_set::empty<address>()
        };
        let willerCap = WillerCap {
            id: object::new(ctx)
        };
        transfer::share_object(dao);
        transfer::transfer(willerCap, ctx.sender());
        }
    public fun add_member(cap: &WillerCap, dao: &mut Dao, memberAdd: address, ctx: &mut TxContext) {
        vec_set::insert<address>(&mut dao.member, memberAdd);
    }

    public fun remove_member(cap: &WillerCap, dao: &mut Dao, memberRemove: &address, ctx: &mut TxContext) {
        vec_set::remove<address>(&mut dao.member, memberRemove);
    }

    public fun create_Vote(cap: &WillerCap, dao: &mut Dao, threshold: u16, ctx: &mut TxContext) {
        let ticketBox = TicketBox {
            id: object::new(ctx),
            threshold: threshold,
            approve_count: 0,
            reject_count: 0,

        };
        let v_address = vec_set::keys<address>(&dao.member);
        let mut x = 0;
        while(x < vec_set::size(&dao.member)){
            let receipent = v_address[x];
            let ballot = Ballot {
                id: object::new(ctx),
                proposal_id: object::id(&ticketBox)
            };
            transfer::transfer(ballot, receipent);
            x = x + 1;
        };
        transfer::share_object(ticketBox);
    }

    public fun vote_approve(ballot: Ballot, ticketBox: &mut TicketBox, ctx: &mut TxContext) {
        assert!(ballot.proposal_id == object::id(ticketBox), EwrongBallot);
        let Ballot { id, proposal_id: _ } = ballot;
        object::delete(id);
        ticketBox.approve_count = ticketBox.approve_count + 1;
    }

    public fun vote_reject(ballot: Ballot, ticketBox: &mut TicketBox, ctx: &mut TxContext) {
        assert!(ballot.proposal_id == object::id(ticketBox), EwrongBallot);
        let Ballot { id, proposal_id: _ } = ballot;
        object::delete(id);
        ticketBox.reject_count = ticketBox.reject_count + 1;
    }
}

