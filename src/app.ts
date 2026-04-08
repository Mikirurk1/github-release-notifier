import express from 'express';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import subscriptionRoutes from '@/routes/subscriptionRoutes';
import { apiKeyMiddleware } from '@/middlewares/apiKeyMiddleware';
import { errorMiddleware } from '@/middlewares/errorMiddleware';
import { logger } from '@/config/logger';
import { metricsRegistry } from '@/config/metrics';

const openApiSpec = YAML.load(path.resolve(process.cwd(), 'openapi.yaml'));
const publicDir = path.resolve(process.cwd(), 'public');

export const app = express();

app.use(express.json());
app.use(pinoHttp({ logger }));
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/metrics', async (_req, res) => {
  res.setHeader('Content-Type', metricsRegistry.contentType);
  res.send(await metricsRegistry.metrics());
});

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));
app.use('/api', apiKeyMiddleware, subscriptionRoutes);
app.use(errorMiddleware);
