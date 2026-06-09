"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.serializeBigInts = serializeBigInts;
function serializeBigInts(value) {
    if (typeof value === 'bigint') {
        return value.toString();
    }
    if (Array.isArray(value)) {
        return value.map((item) => serializeBigInts(item));
    }
    if (value && typeof value === 'object') {
        if (value instanceof Date) {
            return value;
        }
        const output = {};
        for (const [key, entry] of Object.entries(value)) {
            output[key] = serializeBigInts(entry);
        }
        return output;
    }
    return value;
}
//# sourceMappingURL=serialization.js.map