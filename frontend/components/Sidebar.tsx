'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

type NavItem = {
  label: string;
  href: string;
  matchPrefix?: string;
  badge?: 'NEW';
};

const NAV: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard' },
  { label: 'Orders', href: '/orders' },
  { label: 'Customers', href: '/customers' },
  { label: 'Products', href: '/products' },
  { label: 'Pricing', href: '/pricing', matchPrefix: '/pricing' },
  { label: 'Freight', href: '/freight', badge: 'NEW' },
  { label: 'Integrations', href: '/integrations' },
  { label: 'Settings', href: '/settings' },
];

export function Sidebar() {
  const pathname = usePathname() ?? '/';
  return (
    <aside className="w-[220px] shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <nav className="flex-1 pt-8">
        <ul className="space-y-1">
          {NAV.map((item) => {
            const active = item.matchPrefix
              ? pathname.startsWith(item.matchPrefix)
              : pathname === item.href;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={[
                    'flex items-center justify-between pl-6 pr-4 py-2.5 text-sm transition-colors',
                    active
                      ? 'text-teal-700 font-semibold border-r-4 border-teal bg-teal/5'
                      : 'text-gray-600 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span>{item.label}</span>
                  {item.badge ? (
                    <span className="ml-2 inline-block rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="p-6">
        <div className="text-2xl font-extrabold tracking-tight text-teal-700">FOBOH</div>
      </div>
    </aside>
  );
}
