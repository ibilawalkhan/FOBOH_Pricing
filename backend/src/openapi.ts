import {
  OpenAPIRegistry,
  OpenApiGeneratorV3,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';
import {
  ProductSchema,
  CustomerSchema,
  CustomerGroupSchema,
  PricingProfileSchema,
  CreatePricingProfileSchema,
  UpdatePricingProfileSchema,
  ResolveResponseSchema,
} from './schemas/index.js';

extendZodWithOpenApi(z);

export function buildOpenApiDocument() {
  const registry = new OpenAPIRegistry();

  const Product = registry.register('Product', ProductSchema);
  const Customer = registry.register('Customer', CustomerSchema);
  const CustomerGroup = registry.register('CustomerGroup', CustomerGroupSchema);
  const PricingProfile = registry.register('PricingProfile', PricingProfileSchema);
  const CreatePricingProfile = registry.register(
    'CreatePricingProfileInput',
    CreatePricingProfileSchema,
  );
  const UpdatePricingProfile = registry.register(
    'UpdatePricingProfileInput',
    UpdatePricingProfileSchema,
  );
  const ResolveResponse = registry.register('ResolveResponse', ResolveResponseSchema);

  registry.registerPath({
    method: 'get',
    path: '/api/products',
    summary: 'List products with optional search/filter',
    request: {
      query: z.object({
        q: z.string().optional(),
        subCategory: z.string().optional(),
        segment: z.string().optional(),
        brand: z.string().optional(),
      }),
    },
    responses: {
      200: {
        description: 'List of products',
        content: { 'application/json': { schema: z.array(Product) } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/customers',
    summary: 'List customers',
    responses: {
      200: {
        description: 'List of customers',
        content: { 'application/json': { schema: z.array(Customer) } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/customer-groups',
    summary: 'List customer groups',
    responses: {
      200: {
        description: 'List of customer groups',
        content: { 'application/json': { schema: z.array(CustomerGroup) } },
      },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/pricing-profiles',
    summary: 'List pricing profiles',
    responses: {
      200: {
        description: 'List of profiles',
        content: { 'application/json': { schema: z.array(PricingProfile) } },
      },
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/api/pricing-profiles',
    summary: 'Create a pricing profile',
    request: {
      body: { content: { 'application/json': { schema: CreatePricingProfile } } },
    },
    responses: {
      201: { description: 'Created', content: { 'application/json': { schema: PricingProfile } } },
      400: { description: 'Validation error' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/pricing-profiles/{id}',
    summary: 'Get a pricing profile',
    request: { params: z.object({ id: z.string() }) },
    responses: {
      200: { description: 'Profile', content: { 'application/json': { schema: PricingProfile } } },
      404: { description: 'Not found' },
    },
  });

  registry.registerPath({
    method: 'put',
    path: '/api/pricing-profiles/{id}',
    summary: 'Update a pricing profile',
    request: {
      params: z.object({ id: z.string() }),
      body: { content: { 'application/json': { schema: UpdatePricingProfile } } },
    },
    responses: {
      200: { description: 'Updated', content: { 'application/json': { schema: PricingProfile } } },
      400: { description: 'Validation error' },
      404: { description: 'Not found' },
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/api/pricing-profiles/{id}',
    summary: 'Delete a pricing profile',
    request: { params: z.object({ id: z.string() }) },
    responses: {
      204: { description: 'Deleted' },
      404: { description: 'Not found' },
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/api/resolve',
    summary: 'Resolve the effective price for a (customer, product) pair',
    request: {
      query: z.object({ customerId: z.string(), productId: z.string() }),
    },
    responses: {
      200: {
        description: 'Resolved price',
        content: { 'application/json': { schema: ResolveResponse } },
      },
      400: { description: 'Missing/invalid query params' },
      404: { description: 'Product or customer not found' },
    },
  });

  const generator = new OpenApiGeneratorV3(registry.definitions);
  return generator.generateDocument({
    openapi: '3.0.0',
    info: {
      title: 'FOBOH Pricing API',
      version: '0.1.0',
      description: 'Customer-specific pricing resolver — most-specific-wins.',
    },
    servers: [{ url: 'http://localhost:3001' }],
  });
}
