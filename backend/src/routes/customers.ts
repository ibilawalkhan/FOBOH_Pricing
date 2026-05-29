import { Router, type Request, type Response } from 'express';
import type { Store } from '../data/seed.js';

export function customersRouter(store: Store): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json(store.listCustomers());
  });

  return router;
}
