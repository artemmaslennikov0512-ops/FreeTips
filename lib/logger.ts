type LogLevel = "INFO" | "WARN" | "ERROR" | "SECURITY";
type LogContext = Record<string, unknown>;

const REDACT_KEYS = new Set([
  "password",
  "passwordConfirm",
  "currentPassword",
  "newPassword",
  "newPasswordConfirm",
  "token",
  "accessToken",
  "refreshToken",
  "authorization",
  "cookie",
  "secret",
  "apiKey",
  "webhookSecret",
]);

function sanitizeContext(context: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    const lower = key.toLowerCase();
    const shouldRedact = REDACT_KEYS.has(lower) || lower.includes("password") || lower.includes("secret") || lower.includes("token");
    out[key] = shouldRedact && value != null ? "[REDACTED]" : value;
  }
  return out;
}

function normalizeError(error: unknown): LogContext {
  if (!(error instanceof Error)) return { error: "Unknown error" };
  return { name: error.name, message: error.message };
}

function writeLog(level: LogLevel, message: string, context: LogContext): void {
  const payload = { level, message, ...sanitizeContext(context), timestamp: new Date().toISOString() };
  console.log(JSON.stringify(payload));
}

export function logInfo(message: string, context: LogContext = {}): void {
  writeLog("INFO", message, context);
}

export function logWarn(message: string, context: LogContext = {}): void {
  writeLog("WARN", message, context);
}

export function logError(message: string, error: unknown, context: LogContext = {}): void {
  writeLog("ERROR", message, { ...context, ...normalizeError(error) });
}

export function logSecurity(message: string, context: LogContext = {}): void {
  writeLog("SECURITY", message, context);
}
