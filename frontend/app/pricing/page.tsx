'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  listProfiles,
  listCustomers,
  listCustomerGroups,
  formatScope,
  selectionCount,
  type PricingProfileDTO,
  type CustomerDTO,
  type CustomerGroupDTO,
} from '@/lib/api';

function formatUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString('en-AU', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function PricingListPage() {
  const [profiles, setProfiles] = useState<PricingProfileDTO[] | null>(null);
  const [customers, setCustomers] = useState<CustomerDTO[]>([]);
  const [groups, setGroups] = useState<CustomerGroupDTO[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [p, c, g] = await Promise.all([
          listProfiles(),
          listCustomers(),
          listCustomerGroups(),
        ]);
        if (cancelled) return;
        setProfiles(p);
        setCustomers(c);
        setGroups(g);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load profiles.');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Pricing Profile</h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage profile-based pricing for your customers and customer groups.
          </p>
        </div>
        <div className="flex gap-3">
          <Link href="/pricing/resolve" className="btn-secondary">
            Try the resolver
          </Link>
          <Link href="/pricing/new" className="btn-primary">
            + Create new Pricing Profile
          </Link>
        </div>
      </div>

      <section className="card overflow-hidden">
        {error && (
          <div className="px-4 py-3 text-sm text-red-700 bg-red-50 border-b border-red-100">
            {error}
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Selection</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {profiles === null && !error && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    Loading…
                  </td>
                </tr>
              )}
              {profiles !== null && profiles.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                    No pricing profiles yet.{' '}
                    <Link href="/pricing/new" className="text-teal hover:underline">
                      Create the first one
                    </Link>
                    .
                  </td>
                </tr>
              )}
              {profiles?.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.description || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {formatScope(p.scope, customers, groups)}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{selectionCount(p.selection)}</td>
                  <td className="px-4 py-3 text-gray-500">{formatUpdated(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
