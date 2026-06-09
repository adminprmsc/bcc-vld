/** Recursively convert BigInt values to strings for JSON responses (matches legacy Sequelize behaviour). */
export function serializeBigInts<T>(value: T): T {
  if (typeof value === 'bigint') {
    return value.toString() as T;
  }
  if (Array.isArray(value)) {
    return value.map((item) => serializeBigInts(item)) as T;
  }
  if (value && typeof value === 'object') {
    if (value instanceof Date) {
      return value;
    }
    const output: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      output[key] = serializeBigInts(entry);
    }
    return output as T;
  }
  return value;
}
