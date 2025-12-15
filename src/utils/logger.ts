/**
 * BareMCP — Structured Logger
 *
 * Provides consistent structured logging for debugging and diagnostics.
 * All output goes to stderr to avoid interfering with MCP protocol on stdout.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

interface LogContext {
  requestId?: string;
  storeId?: string;
  tool?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
}

/**
 * Check if debug mode is enabled
 */
function isDebugEnabled(): boolean {
  return process.env.DEBUG === "baremcp" || process.env.DEBUG === "*";
}

/**
 * Format a log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const { timestamp, level, message, context } = entry;
  const prefix = `[BareMCP] [${timestamp}] [${level.toUpperCase()}]`;

  if (context && Object.keys(context).length > 0) {
    const contextStr = Object.entries(context)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(" ");
    return `${prefix} ${message} ${contextStr}`;
  }

  return `${prefix} ${message}`;
}

/**
 * Create a log entry
 */
function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext
): LogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    context,
  };
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, context?: LogContext): void;
  info(message: string, context?: LogContext): void;
  warn(message: string, context?: LogContext): void;
  error(message: string, context?: LogContext): void;
  child(baseContext: LogContext): Logger;
}

/**
 * Logger instance
 */
export const logger: Logger = {
  /**
   * Debug-level log (only when DEBUG=baremcp)
   */
  debug(message: string, context?: LogContext): void {
    if (isDebugEnabled()) {
      const entry = createLogEntry("debug", message, context);
      console.error(formatLogEntry(entry));
    }
  },

  /**
   * Info-level log
   */
  info(message: string, context?: LogContext): void {
    const entry = createLogEntry("info", message, context);
    console.error(formatLogEntry(entry));
  },

  /**
   * Warning-level log
   */
  warn(message: string, context?: LogContext): void {
    const entry = createLogEntry("warn", message, context);
    console.error(formatLogEntry(entry));
  },

  /**
   * Error-level log
   */
  error(message: string, context?: LogContext): void {
    const entry = createLogEntry("error", message, context);
    console.error(formatLogEntry(entry));
  },

  /**
   * Create a child logger with preset context
   */
  child(baseContext: LogContext): Logger {
    return {
      debug: (message: string, context?: LogContext) =>
        logger.debug(message, { ...baseContext, ...context }),
      info: (message: string, context?: LogContext) =>
        logger.info(message, { ...baseContext, ...context }),
      warn: (message: string, context?: LogContext) =>
        logger.warn(message, { ...baseContext, ...context }),
      error: (message: string, context?: LogContext) =>
        logger.error(message, { ...baseContext, ...context }),
      child: (additionalContext: LogContext) =>
        logger.child({ ...baseContext, ...additionalContext }),
    };
  },
};

/**
 * Generate a unique request ID
 */
export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 8)}`;
}
