import { N_NODES, MAX_LATENCY_MS, NodeResult } from '../config/constants.js';
import { canonicalize } from '../utils/canonicalizer.js';

// CONFIGURATION: Change this to test a real API ---
const TEST_REAL_API = false;
const REAL_API_URL = 'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,wind_speed_10m'; 

// Mock data
const BaseData = {
    price: 100.0000,
    symbol: "BTC",
    status: "OK",
    timestamp: Date.now(),
    volume: 1234567.89,
    metadata: {
        exchange: "GLOBAL",
        precision: 6
    }
};


async function fetchNodeData(nodeId) {
    const latency = Math.random() * MAX_LATENCY_MS;
    await new Promise(resolve => setTimeout(resolve, latency));


    // Node 1: Simulates a network error (returns null, will be filtered out)
    if (nodeId === 1) {
        console.log(`Node ${nodeId}: Network Timeout/Error.`);
        return null; 
    }

    // Node 2: Simulates a massive string error (BTC -> ETH) - High PENALTY_STRING_MISMATCH
    if (nodeId === 2) {
        console.log(`Node ${nodeId}: Critical String Mismatch (BTC -> ETH).`);
        const data = { ...BaseData, symbol: "ETH" };
        return new NodeResult(nodeId, data, latency, canonicalize(data));
    }

    // Node 3: Simulates a structural error (Missing 'volume' key) - High PENALTY_STRUCTURAL_MISMATCH
    if (nodeId === 3) {
        console.log(`Node ${nodeId}: Structural Mismatch (Missing volume key).`);
        const { volume, ...data } = BaseData;
        return new NodeResult(nodeId, data, latency, canonicalize(data));
    }
    
    // Node 4: Simulates acceptable volatility (small price drift)
    if (nodeId === 4) {
        console.log(`Node ${nodeId}: Acceptable Price Volatility (100.0010).`);
        const data = { ...BaseData, price: BaseData.price + 0.0010 };
        return new NodeResult(nodeId, data, latency, canonicalize(data));
    }

    // --- All Other Nodes: Valid Data with Minor Volatility/Latency Differences ---
    
    // Simulates a tiny, realistic price drift (e.g., a fraction of a cent)
    const drift = (Math.random() - 0.5) * 0.00005; 
    const data = { 
        ...BaseData, 
        price: BaseData.price + drift, 
        timestamp: BaseData.timestamp + Math.round(Math.random() * 10) 
    };

    return new NodeResult(nodeId, data, latency, canonicalize(data));
}


async function fetchRealApi(nodeId) {
    const start = Date.now();
    try {

        const response = await fetch(REAL_API_URL);
        if (!response.ok) {
            console.error(`Node ${nodeId}: HTTP Error ${response.status}`);
            return null;
        }
        const data = await response.json();
        const latency = Date.now() - start;
        // MUST return a NodeResult object containing the canonicalized data
        return new NodeResult(nodeId, data, latency, canonicalize(data));
    } catch (e) {
        console.error(`Node ${nodeId}: Fetch failed - ${e.message}`);
        return null;
    }
}


export async function collectNodeResponses() {
    console.log(`\n--- Starting Node Fetch (${TEST_REAL_API ? 'REAL API' : 'MOCK SCENARIO'}) ---`);
    const fetchPromises = [];
    for (let i = 1; i <= N_NODES; i++) {
        const fetchFunc = TEST_REAL_API ? fetchRealApi(i) : fetchNodeData(i);
        fetchPromises.push(fetchFunc);
    }

    const results = await Promise.all(fetchPromises);
    
    // Filter out null results (network errors, timeouts)
    const validNodes = results.filter(r => r !== null);
    
    if (validNodes.length < N_NODES) {
        console.log(`Ignored ${N_NODES - validNodes.length} node(s) due to error/timeout.`);
    }

    return validNodes;
}
