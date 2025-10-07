export const N_NODES = 100;
export const MAX_LATENCY_MS = 1000;

export const CONFIG = {
    CONSENSUS_THRESHOLD_PCT: 0.60, // 60% required vote
    MAX_ACCEPTABLE_DISTANCE: 10.0, // Max RDS score a node can have to be considered 'agreeing'

    // Penalties for Recursive Semantic Distance Calculation
    PENALTY_STRING_MISMATCH: 1000,
    PENALTY_STRUCTURAL_MISMATCH: 5000,
    PENALTY_NUMERIC_SCALER: 100, // Multiplier for relative numeric difference
};

// Node data structure definition
export class NodeResult {
    constructor(id, rawValue, latency, canonicalValue) {
        this.id = id;
        this.rawValue = rawValue;
        this.latency = latency;
        this.canonicalValue = canonicalValue;
        this.pairwiseDistances = [];
        this.robustDeviationScore = 0;
        this.isOutlier = false;
    }
}
