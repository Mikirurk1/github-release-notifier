import { status as GrpcStatus } from '@grpc/grpc-js';
import { AppError, ValidationError, NotFoundError, UnauthorizedError, ExternalServiceError } from '@/utils/errors';

export const appErrorToGrpc = (
  err: unknown,
): { code: GrpcStatus; message: string } => {
  if (err instanceof ValidationError) {
    return { code: GrpcStatus.INVALID_ARGUMENT, message: err.message };
  }
  if (err instanceof NotFoundError) {
    return { code: GrpcStatus.NOT_FOUND, message: err.message };
  }
  if (err instanceof UnauthorizedError) {
    return { code: GrpcStatus.UNAUTHENTICATED, message: err.message };
  }
  if (err instanceof ExternalServiceError) {
    return { code: GrpcStatus.UNAVAILABLE, message: err.message };
  }
  if (err instanceof AppError) {
    return { code: GrpcStatus.INTERNAL, message: err.message };
  }
  if (err instanceof Error) {
    return { code: GrpcStatus.INTERNAL, message: err.message };
  }
  return { code: GrpcStatus.INTERNAL, message: 'Internal error' };
};
