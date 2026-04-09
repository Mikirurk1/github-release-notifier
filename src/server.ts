import { execSync } from 'node:child_process';
import { app } from '@/app';
import { env, validateEnv } from '@/config/env';
import { logger } from '@/config/logger';
import { prisma } from '@/config/prisma';
import { scannerJob } from '@/jobs/scannerJob';
import { startGrpcServer } from '@/grpc/subscriptionGrpc';

const runMigrations = (): void => {
  execSync('npx prisma migrate deploy --config=./prisma.config.mjs', { stdio: 'inherit' });
};

const bootstrap = async (): Promise<void> => {
  validateEnv();
  runMigrations();
  await prisma.$connect();

  app.listen(env.port, () => {
    logger.info({ port: env.port }, 'Server started');
  });

  scannerJob.start(env.scannerIntervalMs);
  logger.info({ scannerIntervalMs: env.scannerIntervalMs }, 'Scanner job started');

  if (env.grpcPort > 0) {
    await startGrpcServer(env.grpcPort);
  } else {
    logger.info('gRPC disabled (GRPC_PORT=0)');
  }
};

bootstrap().catch((error) => {
  logger.error({ err: error }, 'Fatal startup error');
  process.exit(1);
});
