import path from 'node:path';
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { env } from '@/config/env';
import { logger } from '@/config/logger';
import { subscriptionService } from '@/services/subscriptionService';
import { appErrorToGrpc } from '@/grpc/errorMapping';

const PROTO_PATH = path.join(process.cwd(), 'proto', 'subscription.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
});

const loaded = grpc.loadPackageDefinition(packageDefinition) as grpc.GrpcObject;

const subscriptionServiceDefinition = (() => {
  const notifier = loaded.notifier as grpc.GrpcObject | undefined;
  const ctor = notifier?.SubscriptionService as { service?: grpc.ServiceDefinition } | undefined;
  if (!ctor?.service) {
    throw new Error('gRPC proto: notifier.SubscriptionService missing (check proto/subscription.proto)');
  }
  return ctor.service;
})();

const apiKeyOk = (call: grpc.ServerUnaryCall<unknown, unknown>): boolean => {
  if (!env.apiKey) {
    return true;
  }
  const values = call.metadata.get('x-api-key');
  const key = values.length ? String(values[0]) : '';
  return key === env.apiKey;
};

const unauthorizedError = (): grpc.ServiceError => {
  const e = new Error('Unauthorized') as grpc.ServiceError;
  e.code = grpc.status.UNAUTHENTICATED;
  e.details = 'Invalid or missing x-api-key metadata';
  e.metadata = new grpc.Metadata();
  return e;
};

const createSubscription: grpc.handleUnaryCall<
  { email?: string; repo?: string },
  Record<string, unknown>
> = async (call, callback) => {
  try {
    if (!apiKeyOk(call)) {
      callback(unauthorizedError());
      return;
    }
    const email = typeof call.request?.email === 'string' ? call.request.email : '';
    const repo = typeof call.request?.repo === 'string' ? call.request.repo : '';
    const { subscription, alreadySubscribed } = await subscriptionService.createSubscription({
      email,
      repo,
    });
    callback(null, {
      id: subscription.id,
      email: subscription.email,
      repo: subscription.repo,
      last_seen_tag: subscription.lastSeenTag ?? '',
      created_at: subscription.createdAt.toISOString(),
      already_subscribed: alreadySubscribed,
    });
  } catch (err) {
    const { code, message } = appErrorToGrpc(err);
    logger.warn({ err, grpcCode: code }, 'gRPC CreateSubscription failed');
    const serviceErr = new Error(message) as grpc.ServiceError;
    serviceErr.code = code;
    serviceErr.details = message;
    serviceErr.metadata = new grpc.Metadata();
    callback(serviceErr);
  }
};

export const subscriptionGrpcImplementation = {
  createSubscription,
};

export const createGrpcServer = (): grpc.Server => {
  const server = new grpc.Server();
  server.addService(subscriptionServiceDefinition, subscriptionGrpcImplementation);
  return server;
};

export const startGrpcServer = (port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const server = createGrpcServer();
    server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
      if (error) {
        reject(error);
        return;
      }
      server.start();
      logger.info({ port: boundPort }, 'gRPC server started');
      resolve();
    });
  });
