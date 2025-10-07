d
import { collectNodeResponses } from './src/data/mockApi.js';
import { runUniversalDeltaConsensus, printUDCResults } from './src/core/udc.js';


async function main() {
    console.log("==================================================");
    console.log(" Oracle Consesus MVP SIMULATION   ");
    console.log(" (Using Statistical Volatility Acceptance - SVA)  ");
    console.log("==================================================");
    
    // 1. Collect all node responses (handles mock or real API fetch)
    const validNodes = await collectNodeResponses();
    
    if (validNodes.length < 6) { 
        console.log("\n[FATAL] Insufficient number of successful nodes to proceed with consensus.");
        return;
    }

    // 2. Run the core UDC algorithm
    const finalResult = runUniversalDeltaConsensus(validNodes);

    // 3. Print analysis and results
    printUDCResults(validNodes);

    console.log(`\n==================================================`);
    console.log(`\nFINAL ORACLE RESULT: ${finalResult.status}`);
    
    if (finalResult.status.startsWith('SUCCESS')) {
        console.log(`\n➡️ Consensus Value (from Node ${finalResult.bestCandidateId}):`);
        console.log(JSON.stringify(finalResult.result, null, 2));
    } else {
        console.log(`\n❌ Consensus Failed.`);
        if (finalResult.bestCandidateId) {
            console.log(`Best Fit Candidate (Node ${finalResult.bestCandidateId}) was found, but failed the final vote.`);
        }
    }
    console.log(`\n==================================================`);
}

main().catch(console.error);
