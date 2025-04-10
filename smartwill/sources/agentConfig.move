module smartwill::agentConfig{
    
    use smartwill::vault::{Self, AICap};

    public struct AgentConfig has key, store {
        id: UID,
        vault_key: AICap,
        agent_name: vector<u8>,
        // agent ability boolean
    }
}