import { z } from 'zod';

export const CustomerSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  groupIds: z.array(z.string()).default([]),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const CustomerGroupSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export type CustomerGroup = z.infer<typeof CustomerGroupSchema>;
