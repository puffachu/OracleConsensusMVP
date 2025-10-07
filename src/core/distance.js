import { CONFIG } from '../config/constants.js';

/**
 * Calculates the Recursive Semantic Distance between two canonical objects.
 * This function accepts an SVA baseline for normalization.
 */
export function calculateDistance(objA, objB, currentPath = '', fieldBaselines = {}) {
    const typeA = typeof objA;
    const typeB = typeof objB;
    let distance = 0;

    if (typeA !== typeB || objA === null || objB === null) {
        return CONFIG.PENALTY_STRUCTURAL_MISMATCH;
    }


    if (typeA === 'number') {
        if (objA === objB) return 0;

        const diff = Math.abs(objA - objB);
        const mean = (objA + objB) / 2;

        if (mean === 0) {
            distance = (diff === 0) ? 0 : CONFIG.PENALTY_STRING_MISMATCH;
        } else {
            // Calculated the raw, un-normalized distance (this value could be too high without SVA)
            const rawDistance = CONFIG.PENALTY_NUMERIC_SCALER * (diff / mean);

            const baseline = fieldBaselines[currentPath] || 0;
            
            // Subtract the baseline volatility (SVA) from the raw distance.
            // This neutralizes the shared noise across the network.
            distance = Math.max(0, rawDistance - baseline);
        }
    }

    else if (typeA === 'string' || typeA === 'boolean') {
        if (objA !== objB) {
            // String fields (like 'symbol') are not normalized and get a full penalty. Need to be updated, refrenced to in readme.md
            distance = CONFIG.PENALTY_STRING_MISMATCH;
        }
    }
    // -
    else if (typeA === 'object') {
        const keysA = Object.keys(objA);
        const keysB = Object.keys(objB);

        // Check for structural mismatches (missing or extra keys)
        const allKeys = new Set([...keysA, ...keysB]);
        if (keysA.length !== keysB.length) {
             distance += (Math.abs(keysA.length - keysB.length) * CONFIG.PENALTY_STRUCTURAL_MISMATCH);
        }

        // Recursively check all shared keys
        for (const key of allKeys) {
            const nextPath = currentPath ? `${currentPath}.${key}` : key;
            const valA = objA[key];
            const valB = objB[key];

            if (valA === undefined || valB === undefined) {
                 distance += CONFIG.PENALTY_STRUCTURAL_MISMATCH;
            } else {
                distance += calculateDistance(valA, valB, nextPath, fieldBaselines);
            }
        }
    }

    return distance;
}
