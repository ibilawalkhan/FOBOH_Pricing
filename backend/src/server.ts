import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';

import { store } from './data/seed.js';
import { productsRouter } from './routes/products.js';
import { customersRouter } from './routes/customers.js';
import { customerGroupsRouter } from './routes/customer-groups.js';
import { profilesRouter } from './routes/profiles.js';
import { resolveRouter } from './routes/resolve.js';
import { buildOpenApiDocument } from './openapi.js';

const PORT = Number(process.env.PORT ?? 3001);

export function createApp() {
  const app = express();

  app.use(cors({ origin: 'http://localhost:3000' }));
  app.use(express.json());

  app.use('/api/products', productsRouter(store));
  app.use('/api/customers', customersRouter(store));
  app.use('/api/customer-groups', customerGroupsRouter(store));
  app.use('/api/pricing-profiles', profilesRouter(store));
  app.use('/api/resolve', resolveRouter(store));

  const openApiDoc = buildOpenApiDocument();
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openApiDoc));
  app.get('/api-docs.json', (_req, res) => res.json(openApiDoc));

  app.get('/', (_req, res) => {
    res.json({ name: 'FOBOH Pricing API', docs: '/api-docs' });
  });
  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Catch malformed JSON bodies and return a clean 400 instead of Express's
  // default HTML stack trace (which leaks absolute file paths).
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (
      err &&
      typeof err === 'object' &&
      'type' in err &&
      (err as { type?: string }).type === 'entity.parse.failed'
    ) {
      res.status(400).json({ error: 'bad-json', message: 'request body is not valid JSON' });
      return;
    }
    next(err);
  });

  return app;
}

// Start the server unless we're inside a vitest run (tests should import
// createApp() if they need it).
if (!process.env.VITEST) {
  const app = createApp();
  app.listen(PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`backend listening on http://localhost:${PORT}`);
    // eslint-disable-next-line no-console
    console.log(`swagger UI at  http://localhost:${PORT}/api-docs`);
  });
}
