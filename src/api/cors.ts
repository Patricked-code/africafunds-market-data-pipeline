/** Resolve an explicitly allowed browser origin without reflecting untrusted origins. */
export function resolveCorsOrigin(origin: string | undefined, allowedOrigins: readonly string[]): string | undefined {
  if (allowedOrigins.includes('*')) return '*';
  return origin && allowedOrigins.includes(origin) ? origin : undefined;
}
