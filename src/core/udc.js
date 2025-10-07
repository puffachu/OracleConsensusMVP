import { CONFIG, NodeResult } from '../config/constants.js';
import { median, collectFieldValues } from '../utils/helpers.js';
import { calculateDistance } from './distance.js';


let SVA_BASLINES = {};

// Calculates the Systemic Volatility Baseline (MPD) for every field.
function calculateSVABaselines(nodes) {
    const canonicalValues = nodes.map(n => n.canonicalValue);
    const fieldMap = collectFieldValues(canonicalValues);
    SVA_BASLINES = {};

    console.log(`\n--- Calculating Statistical Volatility Baselines (SVA) ---`);

    for (const path in fieldMap) {
        const pathValues = fieldMap[path].map(item => item.value);

        // Only calculate SVA for numeric fields, as strings must be exact match (full penalty).
        if (pathValues.length > 0 && typeof pathValues[0] === 'number') {
            const pairwiseFieldDistances = [];
            
            // 1. Calculate Pairwise Field Distance for this specific field
            for (let i = 0; i < pathValues.length; i++) {
                for (let j = i + 1; j < pathValues.length; j++) {
                    // Temporarily calculate the raw distance between two values
                    const tempDist = calculateDistance(pathValues[i], pathValues[j], '', {});
                    pairwiseFieldDistances.push(tempDist);
                }
            }
            
            // 2. The SVA Baseline is the Median Pairwise Distance (MPD) for this field
            // This represents the "normal" expected volatility across the network.
            SVA_BASLINES[path] = median(pairwiseFieldDistances);

            // If you uncomment the line below, you'll see the high baseline being calculated.
            // console.log(`Field: ${path.padEnd(25)} | SVA Baseline (MPD): ${SVA_BASLINES[path].toFixed(4)}`);
        }
    }
    console.log(`SVA Baselines calculated for ${Object.keys(SVA_BASLINES).length} numeric fields.`);
}

// RDS is the median of all pairwise distances, now using SVA normalized distance.

function calculateRobustDeviationScores(nodes) {
    // 1. Calculate Pairwise Distances (Distance Matrix)
    for (let i = 0; i < nodes.length; i++) {
        for (let j = 0; j < nodes.length; j++) {
            if (i !== j) {
                // Pass the SVA Baselines to calculateDistance for normalization
                const dist = calculateDistance(
                    nodes[i].canonicalValue, 
                    nodes[j].canonicalValue, 
                    '', 
                    SVA_BASLINES
                );
                nodes[i].pairwiseDistances.push(dist);
            }
        }
        // 2. Calculate RDS (Median of the distances)
        nodes[i].robustDeviationScore = median(nodes[i].pairwiseDistances);
    }
}

//Find the node with the lowest RDS, using latency as a tie-breaker.

function findBestFitCandidate(nodes) {
    if (nodes.length === 0) return null;

    let bestCandidate = null;

    for (const node of nodes) {
        if (!bestCandidate) {
            bestCandidate = node;
            continue;
        }

        // Prioritize lower RDS
        if (node.robustDeviationScore < bestCandidate.robustDeviationScore) {
            bestCandidate = node;
        }
        // Use latency as a tie-breaker (faster node wins if RDS is equal)
        else if (node.robustDeviationScore === bestCandidate.robustDeviationScore && node.latency < bestCandidate.latency) {
            bestCandidate = node;
        }
    }

    return bestCandidate;
}

// Performs the final consensus check against the Best Fit Candidate.

function finalConsensusCheck(nodes, bestCandidate) {
    if (!bestCandidate) return false;

    // Filter nodes that are 'agreeing' with the best candidate
    const agreeingNodes = nodes.filter(node => {
        // Calculate the normalized distance of *this* node's data from the *Best Fit Candidate's data*.
        const distanceToBestFit = calculateDistance(
            node.canonicalValue, 
            bestCandidate.canonicalValue, 
            '', 
            SVA_BASLINES
        );
        
        // Mark node as outlier if distance is too high
        if (distanceToBestFit > CONFIG.MAX_ACCEPTABLE_DISTANCE) {
            node.isOutlier = true;
        }

        // Only count nodes within the strict distance threshold
        return distanceToBestFit <= CONFIG.MAX_ACCEPTABLE_DISTANCE;
    });

    const agreementRatio = agreeingNodes.length / nodes.length;
    
    console.log(`\n--- Final Consensus Check ---`);
    console.log(`Total Valid Nodes: ${nodes.length}`);
    console.log(`Agreeing Nodes: ${agreeingNodes.length} (within Normalized Distance ${CONFIG.MAX_ACCEPTABLE_DISTANCE})`);
    console.log(`Agreement Ratio: ${agreementRatio.toFixed(2)} (${(agreementRatio * 100).toFixed(0)}%)`);
    console.log(`Required Ratio: ${CONFIG.CONSENSUS_THRESHOLD_PCT} (60%)`);
    
    return agreementRatio >= CONFIG.CONSENSUS_THRESHOLD_PCT;
}


export function runUniversalDeltaConsensus(processedNodes) {
    if (processedNodes.length === 0) {
        return { status: "FAILURE: No successful node responses.", result: null, bestCandidateId: null };
    }

    // 1. Calculate the SVA baselines to neutralize shared noise
    calculateSVABaselines(processedNodes);
    
    // 2. Calculate the Robust Deviation Score (RDS) for every node
    calculateRobustDeviationScores(processedNodes);
    
    // 3. Find the Best Fit Candidate
    const bestCandidate = findBestFitCandidate(processedNodes);

    if (!bestCandidate) {
        return { status: "FAILURE: Could not determine a Best Fit Candidate.", result: null, bestCandidateId: null };
    }

    // 4. Final Consensus Check
    const consensusAchieved = finalConsensusCheck(processedNodes, bestCandidate);

    if (consensusAchieved) {
        return {
            status: "SUCCESS: Consensus achieved and Best Fit selected.",
            result: bestCandidate.rawValue, 
            bestCandidateId: bestCandidate.id
        };
    } else {
        return {
            status: `FAILURE: Consensus vote below ${CONFIG.CONSENSUS_THRESHOLD_PCT * 100}% threshold.`,
            result: null,
            bestCandidateId: bestCandidate.id
        };
    }
}


export function printUDCResults(nodes) {
    console.log(`\n--- UDC Scoring Matrix (Total Valid Nodes: ${nodes.length}) ---`);
    
    const header = ['Node ID', 'Latency (ms)', 'RDS (Normalized Distance)', 'Is Outlier?'];
    console.log(header.join('\t| '));
    console.log('-'.repeat(80));

    // Sort by RDS for better visibility
    nodes.sort((a, b) => a.robustDeviationScore - b.robustDeviationScore).forEach(node => {
        console.log([
            node.id,
            node.latency.toFixed(0),
            node.robustDeviationScore.toFixed(4),
            node.isOutlier ? 'YES' : 'NO'
        ].join('\t| '));
    });
}
