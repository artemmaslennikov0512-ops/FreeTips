import * as fs from "fs";

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
  "payginePassword",
  "paygineSector",
  "paygine_password",
  "paygine_sector",
  "sector",
  "pan",
  "cvc",
]);

function sanitizeContext(context: LogContext): LogContext {
  const out: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    const lower = key.toLowerCase();
    const shouldRedact =
      REDACT_KEYS.has(lower) ||
      lower.includes("password") ||
      lower.includes("secret") ||
      lower.includes("token") ||
      lower.includes("paygine");
    out[key] = shouldRedact && value != null ? "[REDACTED]" : value;
  }
  return out;
}

function normalizeError(error: unknown): LogContext {
  if (!(error instanceof Error)) return { error: "Unknown error" };
  return { name: error.name, message: error.message };
}

const LOG_FILE = typeof process !== "undefined" ? process.env.LOG_FILE?.trim() : undefined;

function writeLog(level: LogLevel, message: string, context: LogContext): void {
  const payload = { level, message, ...sanitizeContext(context), timestamp: new Date().toISOString() };
  const line = JSON.stringify(payload) + "\n";
  console.log(line.trim());
  if (LOG_FILE) {
    try {
      fs.appendFileSync(LOG_FILE, line);
    } catch {
      // ignore (e.g. permission, disk)
    }
  }
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
