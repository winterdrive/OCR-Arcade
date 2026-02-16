// Structured Logger
// Implements comprehensive logging system with structured format
// Supports performance monitoring, error tracking, and structured logging

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  component: string;
  message: string;
  data?: any;
  duration?: number;
  error?: Error;
}

export interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  maxStorageEntries: number;
  componentFilters: string[];
}

/**
 * Structured Logger
 * 
 * Provides structured logging with console output format,
 * performance tracking, and error handling with recovery mechanisms.
 */
export class Logger {
  private config: LoggerConfig;
  private logEntries: LogEntry[] = [];
  private componentStats: Map<string, { count: number; totalTime: number; errors: number }> = new Map();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: true,
      enableStorage: true,
      maxStorageEntries: 1000,
      componentFilters: [],
      ...config
    };

  }

  /**
   * Log debug message
   */
  debug(component: string, message: string, data?: any): void {
    this.log('debug', component, message, data);
  }

  /**
   * Log info message
   */
  info(component: string, message: string, data?: any): void {
    this.log('info', component, message, data);
  }

  /**
   * Log warning message
   */
  warn(component: string, message: string, data?: any): void {
    this.log('warn', component, message, data);
  }

  /**
   * Log error message
   */
  error(component: string, message: string, error?: Error, data?: any): void {
    this.log('error', component, message, data, undefined, error);
  }

  /**
   * Log success message with checkmark
   */
  success(component: string, message: string, duration?: number, data?: any): void {
    const formattedMessage = `✓ ${message}${duration ? ` in ${Math.round(duration)}ms` : ''}`;
    this.log('info', component, formattedMessage, data, duration);
  }

  /**
   * Log failure message with cross
   */
  failure(component: string, message: string, error?: Error, data?: any): void {
    const formattedMessage = `✗ ${message}`;
    this.log('error', component, formattedMessage, data, undefined, error);
  }

  /**
   * Log warning message with warning symbol
   */
  warning(component: string, message: string, data?: any): void {
    const formattedMessage = `⚠ ${message}`;
    this.log('warn', component, formattedMessage, data);
  }

  /**
   * Start performance timing for a component operation
   */
  startTiming(component: string, operation: string): () => void {
    const startTime = performance.now();

    return () => {
      const duration = performance.now() - startTime;
      this.success(component, `${operation} completed`, duration);
      this.updateComponentStats(component, duration, false);
      return duration;
    };
  }

  /**
   * Time an async operation
   */
  async timeAsync<T>(
    component: string,
    operation: string,
    fn: () => Promise<T>
  ): Promise<{ result: T; duration: number }> {
    const startTime = performance.now();

    try {
      const result = await fn();
      const duration = performance.now() - startTime;

      this.success(component, operation, duration);
      this.updateComponentStats(component, duration, false);

      return { result, duration };
    } catch (error) {
      const duration = performance.now() - startTime;

      this.failure(component, `${operation} failed`, error as Error);
      this.updateComponentStats(component, duration, true);

      throw error;
    }
  }

  /**
   * Log OCR processing completion
   */
  logOCRCompletion(
    component: string,
    totalTime: number,
    executionProvider: string,
    _tesseractAccepted: number,
    totalRegions: number
  ): void {
    const message = `Recognition completed in ${Math.round(totalTime)}ms (${executionProvider}/Tesseract) - ${totalRegions} regions`;
    this.info(component, message);
  }

  /**
   * Log text classification
   */
  logTextClassification(
    component: string,
    latinOnly: number,
    mixed: number,
    cjkOnly: number
  ): void {
    const message = `Row classification: ${latinOnly} latin_only, ${mixed} mixed, ${cjkOnly} cjk_only`;
    this.info(component, message);
  }

  /**
   * Log Tesseract processing statistics
   */
  logTesseractStats(
    component: string,
    eligible: number,
    accepted: number,
    rejected: number,
    rejectionReasons: string[]
  ): void {
    this.info(component, `Tesseract eligible boxes: ${eligible}`);
    this.info(component, `Tesseract processing: ${accepted} accepted, ${rejected} rejected`);

    // Log rejection reasons if any
    rejectionReasons.forEach(reason => {
      this.debug(component, `Tesseract rejection: ${reason}`);
    });
  }

  /**
   * Log model loading with expected vs actual time comparison
   */
  logModelLoading(
    component: string,
    modelName: string,
    actualTime: number,
    expectedTime?: number
  ): void {
    const message = `${modelName} model loaded`;

    if (expectedTime && actualTime > expectedTime * 1.2) {
      this.warning(component, `${message} in ${Math.round(actualTime)}ms (expected ~${expectedTime}ms)`);
    } else {
      this.success(component, message, actualTime);
    }
  }

  /**
   * Log WebGPU status and fallback information
   */
  logWebGPUStatus(component: string, available: boolean, provider: string, error?: string): void {
    if (available) {
      this.success(component, `WebGPU execution provider selected`);
    } else {
      this.warning(component, `WebGPU unavailable${error ? ` (${error})` : ''}, using ${provider.toUpperCase()} fallback`);
    }
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    component: string,
    message: string,
    data?: any,
    duration?: number,
    error?: Error
  ): void {
    // Check if logging is enabled for this level
    if (!this.shouldLog(level)) {
      return;
    }

    // Check component filters
    if (this.config.componentFilters.length > 0 &&
      !this.config.componentFilters.includes(component)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      message,
      data,
      duration,
      error
    };

    // Store entry if storage is enabled
    if (this.config.enableStorage) {
      this.storeLogEntry(entry);
    }

    // Console output if enabled
    if (this.config.enableConsole) {
      this.outputToConsole(entry);
    }
  }

  /**
   * Check if logging should occur for this level
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const messageLevelIndex = levels.indexOf(level);

    return messageLevelIndex >= currentLevelIndex;
  }

  /**
   * Store log entry with rotation
   */
  private storeLogEntry(entry: LogEntry): void {
    this.logEntries.push(entry);

    // Rotate logs if exceeding max entries
    if (this.logEntries.length > this.config.maxStorageEntries) {
      this.logEntries = this.logEntries.slice(-this.config.maxStorageEntries);
    }
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    void entry;
  }

  /**
   * Update component statistics
   */
  private updateComponentStats(component: string, duration: number, isError: boolean): void {
    const stats = this.componentStats.get(component) || { count: 0, totalTime: 0, errors: 0 };

    stats.count++;
    stats.totalTime += duration;
    if (isError) {
      stats.errors++;
    }

    this.componentStats.set(component, stats);
  }

  /**
   * Get component performance statistics
   */
  getComponentStats(component?: string): Map<string, { count: number; totalTime: number; errors: number; averageTime: number }> {
    const result = new Map();

    if (component) {
      const stats = this.componentStats.get(component);
      if (stats) {
        result.set(component, {
          ...stats,
          averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0
        });
      }
    } else {
      const entries = Array.from(this.componentStats.entries());
      for (const [comp, stats] of entries) {
        result.set(comp, {
          ...stats,
          averageTime: stats.count > 0 ? stats.totalTime / stats.count : 0
        });
      }
    }

    return result;
  }

  /**
   * Get recent log entries
   */
  getRecentLogs(count: number = 50, level?: LogLevel, component?: string): LogEntry[] {
    let filtered = this.logEntries;

    if (level) {
      filtered = filtered.filter(entry => entry.level === level);
    }

    if (component) {
      filtered = filtered.filter(entry => entry.component === component);
    }

    return filtered.slice(-count);
  }

  /**
   * Export logs as JSON
   */
  exportLogs(): string {
    return JSON.stringify({
      config: this.config,
      entries: this.logEntries,
      stats: Object.fromEntries(this.componentStats),
      exportTime: Date.now()
    }, null, 2);
  }

  /**
   * Clear all stored logs
   */
  clearLogs(): void {
    this.logEntries = [];
    this.componentStats.clear();
  }

  /**
   * Update logger configuration
   */
  updateConfig(newConfig: Partial<LoggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Global logger instance
export const logger = new Logger();
