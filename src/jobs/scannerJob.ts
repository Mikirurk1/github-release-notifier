import { logger } from '@/config/logger';
import { runReleaseScan } from '@/services/releaseScanService';

export const scannerJob = {
  runOnce(): Promise<void> {
    return runReleaseScan();
  },

  start(intervalMs: number): NodeJS.Timeout {
    void runReleaseScan().catch((err) => {
      logger.error({ err }, 'Scanner initial run failed');
    });
    return setInterval(() => {
      void runReleaseScan().catch((err) => {
        logger.error({ err }, 'Scanner tick failed');
      });
    }, intervalMs);
  },
};
