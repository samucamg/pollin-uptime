export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "api_error",
    public type: string = "api_error",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class AuthenticationError extends ApiError {
  constructor(message: string = "Invalid authentication credentials") {
    super(message, 401, "invalid_api_key", "authentication_error");
    this.name = "AuthenticationError";
  }
}

export class RateLimitError extends ApiError {
  constructor(message: string = "Rate limit exceeded. Please retry later.") {
    super(message, 429, "rate_limit_exceeded", "rate_limit_error");
    this.name = "RateLimitError";
  }
}

export class ModelNotFoundError extends ApiError {
  constructor(model: string) {
    super(
      `Model '${model}' not found or unavailable`,
      404,
      "model_not_found",
      "invalid_request_error",
    );
    this.name = "ModelNotFoundError";
  }
}

export class ValidationError extends ApiError {
  constructor(
    message: string,
    public param?: string,
  ) {
    super(message, 400, "invalid_request", "invalid_request_error");
    this.name = "ValidationError";
  }
}

export class UpstreamError extends ApiError {
  constructor(message: string, statusCode: number = 502) {
    super(message, statusCode, "upstream_error", "api_error");
    this.name = "UpstreamError";
  }
}

export function toOpenAIError(err: unknown): {
  status: number;
  message: string;
  type: string;
  code?: string;
  param?: string;
} {
  if (err instanceof ApiError) {
    return {
      status: err.statusCode,
      message: err.message,
      type: err.type,
      code: err.code,
    };
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return {
    status: 500,
    message,
    type: "api_error",
    code: "internal_error",
  };
}

export function toAnthropicError(err: unknown): {
  status: number;
  type: string;
  message: string;
} {
  if (err instanceof AuthenticationError) {
    return { status: 401, type: "authentication_error", message: err.message };
  }
  if (err instanceof RateLimitError) {
    return { status: 429, type: "rate_limit_error", message: err.message };
  }
  if (err instanceof ValidationError || err instanceof ModelNotFoundError) {
    return { status: 400, type: "invalid_request_error", message: err.message };
  }
  const message = err instanceof Error ? err.message : "Internal server error";
  return { status: 500, type: "api_error", message };
}
