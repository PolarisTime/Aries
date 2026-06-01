/** Mirrors backend ErrorCode enum. Single source of truth for API error code handling. */
export const ERROR_CODE = {
  SUCCESS: 0,
  VALIDATION_ERROR: 4000,
  UNAUTHORIZED: 4010,
  SESSION_EVICTED: 4011,
  REFRESH_TOKEN_REUSE_CONFLICT: 4091,
  FORBIDDEN: 4030,
  NOT_FOUND: 4040,
  BUSINESS_ERROR: 4220,
  INTERNAL_ERROR: 5000,
} as const
