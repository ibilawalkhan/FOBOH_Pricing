import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { TopBar } from '@/components/TopBar';
import './globals.css';

export const metadata: Metadata = {
  title: 'FOBOH — Pricing',
  description: 'Customer-specific pricing for F&B wholesale.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col min-w-0">
            <TopBar />
            <main className="flex-1 p-6 lg:p-8 overflow-x-hidden">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
