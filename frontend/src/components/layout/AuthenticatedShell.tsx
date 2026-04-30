'use client';

import { Building2, LogOut, Users, UserSquare2 } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ReactNode, useEffect, useState } from 'react';
import { clearSession, getStoredUser, getToken } from '@/lib/auth';
import { User } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

const navItems = [
  { href: '/customers', label: 'Customers', icon: UserSquare2 },
  { href: '/users', label: 'Users', icon: Users },
];

export function AuthenticatedShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const token = getToken();
    const storedUser = getStoredUser();
    if (!token || !storedUser) {
      router.replace('/login');
      return;
    }

    setUser(storedUser);
    setReady(true);
  }, [router]);

  function logout() {
    clearSession();
    router.replace('/login');
  }

  if (!ready) {
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading CRM...</main>;
  }

  return (
    <div className="min-h-screen bg-surface">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-white lg:block">
        <div className="flex h-16 items-center gap-3 border-b border-border px-5">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-accent text-white">
            <Building2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold">Tenant CRM</p>
            <p className="text-xs text-muted">Operations workspace</p>
          </div>
        </div>

        <nav className="space-y-1 p-3">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex h-10 items-center gap-3 rounded-md px-3 text-sm font-medium text-muted transition hover:bg-surface hover:text-ink',
                  active && 'bg-surface text-ink',
                )}
              >
                <Icon size={17} />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-10 flex h-16 items-center justify-between border-b border-border bg-white px-4 lg:px-8">
          <div>
            <p className="text-sm font-semibold">{user?.name}</p>
            <div className="mt-1 flex items-center gap-2">
              <Badge>{user?.role}</Badge>
              <span className="text-xs text-muted">{user?.email}</span>
            </div>
          </div>
          <Button variant="secondary" onClick={logout}>
            <LogOut size={16} />
            Sign out
          </Button>
        </header>

        <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

