/**
 * @desc Custom application error class that extends the built-in Error class.
 * It is used to pass operational errors with specific HTTP status codes.
 */
export class AppError extends Error {
  /**
   * @param {string} message - The error message.
   * @param {number} statusCode - The HTTP status code (e.g., 400, 403, 404).
   */
  constructor(message, statusCode) {
    // Call the parent constructor (Error) with the error message
    super(message);

    // Assign the HTTP status code
    this.statusCode = statusCode;
    
    // Determine the status based on the status code (e.g., 'fail' for 4xx, 'error' for 5xx)
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    
    // Mark as an operational error (trusted error that we can send to the client)
    this.isOperational = true;

    // Capture the stack trace, omitting the constructor call from the trace
    if (Error.captureStackTrace) {
        Error.captureStackTrace(this, this.constructor);
    } else {
        // Fallback for environments without captureStackTrace
        this.name = this.constructor.name;
    }
  }
}

// Note: No need for module.exports if using ES6 'import/export' syntax