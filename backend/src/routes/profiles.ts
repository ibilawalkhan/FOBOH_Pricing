import { Router, type Request, type Response } from 'express';
import type { Store } from '../data/seed.js';
import {
  CreatePricingProfileSchema,
  UpdatePricingProfileSchema,
  type PricingProfile,
} from '../schemas/index.js';

export function profilesRouter(store: Store): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    res.json(store.listProfiles());
  });

  router.get('/:id', (req: Request, res: Response) => {
    const profile = store.getProfileById(req.params.id!);
    if (!profile) {
      res.status(404).json({ error: 'profile-not-found' });
      return;
    }
    res.json(profile);
  });

  router.post('/', (req: Request, res: Response) => {
    const parsed = CreatePricingProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation-error', issues: parsed.error.issues });
      return;
    }
    const now = new Date().toISOString();
    const profile: PricingProfile = {
      id: `profile-${cryptoIdSuffix()}`,
      name: parsed.data.name,
      description: parsed.data.description ?? '',
      scope: parsed.data.scope,
      selection: parsed.data.selection,
      adjustment: parsed.data.adjustment,
      createdAt: now,
      updatedAt: now,
    };
    const created = store.addProfile(profile);
    res.status(201).json(created);
  });

  router.put('/:id', (req: Request, res: Response) => {
    const parsed = UpdatePricingProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'validation-error', issues: parsed.error.issues });
      return;
    }
    const updated = store.updateProfile(req.params.id!, parsed.data);
    if (!updated) {
      res.status(404).json({ error: 'profile-not-found' });
      return;
    }
    res.json(updated);
  });

  router.delete('/:id', (req: Request, res: Response) => {
    const ok = store.deleteProfile(req.params.id!);
    if (!ok) {
      res.status(404).json({ error: 'profile-not-found' });
      return;
    }
    res.status(204).send();
  });

  return router;
}

function cryptoIdSuffix(): string {
  // 10-char base36 — collision-resistant enough for an in-memory store, and avoids
  // pulling in a uuid dep we don't need.
  return Math.random().toString(36).slice(2, 12);
}
