'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard' },
  { href: '/notes', label: 'Notes' },
  { href: '/classes', label: 'Classes' },
  { href: '/search', label: 'Search' },
  { href: '/assistant', label: 'Assistant' },
  { href: '/export', label: 'Export' },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="flex w-52 shrink-0 flex-col gap-0.5 border-r border-neutral-200 p-4 dark:border-neutral-800">
      <p className="mb-4 px-2 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        Teacher Notes
      </p>
      {NAV_ITEMS.map((item) => {
        const active =
          item.href === '/' ? pathname === '/' : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded-md px-2 py-1.5 text-sm ${
              active
                ? 'bg-neutral-900 text-white dark:bg-neutral-100 dark:text-neutral-900'
                : 'text-neutral-700 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
