import { z } from 'zod';

export const ProductSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  sku: z.string().min(1),
  brand: z.string().min(1),
  subCategory: z.string().min(1),
  segment: z.string().min(1),
  basePriceCents: z.number().int().nonnegative(),
  isDeleted: z.boolean().default(false),
});

export type Product = z.infer<typeof ProductSchema>;
