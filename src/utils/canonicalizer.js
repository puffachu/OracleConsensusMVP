
// Sorts all keys deterministically to ensure comparison is fair.

export function canonicalize(obj) {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }
    if (Array.isArray(obj)) {
        return obj.map(canonicalize);
    }

    // Sort object keys alphabetically
    const keys = Object.keys(obj).sort();
    const canonical = {};
    for (const key of keys) {
        canonical[key] = canonicalize(obj[key]);
    }
    return canonical;
}
