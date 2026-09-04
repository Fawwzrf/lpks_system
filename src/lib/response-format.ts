/**
 * Modul Format Payload Standar API SDLC LPKS Sumbu Hidup
 * Pure functions untuk enkapsulasi respon JSON konsisten
 */

export interface SuccessPayload<T> {
  data: T;
  meta?: Record<string, unknown>;
}

export interface ErrorPayload {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export function formatSuccessPayload<T>(
  data: T,
  meta?: Record<string, unknown>
): SuccessPayload<T> {
  return {
    data,
    ...(meta ? { meta } : {}),
  };
}

export function formatErrorPayload(
  code: string,
  message: string,
  details?: unknown
): ErrorPayload {
  return {
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
}

export function buildSuccessResponse<T>(
  data: T,
  meta?: Record<string, unknown>,
  status = 200
): Response {
  return Response.json(formatSuccessPayload(data, meta), { status });
}

export function buildErrorResponse(
  code: string,
  message: string,
  status = 400,
  details?: unknown
): Response {
  return Response.json(formatErrorPayload(code, message, details), { status });
}
