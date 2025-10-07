# OracleConsensusMVP


This project outlines and simulates a core component of a decentralized oracle system: a **resilient data aggregation engine** capable of reaching consensus on any data type (prices, strings, complex JSON) without relying on hardcoded keys. This is only a MVP and there is a lot of room for improvement.
It operates autonomously—it requires no predefined schemas or manual blacklists. This flexibility allows it to adapt instantly to any JSON data structure, from financial market feeds to complex data.

---

## 💡 Core Principle: Adaptive and Liquid Consensus

The system achieves **"liquidity"** by abandoning type-specific aggregation (like averaging) in favor of **distance-based clustering**.

1. **Find the Center:** Calculate the difference between every single result.
2. **Identify the Best Fit:** Use the _Median Pairwise Distance (MPD)_ to select the result that sits most centrally among the majority of nodes.
3. **Confirm the Vote:** Verify that at least 60% of the network is clustered tightly around this "Best Fit" value.

---

## 💡 Core Innovation: Statistical Volatility Acceptance (SVA)
The SVA is the mathematical engine that solves the "noise problem"—a flaw that causes traditional consensus systems to fail when presented with real-world data containing fluctuating timestamps or unique identifiers.

### Why SVA Is Necessary
Fields like "generationtime" or unique transaction IDs are harmless, but they change on every node's fetch. Our powerful Scaled Relative Difference formula (which uses percentages for comparison) sees these tiny, near-zero values change frequently and calculates an artificially massive distance score. This common noise poisons the system, making the entire consensus cluster appear volatile, leading to consensus failure.

### SVA Mechanism:
#### 1. Measure Baseline Volatility: 
The system calculates the Median Pairwise Distance (MPDk) for every single numeric key (k) in the response across the entire network. This MPD establishes the "normal" systemic volatility (or noise level) for that field.

#### 2. Neutralize Shared Noise:
During the final score calculation, this MPDk is subtracted from the distance contributed by that field.

#### 3. Result:
This normalization neutralizes the shared, harmless distance, causing the net score contribution for that field to drop to zero. The Robust Deviation Score (RDS) then reflects only unique, non-systemic deviations—the true "odd ones out."

## 🛠️ Mechanism Overview

The aggregation process is divided into **three key phases**:

### 1. Pre-Processing & Canonicalization

- **Canonicalization:** All successful JSON API responses are recursively sorted by key and converted into a comparable structure.  
  _This prevents minor format changes (e.g., key order) from failing consensus._

---

### 2. Distance Scoring (Recursive Semantic Distance)

The difference between any two JSON objects (JSON A and JSON B) is calculated by traversing the structure and applying **weighted penalties** based on the field type.

| Field Type           | Distance Metric                                                                 | Rationale                                              | Penalty Weight |
|----------------------|----------------------------------------------------------------------------------|--------------------------------------------------------|----------------|
| String / Boolean     | Fixed Penalty (if mismatch)                                                     | Strict Consensus: Treats identifiers/statuses as critical. | 1000           |
| Numeric (Price, Temp)| Scaled Relative Difference (a percentage comparison)                        | Accepts minor legitimate deviation.                    | -              |
| Structural           | Fixed Penalty                                                                   | Critical Failure: Heavily penalizes schema tampering. | 5000           |

---

Uses Scaled Relative Difference (a percentage comparison). This penalizes a 10% price deviation far more heavily than a 0.01% market drift. The system is tuned to accept small, real-time volatility while rejecting major errors.

### 3. Outlier Defense & Final Vote

- **Robust Deviation Score (RDS):** For each node X, its deviation is calculated as the **median** of all its pairwise distances to every other node.

  - A single outlier’s large distance is ignored by the median calculation.
  - A legitimate node's RDS remains low, even if one node is malicious.

- **Best Fit Selection:** The node with the **lowest RDS** is chosen as the final result candidate.

- **Final Acceptance:** If **≥60%** of the successful nodes are within the `MAX_ACCEPTABLE_DISTANCE (10.0)` of the Best Fit Candidate, the result is accepted.

- **Tie-Breaker:** If multiple nodes tie for the lowest RDS, the **fastest-responding node (lowest latency)** is selected.

---

## ⚙️ Implementation Details

The MVP is implemented in **Node.js** to simulate the asynchronous fetch and aggregation logic.

### 🔧 Configuration Thresholds

| Setting                  | Value   | Rationale                                       |
|--------------------------|---------|-------------------------------------------------|
| `N_NODES`                | 100      | Simulated network size                          |
| `CONSENSUS_THRESHOLD_PCT`| 60%     | Required network agreement (6 out of 10 nodes)  |
| `MAX_ACCEPTABLE_DISTANCE`| 10.0    | Strict distance tolerance                       |

> This threshold enforces near-zero tolerance for string/structural mismatches and very low numeric volatility. it Could still be heavily improved.

---


## Known Limitation: Volatile String Consensus

The current implementation treats all string fields (e.g., symbol, status, hash, signature) under the Strict Consensus model.

- The Issue: If a data feed includes fields that are expected to be unique for every fetch (e.g., _hash, request_id, or signature), the system will correctly see 10 different unique strings and apply the massive 1000 penalty to every single pairwise distance.
- Result: The entire consensus fails because the RDS score for every node jumps to ≥1000, classifying all valid data as outliers, even though the core data is correct.

Future Implementation Note: This requires the system to implement Automatic String Volatility Filtering (ASVF) to identify fields where every node returns a globally unique string value.

---
## ▶️ Running the Simulation

### Configuration
The primary configuration is in src/data/mockApi.js:
```bash
const TEST_REAL_API = true; // Set to false to run the MOCK SCENARIO
const REAL_API_URL = ; // add your api
```
#### Execution

```bash
npm start
```

OR 

```bash
node runner.js
```
