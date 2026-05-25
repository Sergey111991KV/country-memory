/** Drops unused Pairloom memory-game keys from shared locale bundles. */
export function withoutLegacyMemoryKeys(
  messages: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(messages)) {
    if (!key.startsWith('memory.')) {
      out[key] = value;
    }
  }
  return out;
}
