module contract::agentConfig{
    
    use contract::vault::{Self, AImanagercap};

    public struct AgentConfig has key, store {
        id: UID,
        vault_key: AImanagercap,
        agent_name: vector<u8>,
        // agent ability boolean
    }
}