import { z } from 'zod';

// z.coerce.boolean() is unsafe for environment variables: Boolean("false")
// evaluates to true. Never start financial source collection implicitly.
export const schedulerEnabledSchema = z.preprocess((value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return value;
  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) return true;
  if (['false', '0', 'no', 'off'].includes(normalized)) return false;
  return value;
}, z.boolean()).default(false);
