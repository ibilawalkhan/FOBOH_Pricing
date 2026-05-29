import { Router, type Request, type Response } from 'express';
import type { Store } from '../data/seed.js';

export function productsRouter(store: Store): Router {
  const router = Router();

  router.get('/', (req: Request, res: Response) => {
    const { q, subCategory, segment, brand } = req.query as Record<string, string | undefined>;
    let items = store.listProducts().filter((p) => !p.isDeleted);

    if (q) {
      const needle = q.toLowerCase();
      items = items.filter(
        (p) =>
          p.title.toLowerCase().includes(needle) || p.sku.toLowerCase().includes(needle),
      );
    }
    if (subCategory) items = items.filter((p) => p.subCategory === subCategory);
    if (segment) items = items.filter((p) => p.segment === segment);
    if (brand) items = items.filter((p) => p.brand === brand);

    res.json(items);
  });

  return router;
}
