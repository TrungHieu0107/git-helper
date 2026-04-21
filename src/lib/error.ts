import { toast } from './toast';

export class AppError extends Error {
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', isOperational: boolean = true) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

/**
 * Centralized error handler for the application.
 * Logs the error and notifies the user via toast.
 */
export function handleError(error: unknown, context?: string) {
  // Ignore harmless cancellation errors from Monaco/loader
  if (error && typeof error === 'object' && (error as any).type === 'cancelation') {
    return;
  }

  // Always log to console first
  console.error(`[Error]${context ? ` in ${context}` : ''}:`, error);

  let message = 'An unexpected error occurred';
  
  if (error instanceof AppError) {
    message = error.message;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Safely attempt to toast, but don't crash if toast/store is not ready
  try {
    toast.error(context ? `${context}: ${message}` : message);
  } catch (e) {
    console.warn("Failed to show error toast (store might not be ready yet):", e);
  }
}

/**
 * Setup global event listeners for unhandled errors
 */
export function setupGlobalErrorHandlers() {
  window.addEventListener('error', (event) => {
    handleError(event.error, 'Uncaught Exception');
  });

  window.addEventListener('unhandledrejection', (event) => {
    handleError(event.reason, 'Unhandled Promise Rejection');
  });
}
