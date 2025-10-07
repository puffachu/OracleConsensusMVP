
export function median(arr) {
    if (!arr || arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);

    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

/**
 * Recursively collects all numeric and string values for every unique field path 
 * across all canonical JSON objects. Used for SVA baseline calculation.
 */
export function collectFieldValues(canonicalValues) {
    const fieldMap = {};

    function traverse(obj, path, nodeIndex) {
        if (typeof obj !== 'object' || obj === null) {
            const currentPath = path.substring(1); // remove leading dot
            if (!fieldMap[currentPath]) {
                fieldMap[currentPath] = [];
            }
            // Store the index of the node and the value for SVA analysis
            fieldMap[currentPath].push({ index: nodeIndex, value: obj });
            return;
        }

        const keys = Object.keys(obj);
        for (const key of keys) {
            traverse(obj[key], path + '.' + key, nodeIndex);
        }
    }

    canonicalValues.forEach((value, index) => traverse(value, '', index));
    return fieldMap;
}
