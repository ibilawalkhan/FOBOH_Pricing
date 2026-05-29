import type {
  Product,
  Customer,
  CustomerGroup,
  PricingProfile,
} from '../schemas/index.js';

// ---------- seed data ----------

const PRODUCTS: Product[] = [
  {
    id: 'HGVPIN216',
    title: 'High Garden Pinot Noir 2021',
    sku: 'HGVPIN216',
    brand: 'High Garden',
    subCategory: 'Wine',
    segment: 'Red',
    basePriceCents: 27906,
    isDeleted: false,
  },
  {
    id: 'KOYBRUNV6',
    title: 'Koyama Methode Brut Nature NV',
    sku: 'KOYBRUNV6',
    brand: 'Koyama Wines',
    subCategory: 'Wine',
    segment: 'Sparkling',
    basePriceCents: 12000,
    isDeleted: false,
  },
  {
    id: 'KOYNR1837',
    title: 'Koyama Riesling 2018',
    sku: 'KOYNR1837',
    brand: 'Koyama Wines',
    subCategory: 'Wine',
    segment: 'Port/Dessert',
    basePriceCents: 21504,
    isDeleted: false,
  },
  {
    id: 'KOYRIE19',
    title: 'Koyama Tussock Riesling 2019',
    sku: 'KOYRIE19',
    brand: 'Koyama Wines',
    subCategory: 'Wine',
    segment: 'White',
    basePriceCents: 21504,
    isDeleted: false,
  },
  {
    id: 'LACBNATNV6',
    title: 'Lacourte-Godbillon Brut Cru NV',
    sku: 'LACBNATNV6',
    brand: 'Lacourte-Godbillon',
    subCategory: 'Wine',
    segment: 'Sparkling',
    basePriceCents: 40932,
    isDeleted: false,
  },
];

const CUSTOMER_GROUPS: CustomerGroup[] = [
  { id: 'ir-group', name: 'Independent Retailers' },
  { id: 'vip-group', name: 'VIP' },
];

const CUSTOMERS: Customer[] = [
  { id: 'bondi-cellars', name: 'Bondi Cellars', groupIds: ['ir-group', 'vip-group'] },
  { id: 'green-grocer', name: 'Green Grocer Bottle Shop', groupIds: ['ir-group'] },
  { id: 'harbour-hotel', name: 'Harbour Hotel', groupIds: ['vip-group'] },
  { id: 'corner-store', name: 'Corner Store', groupIds: [] },
];

// Timestamps ordered so profile-c is most recent. ISO strings.
const T_A = '2026-05-01T09:00:00.000Z';
const T_B = '2026-05-10T09:00:00.000Z';
const T_C = '2026-05-20T09:00:00.000Z';

const PROFILES: PricingProfile[] = [
  {
    id: 'profile-a',
    name: '10% off all Wine — Independent Retailers',
    description: 'Group-level wine discount for Independent Retailers',
    scope: { type: 'group', groupId: 'ir-group' },
    selection: {
      type: 'products',
      productIds: ['HGVPIN216', 'KOYBRUNV6', 'KOYNR1837', 'KOYRIE19', 'LACBNATNV6'],
    },
    adjustment: { mode: 'dynamic', direction: 'decrease', percent: 10 },
    createdAt: T_A,
    updatedAt: T_A,
  },
  {
    id: 'profile-b',
    name: '$15 off all Sparkling Wine — VIP',
    description: 'Group-level sparkling-wine discount for VIP customers',
    scope: { type: 'group', groupId: 'vip-group' },
    selection: { type: 'products', productIds: ['KOYBRUNV6', 'LACBNATNV6'] },
    adjustment: { mode: 'fixed', direction: 'decrease', amountCents: 1500 },
    createdAt: T_B,
    updatedAt: T_B,
  },
  {
    id: 'profile-c',
    name: 'Custom $95 on Koyama Methode — Bondi Cellars',
    description: 'Direct customer-level custom price',
    scope: { type: 'customer', customerId: 'bondi-cellars' },
    selection: { type: 'products', productIds: ['KOYBRUNV6'] },
    adjustment: { mode: 'custom', fixedPricesCents: { KOYBRUNV6: 9500 } },
    createdAt: T_C,
    updatedAt: T_C,
  },
];

// ---------- in-memory store ----------

export interface Store {
  // products
  listProducts(): Product[];
  getProductById(id: string): Product | undefined;
  // customers
  listCustomers(): Customer[];
  getCustomerById(id: string): Customer | undefined;
  // groups
  listCustomerGroups(): CustomerGroup[];
  getCustomerGroupById(id: string): CustomerGroup | undefined;
  // profiles
  listProfiles(): PricingProfile[];
  getProfileById(id: string): PricingProfile | undefined;
  addProfile(profile: PricingProfile): PricingProfile;
  updateProfile(id: string, patch: Partial<Omit<PricingProfile, 'id' | 'createdAt'>>): PricingProfile | undefined;
  deleteProfile(id: string): boolean;
}

export function createStore(): Store {
  // Defensive clones so mutations in one store don't affect another (helpful for tests).
  const products: Product[] = PRODUCTS.map((p) => ({ ...p }));
  const customers: Customer[] = CUSTOMERS.map((c) => ({ ...c, groupIds: [...c.groupIds] }));
  const groups: CustomerGroup[] = CUSTOMER_GROUPS.map((g) => ({ ...g }));
  const profiles: PricingProfile[] = PROFILES.map((p) => structuredClone(p));

  return {
    listProducts: () => products.map((p) => ({ ...p })),
    getProductById: (id) => {
      const p = products.find((x) => x.id === id);
      return p ? { ...p } : undefined;
    },

    listCustomers: () => customers.map((c) => ({ ...c, groupIds: [...c.groupIds] })),
    getCustomerById: (id) => {
      const c = customers.find((x) => x.id === id);
      return c ? { ...c, groupIds: [...c.groupIds] } : undefined;
    },

    listCustomerGroups: () => groups.map((g) => ({ ...g })),
    getCustomerGroupById: (id) => {
      const g = groups.find((x) => x.id === id);
      return g ? { ...g } : undefined;
    },

    listProfiles: () => profiles.map((p) => structuredClone(p)),
    getProfileById: (id) => {
      const p = profiles.find((x) => x.id === id);
      return p ? structuredClone(p) : undefined;
    },
    addProfile: (profile) => {
      profiles.push(structuredClone(profile));
      return structuredClone(profile);
    },
    updateProfile: (id, patch) => {
      const idx = profiles.findIndex((x) => x.id === id);
      if (idx === -1) return undefined;
      const existing = profiles[idx]!;
      const merged: PricingProfile = {
        ...existing,
        ...patch,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: new Date().toISOString(),
      };
      profiles[idx] = merged;
      return structuredClone(merged);
    },
    deleteProfile: (id) => {
      const idx = profiles.findIndex((x) => x.id === id);
      if (idx === -1) return false;
      profiles.splice(idx, 1);
      return true;
    },
  };
}

// Singleton used by the running server. Tests can build fresh stores via createStore().
export const store: Store = createStore();
