import { status as GrpcStatus } from '@grpc/grpc-js';
import { appErrorToGrpc } from '@/grpc/errorMapping';
import {
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ExternalServiceError,
  AppError,
} from '@/utils/errors';

describe('appErrorToGrpc', () => {
  it('maps ValidationError to INVALID_ARGUMENT', () => {
    expect(appErrorToGrpc(new ValidationError('bad'))).toEqual({
      code: GrpcStatus.INVALID_ARGUMENT,
      message: 'bad',
    });
  });

  it('maps NotFoundError to NOT_FOUND', () => {
    expect(appErrorToGrpc(new NotFoundError('missing'))).toEqual({
      code: GrpcStatus.NOT_FOUND,
      message: 'missing',
    });
  });

  it('maps UnauthorizedError to UNAUTHENTICATED', () => {
    expect(appErrorToGrpc(new UnauthorizedError())).toEqual({
      code: GrpcStatus.UNAUTHENTICATED,
      message: 'Unauthorized',
    });
  });

  it('maps ExternalServiceError to UNAVAILABLE', () => {
    expect(appErrorToGrpc(new ExternalServiceError('upstream'))).toEqual({
      code: GrpcStatus.UNAVAILABLE,
      message: 'upstream',
    });
  });

  it('maps generic AppError to INTERNAL', () => {
    expect(appErrorToGrpc(new AppError('x', 418, 'TEAPOT'))).toEqual({
      code: GrpcStatus.INTERNAL,
      message: 'x',
    });
  });

  it('maps unknown Error to INTERNAL', () => {
    expect(appErrorToGrpc(new Error('oops'))).toEqual({
      code: GrpcStatus.INTERNAL,
      message: 'oops',
    });
  });
});
