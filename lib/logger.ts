import * as fs from "fs";

type LogLevel = "INFO" | "WARN" | "ERROR" | "SECURITY";
type LogContext = Record<string, unknown>;
const LOG_LEVEL_WEIGHT: Record<LogLevel, number> = {
  INFO: 10,
  WARN: 20,
  ERROR: 30,
  SECURITY: 40,
};

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
const LOG_MIN_LEVEL_RAW = typeof process !== "undefined" ? process.env.LOG_MIN_LEVEL?.trim().toUpperCase() : "";
const LOG_MIN_LEVEL: LogLevel =
  LOG_MIN_LEVEL_RAW === "WARN" || LOG_MIN_LEVEL_RAW === "ERROR" || LOG_MIN_LEVEL_RAW === "SECURITY"
    ? LOG_MIN_LEVEL_RAW
    : "INFO";
const LOG_ONLY_PREFIXES =
  typeof process !== "undefined"
    ? (process.env.LOG_ONLY_PREFIXES ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
const LOG_SKIP_PREFIXES =
  typeof process !== "undefined"
    ? (process.env.LOG_SKIP_PREFIXES ?? "")
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean)
    : [];
let logFileStream: fs.WriteStream | null = null;
let logFileStreamDisabled = false;

function shouldWriteLog(level: LogLevel, message: string): boolean {
  if (LOG_LEVEL_WEIGHT[level] < LOG_LEVEL_WEIGHT[LOG_MIN_LEVEL]) {
    return false;
  }
  if (LOG_ONLY_PREFIXES.length > 0 && !LOG_ONLY_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return false;
  }
  if (LOG_SKIP_PREFIXES.some((prefix) => message.startsWith(prefix))) {
    return false;
  }
  return true;
}

function writeToLogFile(line: string): void {
  if (!LOG_FILE || logFileStreamDisabled) return;
  try {
    if (!logFileStream) {
      logFileStream = fs.createWriteStream(LOG_FILE, { flags: "a" });
      logFileStream.on("error", () => {
        logFileStreamDisabled = true;
        logFileStream = null;
      });
    }
    logFileStream.write(line);
  } catch {
    logFileStreamDisabled = true;
    logFileStream = null;
  }
}

function writeLog(level: LogLevel, message: string, context: LogContext): void {
  if (!shouldWriteLog(level, message)) return;
  const payload = { level, message, ...sanitizeContext(context), timestamp: new Date().toISOString() };
  const line = JSON.stringify(payload) + "\n";
  console.log(line.trim());
  writeToLogFile(line);
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
