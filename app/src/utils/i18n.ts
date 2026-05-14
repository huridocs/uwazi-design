/** English-only translation shim. Signature mirrors Uwazi's `t(scope, key, fallback?)`
 *  so swapping in a real i18n backend later is one file. */
export function t(_scope: string, key: string, fallback?: string): string {
  return fallback ?? key;
}
