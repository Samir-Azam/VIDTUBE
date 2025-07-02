class ApiError extends Error {
  constructor(
    statusCode,
    message = "Something went wrong.",
    errors = [],
    stack = ""
  ) {
    super(message);
    this.data = null;
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.status = false;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

export { ApiError };
