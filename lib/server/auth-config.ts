export const AUTH_COOKIE_NAME = "fireline_session";
export const AUTH_SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000;

export type RegisterConfig = {
  allowSelfRegister: boolean;
  minPasswordLength: number;
  rateLimitMaxAttempts: number;
  rateLimitWindowMs: number;
  inviteCodes: string[];
  usernameAllowlist: string[];
};

function readBoolean(value: string | undefined, fallback: boolean) {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  return fallback;
}

function readPositiveInteger(value: string | undefined, fallback: number) {
  if (value === undefined) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function normalizeListValue(value: string) {
  return value.trim().toLowerCase();
}

function readNormalizedList(value: string | undefined) {
  return value?.split(",").map(normalizeListValue).filter(Boolean) || [];
}

export function getRegisterConfig(): RegisterConfig {
  return {
    allowSelfRegister: readBoolean(process.env.AI_QUALITY_AUTH_ALLOW_SELF_REGISTER, false),
    minPasswordLength: readPositiveInteger(
      process.env.AI_QUALITY_AUTH_REGISTER_MIN_PASSWORD_LENGTH,
      8
    ),
    rateLimitMaxAttempts: readPositiveInteger(
      process.env.AI_QUALITY_AUTH_REGISTER_RATE_LIMIT_MAX_ATTEMPTS,
      5
    ),
    rateLimitWindowMs: readPositiveInteger(
      process.env.AI_QUALITY_AUTH_REGISTER_RATE_LIMIT_WINDOW_MS,
      10 * 60 * 1000
    ),
    inviteCodes: readNormalizedList(process.env.AI_QUALITY_AUTH_REGISTER_INVITE_CODES),
    usernameAllowlist: readNormalizedList(process.env.AI_QUALITY_AUTH_REGISTER_USERNAME_ALLOWLIST),
  };
}
