import { Router, type Request, type Response } from 'express';
import type { Store } from '../data/seed.js';
import { resolvePrice, isResolveError } from '../domain/resolver.js';

export function resolveRouter(store: Store): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const customerId = typeof req.query.customerId === 'string' ? req.query.customerId : '';
    const productId = typeof req.query.productId === 'string' ? req.query.productId : '';
    if (!customerId || !productId) {
      res
        .status(400)
        .json({ error: 'validation-error', message: 'customerId and productId required' });
      return;
    }

    const result = resolvePrice(customerId, productId, store);
    if (isResolveError(result)) {
      res.status(404).json(result);
      return;
    }
    res.json(result);
  });

  return router;
}
