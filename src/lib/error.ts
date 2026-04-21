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
  console.error(`[Error]${context ? ` in ${context}` : ''}:`, error);

  let message = 'An unexpected error occurred';
  let code = 'SYSTEM_ERROR';

  if (error instanceof AppError) {
    message = error.message;
    code = error.code;
  } else if (error instanceof Error) {
    message = error.message;
  } else if (typeof error === 'string') {
    message = error;
  }

  // Toast the error to the user
  toast.error(context ? `${context}: ${message}` : message);

  // Here you could also send the error to a monitoring service (Sentry, etc.)
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
